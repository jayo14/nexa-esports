-- ============================================================
-- Fix 1: Make wallet_id nullable on transactions so that the
--        pre-logged pending rows (no wallet yet resolved) work.
-- ============================================================
ALTER TABLE public.transactions
  ALTER COLUMN wallet_id DROP NOT NULL;

-- Add user_id column if it doesn't exist already (paga-initiate-payment uses it)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'NGN';

CREATE INDEX IF NOT EXISTS idx_transactions_user_id   ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference  ON public.transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status     ON public.transactions(status);

-- ============================================================
-- Fix 2: Rewrite credit_wallet so it:
--   a) uses pg_advisory_xact_lock to prevent double-crediting
--   b) sets wallet_id on the pre-logged pending transaction
--   c) sets user_id on the transaction row
--   d) is fully idempotent
-- ============================================================
CREATE OR REPLACE FUNCTION public.credit_wallet(
    p_user_id  UUID,
    p_amount   DECIMAL,
    p_reference TEXT,
    p_currency  TEXT DEFAULT 'NGN'
)
RETURNS DECIMAL AS $$
DECLARE
    v_wallet_id       UUID;
    v_new_balance     DECIMAL;
    v_fee             DECIMAL;
    v_net_amount      DECIMAL;
    v_transaction_id  UUID;
    v_existing_status TEXT;
    v_lock_key        BIGINT;
BEGIN
    -- Derive a deterministic advisory lock key from the reference string
    v_lock_key := ('x' || substr(encode(digest(p_reference, 'sha256'), 'hex'), 1, 15))::bit(60)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- ── Idempotency: bail early if already credited ─────────────────────
    SELECT id, status
      INTO v_transaction_id, v_existing_status
      FROM transactions
     WHERE reference = p_reference
     LIMIT 1;

    IF v_existing_status = 'success' THEN
        SELECT balance INTO v_new_balance
          FROM wallets WHERE user_id = p_user_id LIMIT 1;
        RETURN COALESCE(v_new_balance, 0);
    END IF;

    -- ── Fee calculation (4 %) ───────────────────────────────────────────
    v_fee        := ROUND(p_amount * 0.04, 2);
    v_net_amount := ROUND(p_amount - v_fee,  2);

    -- ── Get or create wallet ────────────────────────────────────────────
    SELECT id INTO v_wallet_id FROM wallets WHERE user_id = p_user_id LIMIT 1;

    IF v_wallet_id IS NULL THEN
        INSERT INTO wallets (user_id, balance)
             VALUES (p_user_id, 0)
          RETURNING id INTO v_wallet_id;
    END IF;

    -- ── Credit balance ──────────────────────────────────────────────────
    UPDATE wallets
       SET balance    = balance + v_net_amount,
           updated_at = NOW()
     WHERE id = v_wallet_id
    RETURNING balance INTO v_new_balance;

    -- ── Upsert transaction record ───────────────────────────────────────
    IF v_transaction_id IS NOT NULL THEN
        -- Update the pre-logged pending row: set wallet_id and mark success
        UPDATE transactions
           SET status     = 'success',
               amount     = v_net_amount,
               currency   = p_currency,
               wallet_id  = v_wallet_id,   -- key fix: wire up the FK
               user_id    = p_user_id,
               updated_at = NOW()
         WHERE id = v_transaction_id;
    ELSE
        -- No pre-logged row? Create one from scratch.
        INSERT INTO transactions
               (wallet_id, user_id, amount, type, status, reference, currency)
        VALUES (v_wallet_id, p_user_id, v_net_amount,
                'deposit'::transaction_type, 'success', p_reference, p_currency)
        RETURNING id INTO v_transaction_id;
    END IF;

    -- ── Log platform fee ────────────────────────────────────────────────
    INSERT INTO earnings (transaction_id, amount, source)
         VALUES (v_transaction_id, v_fee, 'deposit_fee')
    ON CONFLICT DO NOTHING;

    RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Fix 3: Rewrite update_wallet_and_create_transaction (used by
--        paga-webhook) to also set wallet_id + user_id.
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_wallet_and_create_transaction(
    p_wallet_id              UUID,
    p_new_balance            DECIMAL(10,2),   -- kept for backward-compat; ignored internally
    p_transaction_amount     DECIMAL(10,2),
    p_transaction_type       TEXT,
    p_transaction_status     TEXT,
    p_transaction_reference  TEXT,
    p_transaction_currency   TEXT DEFAULT 'NGN'
)
RETURNS UUID AS $$
DECLARE
    v_transaction_id  UUID;
    v_existing_status TEXT;
    v_user_id         UUID;
    v_lock_key        BIGINT;
BEGIN
    v_lock_key := ('x' || substr(encode(digest(p_transaction_reference, 'sha256'), 'hex'), 1, 15))::bit(60)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Resolve user_id from wallet
    SELECT user_id INTO v_user_id FROM wallets WHERE id = p_wallet_id LIMIT 1;

    -- Check existing
    SELECT id, status
      INTO v_transaction_id, v_existing_status
      FROM transactions
     WHERE reference = p_transaction_reference
     LIMIT 1;

    IF v_transaction_id IS NOT NULL THEN
        IF v_existing_status != 'success' AND p_transaction_status = 'success' THEN
            UPDATE transactions
               SET status     = p_transaction_status,
                   amount     = p_transaction_amount,
                   currency   = p_transaction_currency,
                   wallet_id  = p_wallet_id,
                   user_id    = v_user_id,
                   updated_at = NOW()
             WHERE id = v_transaction_id;

            UPDATE wallets
               SET balance    = balance + p_transaction_amount,
                   updated_at = NOW()
             WHERE id = p_wallet_id;
        ELSIF v_existing_status != 'success' THEN
            UPDATE transactions
               SET status     = p_transaction_status,
                   wallet_id  = p_wallet_id,
                   user_id    = v_user_id,
                   updated_at = NOW()
             WHERE id = v_transaction_id;
        END IF;
    ELSE
        INSERT INTO transactions
               (wallet_id, user_id, amount, type, status, reference, currency)
        VALUES (p_wallet_id, v_user_id, p_transaction_amount,
                p_transaction_type::transaction_type, p_transaction_status,
                p_transaction_reference, p_transaction_currency)
        RETURNING id INTO v_transaction_id;

        IF p_transaction_status = 'success' THEN
            UPDATE wallets
               SET balance    = balance + p_transaction_amount,
                   updated_at = NOW()
             WHERE id = p_wallet_id;
        END IF;
    END IF;

    RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Fix 4: debit_wallet — a new atomic function for withdrawals.
--        Called server-side to deduct + record in one shot.
-- ============================================================
CREATE OR REPLACE FUNCTION public.debit_wallet(
    p_user_id    UUID,
    p_amount     DECIMAL,
    p_reference  TEXT,
    p_currency   TEXT DEFAULT 'NGN',
    p_metadata   JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
    v_wallet_id    UUID;
    v_balance      DECIMAL;
    v_new_balance  DECIMAL;
    v_fee          DECIMAL;
    v_net_amount   DECIMAL;
    v_lock_key     BIGINT;
BEGIN
    v_lock_key := ('x' || substr(encode(digest(p_reference, 'sha256'), 'hex'), 1, 15))::bit(60)::bigint;
    PERFORM pg_advisory_xact_lock(v_lock_key);

    -- Get wallet
    SELECT id, balance INTO v_wallet_id, v_balance
      FROM wallets WHERE user_id = p_user_id LIMIT 1;

    IF v_wallet_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'wallet_not_found');
    END IF;

    IF v_balance < p_amount THEN
        RETURN jsonb_build_object('success', false, 'error', 'insufficient_balance',
                                  'balance', v_balance);
    END IF;

    v_fee        := ROUND(p_amount * 0.04, 2);
    v_net_amount := ROUND(p_amount - v_fee, 2);
    v_new_balance := ROUND(v_balance - p_amount, 2);

    -- Deduct balance
    UPDATE wallets
       SET balance    = v_new_balance,
           updated_at = NOW()
     WHERE id = v_wallet_id;

    -- Record as pending withdrawal
    INSERT INTO transactions
           (wallet_id, user_id, amount, type, status, reference, currency, metadata)
    VALUES (v_wallet_id, p_user_id, p_amount,
            'withdrawal'::transaction_type, 'pending', p_reference, p_currency, p_metadata)
    ON CONFLICT (reference) DO NOTHING;

    RETURN jsonb_build_object(
        'success',      true,
        'wallet_id',    v_wallet_id,
        'new_balance',  v_new_balance,
        'fee',          v_fee,
        'net_amount',   v_net_amount
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Fix 5: rollback_wallet_debit — revert a pending debit atomically.
-- ============================================================
CREATE OR REPLACE FUNCTION public.rollback_wallet_debit(
    p_reference TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    v_wallet_id UUID;
    v_amount    DECIMAL;
    v_status    TEXT;
BEGIN
    SELECT wallet_id, amount, status
      INTO v_wallet_id, v_amount, v_status
      FROM transactions WHERE reference = p_reference LIMIT 1;

    IF v_wallet_id IS NULL OR v_status != 'pending' THEN
        RETURN FALSE;
    END IF;

    UPDATE transactions SET status = 'failed', updated_at = NOW()
     WHERE reference = p_reference AND status = 'pending';

    UPDATE wallets
       SET balance    = balance + v_amount,
           updated_at  = NOW()
     WHERE id = v_wallet_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Fix 6: finalize_wallet_debit — mark a pending debit as success.
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_wallet_debit(
    p_reference TEXT,
    p_metadata  JSONB DEFAULT '{}'::jsonb
)
RETURNS BOOLEAN AS $$
DECLARE
    v_status TEXT;
BEGIN
    SELECT status INTO v_status FROM transactions WHERE reference = p_reference LIMIT 1;

    IF v_status IS NULL OR v_status = 'success' THEN
        RETURN (v_status = 'success');
    END IF;

    UPDATE transactions
       SET status     = 'success',
           metadata   = COALESCE(metadata, '{}') || p_metadata,
           updated_at = NOW()
     WHERE reference = p_reference AND status = 'pending';

    -- Log withdrawal fee as earnings
    INSERT INTO earnings (transaction_id, amount, source)
    SELECT id, ROUND(amount * 0.04, 2), 'withdrawal_fee'
      FROM transactions WHERE reference = p_reference
    ON CONFLICT DO NOTHING;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

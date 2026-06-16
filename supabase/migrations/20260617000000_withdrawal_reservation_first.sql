-- Phase 4: Reservation-First Withdrawal
--
-- Old behaviour: wallet_create_withdrawal_intent immediately debits wallets.balance
--   and writes a wallet_ledger debit entry. If Paga never receives the transfer,
--   the user's balance is gone with no recovery path except reconciliation.
--
-- New behaviour:
--   INTENT  → creates reservation (open), transaction state = 'pending'. NO balance change.
--   SUCCESS → settlement worker calls wallet_debit() → reduces balance, consumes reservation.
--   FAILURE → settlement worker releases reservation. Balance was never touched; nothing to refund.
--
-- Available balance shown to user = wallets.balance - SUM(open reservations).
-- Use get_wallet_available_balance() (from 20260615010000) for UI queries.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Rewrite wallet_create_withdrawal_intent (reservation-only, no debit)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wallet_create_withdrawal_intent(
  p_user_id         UUID,
  p_amount          NUMERIC,
  p_currency        TEXT    DEFAULT 'NGN',
  p_wallet_type     TEXT    DEFAULT 'clan',
  p_idempotency_key TEXT    DEFAULT NULL,
  p_client_reference TEXT   DEFAULT NULL,
  p_metadata        JSONB   DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_wallet_id      UUID;
  v_balance        NUMERIC;
  v_reserved       NUMERIC;
  v_available      NUMERIC;
  v_transaction_id UUID;
  v_reference      TEXT;
  v_request_hash   TEXT;
  v_existing_tx    UUID;
  v_fee            NUMERIC;
  v_net            NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  -- Request hash for idempotency
  BEGIN
    v_request_hash := encode(
      digest(
        convert_to(
          p_user_id::text || '|' || p_amount::text || '|' ||
          COALESCE(p_wallet_type, 'clan') || '|' || COALESCE(p_client_reference, ''),
          'UTF8'
        ), 'sha256'
      ), 'hex'
    );
  EXCEPTION WHEN OTHERS THEN
    v_request_hash := md5(
      p_user_id::text || '|' || p_amount::text || '|' ||
      COALESCE(p_wallet_type, 'clan') || '|' || COALESCE(p_client_reference, '')
    );
  END;

  -- Idempotency check
  IF p_idempotency_key IS NOT NULL AND LENGTH(TRIM(p_idempotency_key)) > 0 THEN
    v_existing_tx := public.wallet_require_idempotency(
      p_idempotency_key, 'withdrawal_intent', p_user_id, v_request_hash, 120
    );
    IF v_existing_tx IS NOT NULL THEN
      RETURN (
        SELECT jsonb_build_object(
          'idempotent',   true,
          'success',      true,
          'transaction_id', t.id,
          'reference',    t.reference,
          'wallet_id',    t.wallet_id,
          'state',        t.wallet_state::TEXT,
          'amount',       t.amount,
          'net_amount',   COALESCE((t.metadata->>'netAmount')::NUMERIC, t.amount),
          'new_balance',  w.balance
        )
        FROM public.transactions t
        JOIN public.wallets w ON w.id = t.wallet_id
        WHERE t.id = v_existing_tx
      );
    END IF;
  END IF;

  v_wallet_id := public.wallet_upsert_wallet(p_user_id, p_wallet_type);

  -- Lock wallet and read balance
  SELECT balance INTO v_balance
  FROM public.wallets
  WHERE id = v_wallet_id
  FOR UPDATE;

  -- Compute available = balance minus all open reservations
  SELECT COALESCE(SUM(amount), 0) INTO v_reserved
  FROM public.wallet_reservations
  WHERE wallet_id = v_wallet_id AND state = 'open';

  v_available := COALESCE(v_balance, 0) - v_reserved;

  IF v_available < p_amount THEN
    RETURN jsonb_build_object(
      'success',   false,
      'error',     'insufficient_balance',
      'balance',   COALESCE(v_balance, 0),
      'available', v_available
    );
  END IF;

  v_fee       := ROUND(p_amount * 0.04, 2);
  v_net       := ROUND(p_amount - v_fee, 2);
  v_reference := public.wallet_generate_reference('NX_WD');

  -- Create transaction in 'pending' state (NOT debited yet)
  INSERT INTO public.transactions(
    wallet_id, user_id, type, wallet_state, status,
    amount, currency, reference, paga_reference, paga_status,
    idempotency_key, client_reference, metadata, provider, expires_at
  ) VALUES (
    v_wallet_id, p_user_id,
    'withdrawal'::transaction_type,
    'pending'::public.wallet_tx_state,
    'pending',
    p_amount, p_currency,
    v_reference, v_reference, 'pending',
    p_idempotency_key, p_client_reference,
    COALESCE(p_metadata, '{}'::jsonb) ||
      jsonb_build_object('walletType', p_wallet_type, 'fee', v_fee, 'netAmount', v_net),
    'paga',
    NOW() + INTERVAL '24 hours'
  ) RETURNING id INTO v_transaction_id;

  -- Record intent for audit trail
  INSERT INTO public.wallet_transaction_intents(
    transaction_id, request_payload, request_hash, auth_subject
  ) VALUES (
    v_transaction_id,
    jsonb_build_object(
      'amount', p_amount, 'currency', p_currency,
      'wallet_type', p_wallet_type, 'client_reference', p_client_reference
    ),
    v_request_hash, p_user_id
  );

  -- Create RESERVATION only — this is the only balance-affecting action at intent time
  INSERT INTO public.wallet_reservations(transaction_id, wallet_id, amount, state)
  VALUES (v_transaction_id, v_wallet_id, p_amount, 'open');

  -- NO wallet_debit() here. NO wallets.balance update. NO wallet_ledger entry.
  -- The debit fires in wallet_settle_transaction() when Paga confirms success.

  IF p_idempotency_key IS NOT NULL AND LENGTH(TRIM(p_idempotency_key)) > 0 THEN
    UPDATE public.wallet_idempotency_keys
    SET transaction_id = v_transaction_id
    WHERE key = p_idempotency_key;
  END IF;

  RETURN jsonb_build_object(
    'success',        true,
    'idempotent',     false,
    'transaction_id', v_transaction_id,
    'reference',      v_reference,
    'wallet_id',      v_wallet_id,
    'state',          'pending',
    'amount',         p_amount,
    'fee',            v_fee,
    'net_amount',     v_net,
    -- Balance has NOT changed; available has reduced due to the new reservation
    'new_balance',    v_balance,
    'available',      v_available - p_amount
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'detail', SQLSTATE);
END;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Rewrite wallet_settle_transaction — withdrawal success/failure branches
--
--    SUCCESS: wallet_debit() fires here (first and only time), consumes reservation.
--    FAILURE: release reservation only — no credit needed (balance was never touched).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.wallet_settle_transaction(
  p_transaction_id UUID,
  p_decision       public.wallet_tx_state,
  p_source         TEXT,
  p_evidence       JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx  public.transactions%ROWTYPE;
  v_res public.wallet_reservations%ROWTYPE;
  v_fee      NUMERIC;
  v_net      NUMERIC;
  v_intended NUMERIC;
BEGIN
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'transaction_not_found');
  END IF;

  -- Idempotency guard: already in a terminal state
  IF v_tx.wallet_state IN (
    'success'::public.wallet_tx_state,
    'failed'::public.wallet_tx_state,
    'reversed'::public.wallet_tx_state,
    'expired'::public.wallet_tx_state
  ) THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'state', v_tx.wallet_state::TEXT);
  END IF;

  -- Move to processing (intermediate state, no money movement)
  IF p_decision = 'processing' THEN
    UPDATE public.transactions
    SET wallet_state    = 'processing'::public.wallet_tx_state,
        settlement_source = p_source,
        metadata        = COALESCE(metadata, '{}'::jsonb) ||
                          jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
    WHERE id = p_transaction_id;
    RETURN jsonb_build_object('success', true, 'state', 'processing');
  END IF;

  -- ── DEPOSITS ──────────────────────────────────────────────────────────────
  IF v_tx.type = 'deposit'::transaction_type THEN
    IF p_decision = 'success' THEN
      IF v_tx.metadata ? 'intended_amount' THEN
        v_intended := (v_tx.metadata->>'intended_amount')::NUMERIC;
        v_fee      := (v_tx.metadata->>'fee')::NUMERIC;
        v_net      := v_intended;
      ELSE
        v_fee := ROUND(v_tx.amount * 0.04, 2);
        v_net := ROUND(v_tx.amount - v_fee, 2);
      END IF;

      PERFORM public.wallet_credit(
        p_transaction_id, v_tx.wallet_id, v_net,
        v_tx.paga_reference, 'completed', 'success'
      );

      UPDATE public.transactions
      SET wallet_state      = 'success'::public.wallet_tx_state,
          settled_at        = NOW(),
          settlement_source = p_source,
          amount            = v_net,
          metadata          = COALESCE(metadata, '{}'::jsonb) ||
                              jsonb_build_object(
                                'grossAmount', v_tx.amount, 'fee', v_fee,
                                'lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb)
                              )
      WHERE id = p_transaction_id;

      RETURN jsonb_build_object('success', true, 'state', 'success', 'credited', v_net);
    END IF;

    IF p_decision IN ('failed', 'expired', 'reversed') THEN
      UPDATE public.transactions
      SET wallet_state      = p_decision::public.wallet_tx_state,
          settled_at        = NOW(),
          settlement_source = p_source,
          metadata          = COALESCE(metadata, '{}'::jsonb) ||
                              jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
      WHERE id = p_transaction_id;
      RETURN jsonb_build_object('success', true, 'state', p_decision::TEXT);
    END IF;
  END IF;

  -- ── WITHDRAWALS (reservation-first) ───────────────────────────────────────
  IF v_tx.type = 'withdrawal'::transaction_type THEN
    SELECT * INTO v_res
    FROM public.wallet_reservations
    WHERE transaction_id = p_transaction_id
    FOR UPDATE;

    IF p_decision = 'success' THEN
      -- First and only debit: Paga has confirmed money sent
      IF v_res.state = 'open' THEN
        PERFORM public.wallet_debit(p_transaction_id, v_tx.wallet_id, v_res.amount);

        UPDATE public.wallet_reservations
        SET state = 'consumed', consumed_at = NOW(), updated_at = NOW()
        WHERE transaction_id = p_transaction_id;
      END IF;

      UPDATE public.transactions
      SET wallet_state      = 'success'::public.wallet_tx_state,
          status            = 'completed',
          settled_at        = NOW(),
          settlement_source = p_source,
          metadata          = COALESCE(metadata, '{}'::jsonb) ||
                              jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
      WHERE id = p_transaction_id;

      RETURN jsonb_build_object('success', true, 'state', 'success');
    END IF;

    IF p_decision IN ('failed', 'expired', 'reversed') THEN
      -- Balance was never debited — just release the reservation
      IF v_res.state = 'open' THEN
        UPDATE public.wallet_reservations
        SET state = 'released', released_at = NOW(), updated_at = NOW()
        WHERE transaction_id = p_transaction_id;
      END IF;

      UPDATE public.transactions
      SET wallet_state      = p_decision::public.wallet_tx_state,
          settled_at        = NOW(),
          settlement_source = p_source,
          metadata          = COALESCE(metadata, '{}'::jsonb) ||
                              jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
      WHERE id = p_transaction_id;

      RETURN jsonb_build_object('success', true, 'state', p_decision::TEXT);
    END IF;
  END IF;

  -- ── DIRECT DEBITS (airtime, data, transfer_out, marketplace, etc.) ─────────
  IF v_tx.type IN (
    'airtime_purchase'::transaction_type,
    'data_purchase'::transaction_type,
    'transfer_out'::transaction_type,
    'marketplace_purchase'::transaction_type,
    'giveaway_created'::transaction_type,
    'tax_deduction'::transaction_type
  ) THEN
    IF p_decision = 'success' THEN
      UPDATE public.transactions
      SET wallet_state      = 'success'::public.wallet_tx_state,
          status            = 'completed',
          settled_at        = NOW(),
          settlement_source = p_source,
          metadata          = COALESCE(metadata, '{}'::jsonb) ||
                              jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
      WHERE id = p_transaction_id;
      RETURN jsonb_build_object('success', true, 'state', 'success');
    END IF;

    IF p_decision IN ('failed', 'expired', 'reversed') THEN
      PERFORM public.wallet_credit(
        p_transaction_id, v_tx.wallet_id, v_tx.amount,
        v_tx.reference || '_refund', 'refunded', 'refund'
      );
      UPDATE public.transactions
      SET wallet_state      = p_decision::public.wallet_tx_state,
          settled_at        = NOW(),
          settlement_source = p_source,
          metadata          = COALESCE(metadata, '{}'::jsonb) ||
                              jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
      WHERE id = p_transaction_id;
      RETURN jsonb_build_object('success', true, 'state', p_decision::TEXT, 'refunded', v_tx.amount);
    END IF;
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'unsupported_transaction_type');
END;
$$;

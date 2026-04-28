-- Core wallet redesign: idempotency, event inbox, ledger, reservations,
-- transition guards, and single settlement pipeline.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------- Enums ----------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_tx_state') THEN
    CREATE TYPE public.wallet_tx_state AS ENUM (
      'pending',
      'processing',
      'success',
      'failed',
      'reversed',
      'expired'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_provider_op_type') THEN
    CREATE TYPE public.wallet_provider_op_type AS ENUM (
      'initiate',
      'transfer_request',
      'status_check',
      'webhook_event'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_ledger_entry_type') THEN
    CREATE TYPE public.wallet_ledger_entry_type AS ENUM (
      'reserve_debit',
      'reserve_release',
      'debit_final',
      'credit_final',
      'fee_debit',
      'fee_credit',
      'reversal'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_ledger_direction') THEN
    CREATE TYPE public.wallet_ledger_direction AS ENUM ('debit', 'credit');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_reservation_state') THEN
    CREATE TYPE public.wallet_reservation_state AS ENUM ('open', 'released', 'consumed');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'wallet_settlement_job_state') THEN
    CREATE TYPE public.wallet_settlement_job_state AS ENUM ('queued', 'processing', 'completed', 'failed');
  END IF;
END $$;

-- ---------- Compatibility columns on existing transactions ----------
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS wallet_state public.wallet_tx_state,
  ADD COLUMN IF NOT EXISTS client_reference TEXT,
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'paga',
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS settlement_source TEXT;

UPDATE public.transactions
SET wallet_state = CASE
  WHEN status IN ('pending', 'processing', 'success', 'failed', 'reversed', 'expired') THEN status::public.wallet_tx_state
  WHEN status IN ('completed') THEN 'success'::public.wallet_tx_state
  ELSE 'pending'::public.wallet_tx_state
END
WHERE wallet_state IS NULL;

ALTER TABLE public.transactions
  ALTER COLUMN wallet_state SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_client_reference_unique
  ON public.transactions(client_reference)
  WHERE client_reference IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_state
  ON public.transactions(wallet_state, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_provider_reference
  ON public.transactions(provider, paga_reference);

-- ---------- New tables ----------
CREATE TABLE IF NOT EXISTS public.wallet_idempotency_keys (
  key TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_hash TEXT NOT NULL,
  transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wallet_idempotency_user_scope
  ON public.wallet_idempotency_keys(user_id, scope, created_at DESC);

CREATE TABLE IF NOT EXISTS public.wallet_transaction_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL UNIQUE REFERENCES public.transactions(id) ON DELETE CASCADE,
  request_payload JSONB NOT NULL,
  request_hash TEXT NOT NULL,
  auth_subject UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_ip INET NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.wallet_provider_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  operation_type public.wallet_provider_op_type NOT NULL,
  operation_key TEXT NOT NULL,
  provider_request JSONB NULL,
  provider_response JSONB NULL,
  provider_status_code TEXT NULL,
  signature_valid BOOLEAN NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ NULL,
  UNIQUE(transaction_id, operation_type, operation_key)
);

CREATE INDEX IF NOT EXISTS idx_wallet_provider_ops_tx_received
  ON public.wallet_provider_operations(transaction_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.wallet_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  provider_event_id TEXT NULL,
  provider_reference TEXT NULL,
  signature_valid BOOLEAN NOT NULL,
  payload JSONB NOT NULL,
  payload_hash TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  handled BOOLEAN NOT NULL DEFAULT FALSE,
  handled_at TIMESTAMPTZ NULL,
  UNIQUE(provider, payload_hash)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_webhook_provider_event_unique
  ON public.wallet_webhook_events(provider, provider_event_id)
  WHERE provider_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wallet_webhook_ref
  ON public.wallet_webhook_events(provider_reference);

CREATE INDEX IF NOT EXISTS idx_wallet_webhook_unhandled
  ON public.wallet_webhook_events(handled, received_at);

CREATE TABLE IF NOT EXISTS public.wallet_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  entry_type public.wallet_ledger_entry_type NOT NULL,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  direction public.wallet_ledger_direction NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  balance_effective BOOLEAN NOT NULL DEFAULT TRUE,
  unique_key TEXT NOT NULL UNIQUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL DEFAULT 'wallet_system'
);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_wallet_created
  ON public.wallet_ledger_entries(wallet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallet_ledger_tx
  ON public.wallet_ledger_entries(transaction_id);

CREATE TABLE IF NOT EXISTS public.wallet_reservations (
  transaction_id UUID PRIMARY KEY REFERENCES public.transactions(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL CHECK (amount > 0),
  state public.wallet_reservation_state NOT NULL DEFAULT 'open',
  released_at TIMESTAMPTZ NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_reservations_wallet_state
  ON public.wallet_reservations(wallet_id, state);

CREATE TABLE IF NOT EXISTS public.wallet_settlement_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  provider_reference TEXT NULL,
  decision_hint public.wallet_tx_state NULL,
  evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
  source TEXT NOT NULL,
  state public.wallet_settlement_job_state NOT NULL DEFAULT 'queued',
  attempts INTEGER NOT NULL DEFAULT 0,
  available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallet_settlement_jobs_queue
  ON public.wallet_settlement_jobs(state, available_at, created_at);

-- ---------- State transition guard ----------
CREATE OR REPLACE FUNCTION public.wallet_is_valid_transition(
  p_old public.wallet_tx_state,
  p_new public.wallet_tx_state
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  IF p_old = p_new THEN
    RETURN TRUE;
  END IF;

  IF p_old = 'pending' AND p_new IN ('processing', 'failed', 'expired') THEN
    RETURN TRUE;
  END IF;

  IF p_old = 'processing' AND p_new IN ('success', 'failed', 'reversed', 'expired') THEN
    RETURN TRUE;
  END IF;

  IF p_old = 'failed' AND p_new = 'processing' THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_wallet_transaction_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.type IN ('deposit'::transaction_type, 'withdrawal'::transaction_type) THEN
    IF NOT public.wallet_is_valid_transition(OLD.wallet_state, NEW.wallet_state) THEN
      RAISE EXCEPTION 'Invalid wallet transaction state transition: % -> %', OLD.wallet_state, NEW.wallet_state;
    END IF;
  END IF;

  NEW.updated_at := NOW();
  NEW.status := NEW.wallet_state::TEXT;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prevent_wallet_ledger_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'wallet_ledger_entries is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_wallet_tx_transition ON public.transactions;
CREATE TRIGGER trg_enforce_wallet_tx_transition
BEFORE UPDATE ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.enforce_wallet_transaction_transition();

DROP TRIGGER IF EXISTS trg_prevent_wallet_ledger_update ON public.wallet_ledger_entries;
CREATE TRIGGER trg_prevent_wallet_ledger_update
BEFORE UPDATE OR DELETE ON public.wallet_ledger_entries
FOR EACH ROW
EXECUTE FUNCTION public.prevent_wallet_ledger_mutation();

-- ---------- Helpers ----------
CREATE OR REPLACE FUNCTION public.wallet_hash_jsonb(p_value JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(extensions.digest(convert_to(COALESCE(p_value::text, ''), 'UTF8'), 'sha256'), 'hex')
$$;

CREATE OR REPLACE FUNCTION public.wallet_generate_reference(p_prefix TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN p_prefix || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || UPPER(SUBSTRING(encode(gen_random_bytes(4), 'hex') FROM 1 FOR 8));
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_require_idempotency(
  p_key TEXT,
  p_scope TEXT,
  p_user_id UUID,
  p_request_hash TEXT,
  p_ttl_minutes INTEGER DEFAULT 60
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_existing public.wallet_idempotency_keys%ROWTYPE;
BEGIN
  SELECT * INTO v_existing
  FROM public.wallet_idempotency_keys
  WHERE key = p_key;

  IF FOUND THEN
    IF v_existing.user_id != p_user_id OR v_existing.scope != p_scope THEN
      RAISE EXCEPTION 'idempotency_key_scope_mismatch';
    END IF;

    IF v_existing.request_hash != p_request_hash THEN
      RAISE EXCEPTION 'idempotency_key_payload_mismatch';
    END IF;

    RETURN v_existing.transaction_id;
  END IF;

  INSERT INTO public.wallet_idempotency_keys(
    key, scope, user_id, request_hash, expires_at
  ) VALUES (
    p_key, p_scope, p_user_id, p_request_hash, NOW() + make_interval(mins => p_ttl_minutes)
  );

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_upsert_wallet(
  p_user_id UUID,
  p_wallet_type TEXT
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_wallet_id UUID;
BEGIN
  SELECT id INTO v_wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id
    AND wallet_type = p_wallet_type
  LIMIT 1;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.wallets(user_id, wallet_type, balance)
    VALUES (p_user_id, p_wallet_type, 0)
    RETURNING id INTO v_wallet_id;
  END IF;

  RETURN v_wallet_id;
END;
$$;

-- ---------- Command functions ----------
CREATE OR REPLACE FUNCTION public.wallet_create_deposit_intent(
  p_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'NGN',
  p_wallet_type TEXT DEFAULT 'clan',
  p_idempotency_key TEXT DEFAULT NULL,
  p_client_reference TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_transaction_id UUID;
  v_reference TEXT;
  v_request_hash TEXT;
  v_existing_tx UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  v_request_hash := encode(extensions.digest(convert_to((p_user_id::text || '|' || p_amount::text || '|' || COALESCE(p_wallet_type, 'clan') || '|' || COALESCE(p_client_reference, '')), 'UTF8'), 'sha256'), 'hex');

  IF p_idempotency_key IS NOT NULL AND LENGTH(TRIM(p_idempotency_key)) > 0 THEN
    v_existing_tx := public.wallet_require_idempotency(
      p_idempotency_key,
      'deposit_intent',
      p_user_id,
      v_request_hash,
      120
    );

    IF v_existing_tx IS NOT NULL THEN
      RETURN (
        SELECT jsonb_build_object(
          'idempotent', true,
          'transaction_id', t.id,
          'reference', t.reference,
          'wallet_id', t.wallet_id,
          'state', t.wallet_state::TEXT,
          'amount', t.amount
        )
        FROM public.transactions t
        WHERE t.id = v_existing_tx
      );
    END IF;
  END IF;

  v_wallet_id := public.wallet_upsert_wallet(p_user_id, p_wallet_type);
  v_reference := public.wallet_generate_reference('NX');

  INSERT INTO public.transactions(
    wallet_id,
    user_id,
    type,
    wallet_state,
    status,
    amount,
    currency,
    reference,
    paga_reference,
    paga_status,
    idempotency_key,
    client_reference,
    metadata,
    provider,
    expires_at
  ) VALUES (
    v_wallet_id,
    p_user_id,
    'deposit'::transaction_type,
    'pending'::public.wallet_tx_state,
    'pending',
    p_amount,
    p_currency,
    v_reference,
    v_reference,
    'pending',
    p_idempotency_key,
    p_client_reference,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('walletType', p_wallet_type),
    'paga',
    NOW() + INTERVAL '24 hours'
  ) RETURNING id INTO v_transaction_id;

  INSERT INTO public.wallet_transaction_intents(
    transaction_id,
    request_payload,
    request_hash,
    auth_subject
  ) VALUES (
    v_transaction_id,
    jsonb_build_object(
      'amount', p_amount,
      'currency', p_currency,
      'wallet_type', p_wallet_type,
      'client_reference', p_client_reference
    ),
    v_request_hash,
    p_user_id
  );

  IF p_idempotency_key IS NOT NULL AND LENGTH(TRIM(p_idempotency_key)) > 0 THEN
    UPDATE public.wallet_idempotency_keys
    SET transaction_id = v_transaction_id
    WHERE key = p_idempotency_key;
  END IF;

  RETURN jsonb_build_object(
    'idempotent', false,
    'transaction_id', v_transaction_id,
    'reference', v_reference,
    'wallet_id', v_wallet_id,
    'state', 'pending',
    'amount', p_amount
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_create_withdrawal_intent(
  p_user_id UUID,
  p_amount NUMERIC,
  p_currency TEXT DEFAULT 'NGN',
  p_wallet_type TEXT DEFAULT 'clan',
  p_idempotency_key TEXT DEFAULT NULL,
  p_client_reference TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance NUMERIC;
  v_transaction_id UUID;
  v_reference TEXT;
  v_request_hash TEXT;
  v_existing_tx UUID;
  v_fee NUMERIC;
  v_net NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  v_request_hash := encode(extensions.digest(convert_to((p_user_id::text || '|' || p_amount::text || '|' || COALESCE(p_wallet_type, 'clan') || '|' || COALESCE(p_client_reference, '')), 'UTF8'), 'sha256'), 'hex');

  IF p_idempotency_key IS NOT NULL AND LENGTH(TRIM(p_idempotency_key)) > 0 THEN
    v_existing_tx := public.wallet_require_idempotency(
      p_idempotency_key,
      'withdrawal_intent',
      p_user_id,
      v_request_hash,
      120
    );

    IF v_existing_tx IS NOT NULL THEN
      RETURN (
        SELECT jsonb_build_object(
          'idempotent', true,
          'transaction_id', t.id,
          'reference', t.reference,
          'wallet_id', t.wallet_id,
          'state', t.wallet_state::TEXT,
          'amount', t.amount,
          'new_balance', w.balance
        )
        FROM public.transactions t
        JOIN public.wallets w ON w.id = t.wallet_id
        WHERE t.id = v_existing_tx
      );
    END IF;
  END IF;

  v_wallet_id := public.wallet_upsert_wallet(p_user_id, p_wallet_type);

  SELECT balance INTO v_balance
  FROM public.wallets
  WHERE id = v_wallet_id
  FOR UPDATE;

  IF v_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_balance',
      'balance', v_balance
    );
  END IF;

  v_fee := ROUND(p_amount * 0.04, 2);
  v_net := ROUND(p_amount - v_fee, 2);
  v_reference := public.wallet_generate_reference('NX_WD');

  INSERT INTO public.transactions(
    wallet_id,
    user_id,
    type,
    wallet_state,
    status,
    amount,
    currency,
    reference,
    paga_reference,
    paga_status,
    idempotency_key,
    client_reference,
    metadata,
    provider,
    expires_at
  ) VALUES (
    v_wallet_id,
    p_user_id,
    'withdrawal'::transaction_type,
    'pending'::public.wallet_tx_state,
    'pending',
    p_amount,
    p_currency,
    v_reference,
    v_reference,
    'pending',
    p_idempotency_key,
    p_client_reference,
    COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('walletType', p_wallet_type, 'fee', v_fee, 'netAmount', v_net),
    'paga',
    NOW() + INTERVAL '24 hours'
  ) RETURNING id INTO v_transaction_id;

  INSERT INTO public.wallet_transaction_intents(
    transaction_id,
    request_payload,
    request_hash,
    auth_subject
  ) VALUES (
    v_transaction_id,
    jsonb_build_object(
      'amount', p_amount,
      'currency', p_currency,
      'wallet_type', p_wallet_type,
      'client_reference', p_client_reference
    ),
    v_request_hash,
    p_user_id
  );

  INSERT INTO public.wallet_reservations(transaction_id, wallet_id, amount, state)
  VALUES (v_transaction_id, v_wallet_id, p_amount, 'open');

  PERFORM public.wallet_debit(v_transaction_id, v_wallet_id, p_amount);

  IF p_idempotency_key IS NOT NULL AND LENGTH(TRIM(p_idempotency_key)) > 0 THEN
    UPDATE public.wallet_idempotency_keys
    SET transaction_id = v_transaction_id
    WHERE key = p_idempotency_key;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'idempotent', false,
    'transaction_id', v_transaction_id,
    'reference', v_reference,
    'wallet_id', v_wallet_id,
    'state', 'pending',
    'amount', p_amount,
    'fee', v_fee,
    'net_amount', v_net,
    'new_balance', ROUND(v_balance - p_amount, 2)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_record_provider_operation(
  p_transaction_id UUID,
  p_operation_type public.wallet_provider_op_type,
  p_operation_key TEXT,
  p_provider_request JSONB DEFAULT NULL,
  p_provider_response JSONB DEFAULT NULL,
  p_provider_status_code TEXT DEFAULT NULL,
  p_signature_valid BOOLEAN DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.wallet_provider_operations(
    transaction_id,
    operation_type,
    operation_key,
    provider_request,
    provider_response,
    provider_status_code,
    signature_valid
  ) VALUES (
    p_transaction_id,
    p_operation_type,
    p_operation_key,
    p_provider_request,
    p_provider_response,
    p_provider_status_code,
    p_signature_valid
  )
  ON CONFLICT (transaction_id, operation_type, operation_key)
  DO UPDATE SET
    provider_request = EXCLUDED.provider_request,
    provider_response = EXCLUDED.provider_response,
    provider_status_code = EXCLUDED.provider_status_code,
    signature_valid = EXCLUDED.signature_valid,
    processed_at = NULL
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_store_webhook_event(
  p_provider TEXT,
  p_provider_event_id TEXT,
  p_provider_reference TEXT,
  p_signature_valid BOOLEAN,
  p_payload JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
  v_hash TEXT;
BEGIN
  v_hash := public.wallet_hash_jsonb(p_payload);

  INSERT INTO public.wallet_webhook_events(
    provider,
    provider_event_id,
    provider_reference,
    signature_valid,
    payload,
    payload_hash
  ) VALUES (
    p_provider,
    p_provider_event_id,
    p_provider_reference,
    p_signature_valid,
    p_payload,
    v_hash
  )
  ON CONFLICT (provider, payload_hash)
  DO UPDATE SET
    provider_reference = COALESCE(public.wallet_webhook_events.provider_reference, EXCLUDED.provider_reference)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_enqueue_settlement(
  p_transaction_id UUID,
  p_provider_reference TEXT,
  p_decision_hint public.wallet_tx_state,
  p_evidence JSONB,
  p_source TEXT,
  p_delay_seconds INTEGER DEFAULT 0
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.wallet_settlement_jobs(
    transaction_id,
    provider_reference,
    decision_hint,
    evidence,
    source,
    state,
    available_at
  ) VALUES (
    p_transaction_id,
    p_provider_reference,
    p_decision_hint,
    COALESCE(p_evidence, '{}'::jsonb),
    p_source,
    'queued',
    NOW() + make_interval(secs => GREATEST(p_delay_seconds, 0))
  ) RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

-- ---------- Settlement (single monetary finalizer) ----------
CREATE OR REPLACE FUNCTION public.wallet_settle_transaction(
  p_transaction_id UUID,
  p_decision public.wallet_tx_state,
  p_source TEXT,
  p_evidence JSONB DEFAULT '{}'::jsonb
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tx public.transactions%ROWTYPE;
  v_res public.wallet_reservations%ROWTYPE;
  v_fee NUMERIC;
  v_net NUMERIC;
BEGIN
  SELECT * INTO v_tx
  FROM public.transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'transaction_not_found');
  END IF;

  IF v_tx.wallet_state IN ('success'::public.wallet_tx_state, 'failed'::public.wallet_tx_state, 'reversed'::public.wallet_tx_state, 'expired'::public.wallet_tx_state) THEN
    RETURN jsonb_build_object('success', true, 'idempotent', true, 'state', v_tx.wallet_state::TEXT);
  END IF;

  IF p_decision = 'processing' THEN
    UPDATE public.transactions
    SET wallet_state = 'processing'::public.wallet_tx_state,
        settlement_source = p_source,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
    WHERE id = p_transaction_id;

    RETURN jsonb_build_object('success', true, 'state', 'processing');
  END IF;

  IF v_tx.type = 'deposit'::transaction_type THEN
    IF p_decision = 'success' THEN
      v_fee := ROUND(v_tx.amount * 0.04, 2);
      v_net := ROUND(v_tx.amount - v_fee, 2);

      PERFORM public.wallet_credit(
        p_transaction_id,
        v_tx.wallet_id,
        v_net,
        v_tx.paga_reference,
        'completed',
        'success'
      );

      UPDATE public.transactions
      SET wallet_state = 'success'::public.wallet_tx_state,
          settled_at = NOW(),
          settlement_source = p_source,
          amount = v_net,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('grossAmount', v_tx.amount, 'fee', v_fee, 'lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
      WHERE id = p_transaction_id;

      RETURN jsonb_build_object('success', true, 'state', 'success', 'credited', v_net);
    END IF;

    IF p_decision IN ('failed', 'expired', 'reversed') THEN
      UPDATE public.transactions
      SET wallet_state = p_decision::public.wallet_tx_state,
          settled_at = NOW(),
          settlement_source = p_source,
          metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
      WHERE id = p_transaction_id;

      RETURN jsonb_build_object('success', true, 'state', p_decision::TEXT);
    END IF;

    RETURN jsonb_build_object('success', false, 'error', 'invalid_decision_for_deposit');
  END IF;

  -- withdrawal
  SELECT * INTO v_res
  FROM public.wallet_reservations
  WHERE transaction_id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'reservation_not_found');
  END IF;

  IF p_decision = 'success' THEN
    IF v_res.state = 'open' THEN
      UPDATE public.wallet_reservations
      SET state = 'consumed',
          consumed_at = NOW(),
          updated_at = NOW()
      WHERE transaction_id = p_transaction_id;
    END IF;

    UPDATE public.transactions
    SET wallet_state = 'success'::public.wallet_tx_state,
        settled_at = NOW(),
        settlement_source = p_source,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
    WHERE id = p_transaction_id;

    RETURN jsonb_build_object('success', true, 'state', 'success');
  END IF;

  IF p_decision IN ('failed', 'reversed', 'expired') THEN
    IF v_res.state = 'open' THEN
      PERFORM public.wallet_credit(
        p_transaction_id,
        v_tx.wallet_id,
        v_res.amount,
        v_tx.paga_reference,
        'reversed',
        'reversed'
      );

      UPDATE public.wallet_reservations
      SET state = 'released',
          released_at = NOW(),
          updated_at = NOW()
      WHERE transaction_id = p_transaction_id;
    END IF;

    UPDATE public.transactions
    SET wallet_state = p_decision::public.wallet_tx_state,
        settled_at = NOW(),
        settlement_source = p_source,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object('lastSettlementEvidence', COALESCE(p_evidence, '{}'::jsonb))
    WHERE id = p_transaction_id;

    RETURN jsonb_build_object('success', true, 'state', p_decision::TEXT);
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'invalid_decision_for_withdrawal');
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_process_settlement_jobs(
  p_limit INTEGER DEFAULT 25
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_job public.wallet_settlement_jobs%ROWTYPE;
  v_processed INTEGER := 0;
  v_failed INTEGER := 0;
  v_tx_id UUID;
  v_res JSONB;
BEGIN
  FOR v_job IN
    SELECT *
    FROM public.wallet_settlement_jobs
    WHERE state = 'queued'
      AND available_at <= NOW()
    ORDER BY created_at
    LIMIT GREATEST(p_limit, 1)
    FOR UPDATE SKIP LOCKED
  LOOP
    BEGIN
      UPDATE public.wallet_settlement_jobs
      SET state = 'processing', attempts = attempts + 1, updated_at = NOW()
      WHERE id = v_job.id;

      v_tx_id := v_job.transaction_id;
      IF v_tx_id IS NULL AND v_job.provider_reference IS NOT NULL THEN
        SELECT id INTO v_tx_id
        FROM public.transactions
        WHERE reference = v_job.provider_reference OR paga_reference = v_job.provider_reference
        ORDER BY created_at DESC
        LIMIT 1;
      END IF;

      IF v_tx_id IS NULL THEN
        UPDATE public.wallet_settlement_jobs
        SET state = 'failed',
            last_error = 'transaction_not_resolved',
            updated_at = NOW()
        WHERE id = v_job.id;
        v_failed := v_failed + 1;
        CONTINUE;
      END IF;

      v_res := public.wallet_settle_transaction(
        v_tx_id,
        COALESCE(v_job.decision_hint, 'processing'::public.wallet_tx_state),
        v_job.source,
        v_job.evidence
      );

      UPDATE public.wallet_settlement_jobs
      SET state = 'completed',
          last_error = NULL,
          updated_at = NOW()
      WHERE id = v_job.id;

        IF v_job.provider_reference IS NOT NULL THEN
        UPDATE public.wallet_webhook_events
        SET handled = TRUE,
          handled_at = NOW()
        WHERE provider = 'paga'
          AND provider_reference = v_job.provider_reference
          AND handled = FALSE;
        END IF;

      v_processed := v_processed + 1;
    EXCEPTION WHEN OTHERS THEN
      UPDATE public.wallet_settlement_jobs
      SET state = CASE WHEN attempts >= 5 THEN 'failed' ELSE 'queued' END,
          available_at = NOW() + INTERVAL '30 seconds',
          last_error = SQLERRM,
          updated_at = NOW()
      WHERE id = v_job.id;
      v_failed := v_failed + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'processed', v_processed,
    'failed', v_failed
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.wallet_enqueue_expired_transactions(
  p_limit INTEGER DEFAULT 100
) RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  v_tx RECORD;
BEGIN
  FOR v_tx IN
    SELECT id, reference
    FROM public.transactions
    WHERE wallet_state IN ('pending'::public.wallet_tx_state, 'processing'::public.wallet_tx_state)
      AND expires_at IS NOT NULL
      AND expires_at <= NOW()
    ORDER BY expires_at
    LIMIT GREATEST(p_limit, 1)
  LOOP
    PERFORM public.wallet_enqueue_settlement(
      v_tx.id,
      v_tx.reference,
      'expired'::public.wallet_tx_state,
      jsonb_build_object('source', 'expiry_sweeper'),
      'expiry_sweeper',
      0
    );
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- ---------- RLS on new financial tables ----------
ALTER TABLE public.wallet_idempotency_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transaction_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_provider_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_settlement_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own ledger entries" ON public.wallet_ledger_entries;
CREATE POLICY "Users can view own ledger entries"
ON public.wallet_ledger_entries
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.wallets w
    WHERE w.id = wallet_ledger_entries.wallet_id
      AND w.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view own reservations" ON public.wallet_reservations;
CREATE POLICY "Users can view own reservations"
ON public.wallet_reservations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = wallet_reservations.transaction_id
      AND t.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can view own intents" ON public.wallet_transaction_intents;
CREATE POLICY "Users can view own intents"
ON public.wallet_transaction_intents
FOR SELECT
USING (auth_subject = auth.uid());

DROP POLICY IF EXISTS "Users can view own provider ops" ON public.wallet_provider_operations;
CREATE POLICY "Users can view own provider ops"
ON public.wallet_provider_operations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE t.id = wallet_provider_operations.transaction_id
      AND t.user_id = auth.uid()
  )
);

-- Admin/staff visibility for ops and jobs
DROP POLICY IF EXISTS "Staff can view webhook events" ON public.wallet_webhook_events;
CREATE POLICY "Staff can view webhook events"
ON public.wallet_webhook_events
FOR SELECT
USING (get_user_role(auth.uid()) IN ('admin', 'clan_master'));

DROP POLICY IF EXISTS "Staff can view settlement jobs" ON public.wallet_settlement_jobs;
CREATE POLICY "Staff can view settlement jobs"
ON public.wallet_settlement_jobs
FOR SELECT
USING (get_user_role(auth.uid()) IN ('admin', 'clan_master'));

DROP POLICY IF EXISTS "Staff can view idempotency keys" ON public.wallet_idempotency_keys;
CREATE POLICY "Staff can view idempotency keys"
ON public.wallet_idempotency_keys
FOR SELECT
USING (get_user_role(auth.uid()) IN ('admin', 'clan_master'));

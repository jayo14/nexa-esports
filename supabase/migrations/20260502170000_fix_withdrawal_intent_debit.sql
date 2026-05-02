-- Ensure withdrawal intent immediately debits the wallet and returns a live balance snapshot.
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
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance NUMERIC;
  v_new_balance NUMERIC;
  v_transaction_id UUID;
  v_reference TEXT;
  v_request_hash TEXT;
  v_existing_tx UUID;
  v_fee NUMERIC;
  v_net NUMERIC;
BEGIN
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  v_request_hash := encode(
    digest(
      convert_to(
        p_user_id::text || '|' || p_amount::text || '|' || COALESCE(p_wallet_type, 'clan') || '|' || COALESCE(p_client_reference, ''),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

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
          'success', true,
          'transaction_id', t.id,
          'reference', t.reference,
          'wallet_id', t.wallet_id,
          'state', t.wallet_state::TEXT,
          'amount', t.amount,
          'net_amount', COALESCE((t.metadata->>'netAmount')::NUMERIC, t.amount),
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

  IF v_balance IS NULL OR v_balance < p_amount THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_balance',
      'balance', COALESCE(v_balance, 0)
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

  v_new_balance := ROUND(v_balance - p_amount, 2);

  UPDATE public.wallets
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE id = v_wallet_id;

  INSERT INTO public.wallet_ledger(
    wallet_id,
    transaction_id,
    entry_type,
    amount,
    balance_before,
    balance_after
  ) VALUES (
    v_wallet_id,
    v_transaction_id,
    'debit',
    p_amount,
    v_balance,
    v_new_balance
  );

  UPDATE public.transactions
  SET wallet_state = 'debited'::public.wallet_tx_state,
      status = 'processing',
      updated_at = NOW()
  WHERE id = v_transaction_id;

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
    'state', 'processing',
    'amount', p_amount,
    'fee', v_fee,
    'net_amount', v_net,
    'new_balance', v_new_balance
  );
END;
$$;


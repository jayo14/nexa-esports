-- Phase 3: Transfer Fix
-- Fixes execute_user_transfer:
--   1. Sorted wallet lock ordering to prevent deadlocks
--   2. Percentage-based fee (3.5% capped at ₦5,000) — matches UI
--   3. Idempotency key support
--   4. Both sender AND receiver transactions reach terminal 'completed' state

CREATE OR REPLACE FUNCTION public.execute_user_transfer(
  sender_id         UUID,
  recipient_ign     TEXT,
  amount            NUMERIC,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient_id    UUID;
  v_sender_wallet_id   UUID;
  v_receiver_wallet_id UUID;
  v_sender_tx_id    UUID;
  v_receiver_tx_id  UUID;
  v_ref             TEXT := 'transfer_' || gen_random_uuid()::TEXT;
  v_fee             NUMERIC;
  v_total_debit     NUMERIC;
  v_sender_balance  NUMERIC;
  v_sender_user_id  UUID;
  v_sender_ign      TEXT;
  v_existing_ref    TEXT;
BEGIN
  -- Idempotency: return existing transfer if already executed
  IF p_idempotency_key IS NOT NULL THEN
    SELECT reference INTO v_existing_ref
    FROM public.transactions
    WHERE idempotency_key = p_idempotency_key
      AND type = 'transfer_out'::transaction_type
      AND user_id = sender_id
    LIMIT 1;

    IF FOUND THEN
      RETURN json_build_object('success', true, 'idempotent', true, 'reference', v_existing_ref);
    END IF;
  END IF;

  -- Resolve recipient
  SELECT id INTO v_recipient_id
  FROM public.profiles
  WHERE LOWER(TRIM(ign)) = LOWER(TRIM(recipient_ign)) AND NOT is_banned
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Recipient not found: %', recipient_ign;
  END IF;

  IF v_recipient_id = sender_id THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  SELECT ign INTO v_sender_ign
  FROM public.profiles WHERE id = sender_id;

  -- Ensure recipient has a wallet
  INSERT INTO public.wallets (user_id, wallet_type, balance, currency)
  VALUES (v_recipient_id, 'clan', 0, 'NGN')
  ON CONFLICT (user_id, wallet_type) DO NOTHING;

  -- Lock both wallets in consistent UUID order to prevent deadlocks
  SELECT id INTO v_sender_wallet_id
  FROM public.wallets
  WHERE user_id = sender_id AND wallet_type = 'clan';

  SELECT id INTO v_receiver_wallet_id
  FROM public.wallets
  WHERE user_id = v_recipient_id AND wallet_type = 'clan';

  IF v_sender_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Sender wallet not found';
  END IF;
  IF v_receiver_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Recipient wallet not found';
  END IF;

  -- Acquire locks in ascending UUID order (prevents A→B / B→A deadlock)
  IF v_sender_wallet_id < v_receiver_wallet_id THEN
    PERFORM id FROM public.wallets WHERE id = v_sender_wallet_id   FOR UPDATE;
    PERFORM id FROM public.wallets WHERE id = v_receiver_wallet_id FOR UPDATE;
  ELSE
    PERFORM id FROM public.wallets WHERE id = v_receiver_wallet_id FOR UPDATE;
    PERFORM id FROM public.wallets WHERE id = v_sender_wallet_id   FOR UPDATE;
  END IF;

  -- Fee: 3.5% capped at ₦5,000 — consistent with UI calculateFee()
  v_fee         := LEAST(ROUND(amount * 0.035, 2), 5000.00);
  v_total_debit := amount + v_fee;

  SELECT balance, user_id INTO v_sender_balance, v_sender_user_id
  FROM public.wallets WHERE id = v_sender_wallet_id;

  IF v_sender_balance < v_total_debit THEN
    RAISE EXCEPTION 'Insufficient balance. Need ₦%, have ₦%', v_total_debit, v_sender_balance;
  END IF;

  -- Create sender (transfer_out) transaction
  INSERT INTO public.transactions(
    wallet_id, user_id, wallet_type, type, amount, fee,
    status, wallet_state, reference, description, metadata, idempotency_key, created_at
  ) VALUES (
    v_sender_wallet_id, v_sender_user_id, 'clan', 'transfer_out'::transaction_type,
    amount, v_fee, 'processing', 'pending'::public.wallet_tx_state,
    v_ref || '_out', 'Transfer to ' || recipient_ign,
    jsonb_build_object(
      'transfer_reference', v_ref,
      'direction', 'out',
      'sender_ign', v_sender_ign,
      'recipient_ign', recipient_ign,
      'fee', v_fee,
      'net_amount', amount
    ),
    p_idempotency_key,
    NOW()
  ) RETURNING id INTO v_sender_tx_id;

  -- Create receiver (transfer_in) transaction
  INSERT INTO public.transactions(
    wallet_id, user_id, wallet_type, type, amount, fee,
    status, wallet_state, reference, description, metadata, created_at
  ) VALUES (
    v_receiver_wallet_id, v_recipient_id, 'clan', 'transfer_in'::transaction_type,
    amount, 0, 'processing', 'pending'::public.wallet_tx_state,
    v_ref || '_in', 'Transfer from ' || COALESCE(v_sender_ign, 'Unknown'),
    jsonb_build_object(
      'transfer_reference', v_ref,
      'direction', 'in',
      'sender_ign', v_sender_ign,
      'recipient_ign', recipient_ign,
      'fee', 0,
      'net_amount', amount
    ),
    NOW()
  ) RETURNING id INTO v_receiver_tx_id;

  -- Execute debit (sender pays amount + fee) and credit (receiver gets amount)
  PERFORM public.wallet_debit(v_sender_tx_id, v_sender_wallet_id, v_total_debit);
  PERFORM public.wallet_credit(v_receiver_tx_id, v_receiver_wallet_id, amount);

  -- Mark BOTH transactions as completed (fix: receiver was left in 'processing')
  UPDATE public.transactions
  SET wallet_state = 'success'::public.wallet_tx_state,
      status       = 'completed',
      settled_at   = NOW(),
      updated_at   = NOW()
  WHERE id IN (v_sender_tx_id, v_receiver_tx_id);

  RETURN json_build_object(
    'success',               true,
    'reference',             v_ref,
    'fee',                   v_fee,
    'sender_transaction_id', v_sender_tx_id,
    'receiver_transaction_id', v_receiver_tx_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.execute_user_transfer(uuid, text, numeric, text) TO authenticated;

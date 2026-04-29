-- ================================================
-- MIGRATION: Fix wallet transaction state types and transfer logic
-- Resolves error: column "wallet_state" is of type wallet_tx_state but expression is of type text
-- ================================================

-- 1. Ensure all required enum values exist in public.wallet_tx_state
DO $$
BEGIN
    -- Check if 'debited' exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'wallet_tx_state' AND e.enumlabel = 'debited'
    ) THEN
        ALTER TYPE public.wallet_tx_state ADD VALUE 'debited';
    END IF;

    -- Check if 'credited' exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_enum e 
        JOIN pg_type t ON e.enumtypid = t.oid 
        WHERE t.typname = 'wallet_tx_state' AND e.enumlabel = 'credited'
    ) THEN
        ALTER TYPE public.wallet_tx_state ADD VALUE 'credited';
    END IF;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- 2. Fix wallet_credit to handle type casting strictly
CREATE OR REPLACE FUNCTION public.wallet_credit(
  p_transaction_id UUID,
  p_wallet_id UUID,
  p_amount NUMERIC,
  p_paga_reference TEXT DEFAULT NULL,
  p_final_status TEXT DEFAULT 'completed',
  p_wallet_state TEXT DEFAULT 'credited'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_state public.wallet_tx_state;
BEGIN
  -- Idempotency: skip if already credited
  SELECT wallet_state INTO v_state FROM public.transactions
  WHERE id = p_transaction_id FOR UPDATE;

  -- Strict comparison using enum values
  IF v_state = p_wallet_state::public.wallet_tx_state OR v_state = 'success'::public.wallet_tx_state THEN
    RETURN;
  END IF;

  -- Lock wallet row
  SELECT balance INTO v_current_balance FROM public.wallets
  WHERE id = p_wallet_id FOR UPDATE;

  v_new_balance := v_current_balance + p_amount;

  -- Update wallet balance
  UPDATE public.wallets
    SET balance = v_new_balance, updated_at = NOW()
  WHERE id = p_wallet_id;

  -- Write ledger entry
  INSERT INTO public.wallet_ledger(wallet_id, transaction_id, entry_type, amount, balance_before, balance_after)
  VALUES (p_wallet_id, p_transaction_id, 'credit', p_amount, v_current_balance, v_new_balance);

  -- Mark transaction as credited with explicit cast
  UPDATE public.transactions
    SET wallet_state = p_wallet_state::public.wallet_tx_state,
        status = p_final_status,
        paga_reference = COALESCE(p_paga_reference, paga_reference),
        updated_at = NOW()
  WHERE id = p_transaction_id;
END;
$$;

-- 3. Fix wallet_debit to handle type casting strictly
CREATE OR REPLACE FUNCTION public.wallet_debit(
  p_transaction_id UUID,
  p_wallet_id UUID,
  p_amount NUMERIC
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_state public.wallet_tx_state;
BEGIN
  -- Idempotency check
  SELECT wallet_state INTO v_state FROM public.transactions 
  WHERE id = p_transaction_id FOR UPDATE;
  
  IF v_state = 'debited'::public.wallet_tx_state OR v_state = 'processing'::public.wallet_tx_state OR v_state = 'success'::public.wallet_tx_state THEN 
    RETURN; 
  END IF;

  -- Lock wallet and check balance
  SELECT balance INTO v_current_balance FROM public.wallets 
  WHERE id = p_wallet_id FOR UPDATE;
  
  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance: have ₦%, need ₦%', v_current_balance, p_amount;
  END IF;

  v_new_balance := v_current_balance - p_amount;
  
  -- Update wallet balance
  UPDATE public.wallets 
    SET balance = v_new_balance, updated_at = NOW() 
  WHERE id = p_wallet_id;

  -- Write ledger entry
  INSERT INTO public.wallet_ledger(wallet_id, transaction_id, entry_type, amount, balance_before, balance_after)
  VALUES (p_wallet_id, p_transaction_id, 'debit', p_amount, v_current_balance, v_new_balance);

  -- Mark transaction as debited with explicit cast
  UPDATE public.transactions 
    SET wallet_state = 'debited'::public.wallet_tx_state,
        status = 'processing', 
        updated_at = NOW()
  WHERE id = p_transaction_id;
END;
$$;

-- 4. Fix execute_user_transfer with full column set and explicit casts
CREATE OR REPLACE FUNCTION public.execute_user_transfer(
  sender_id UUID,
  recipient_ign TEXT,
  amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recipient_id UUID;
  v_sender_wallet_id UUID;
  v_receiver_wallet_id UUID;
  v_sender_tx_id UUID;
  v_receiver_tx_id UUID;
  v_ref TEXT := 'transfer_' || gen_random_uuid()::TEXT;
  v_fee NUMERIC := 50.00; -- Flat fee for user-to-user transfers
  v_total_debit NUMERIC := amount + v_fee;
  v_sender_balance NUMERIC;
  v_sender_user_id UUID;
BEGIN
  -- Find recipient by IGN
  SELECT id INTO v_recipient_id FROM public.profiles 
  WHERE LOWER(TRIM(ign)) = LOWER(TRIM(recipient_ign)) AND NOT is_banned
  LIMIT 1;
  
  IF NOT FOUND THEN 
    RAISE EXCEPTION 'Recipient not found: %', recipient_ign; 
  END IF;
  
  IF v_recipient_id = sender_id THEN 
    RAISE EXCEPTION 'Cannot transfer to yourself'; 
  END IF;

  -- Ensure recipient has a clan wallet
  INSERT INTO public.wallets (user_id, wallet_type, balance, currency)
  VALUES (v_recipient_id, 'clan', 0, 'NGN')
  ON CONFLICT (user_id, wallet_type) DO NOTHING;

  -- Get wallets (lock them immediately)
  SELECT id INTO v_sender_wallet_id FROM public.wallets 
  WHERE user_id = sender_id AND wallet_type = 'clan' 
  FOR UPDATE;
  
  SELECT id INTO v_receiver_wallet_id FROM public.wallets 
  WHERE user_id = v_recipient_id AND wallet_type = 'clan' 
  FOR UPDATE;

  IF v_sender_wallet_id IS NULL THEN 
    RAISE EXCEPTION 'Sender wallet not found'; 
  END IF;
  
  IF v_receiver_wallet_id IS NULL THEN 
    RAISE EXCEPTION 'Recipient wallet not found'; 
  END IF;

  -- Check balance
  SELECT balance, user_id INTO v_sender_balance, v_sender_user_id 
  FROM public.wallets 
  WHERE id = v_sender_wallet_id;
  
  IF v_sender_balance < v_total_debit THEN
    RAISE EXCEPTION 'Insufficient balance. Need ₦%, have ₦%', v_total_debit, v_sender_balance;
  END IF;

  -- Create sender transaction (debit)
  INSERT INTO public.transactions(
    wallet_id, user_id, wallet_type, type, amount, fee, 
    status, wallet_state, reference, description, created_at
  )
  VALUES(
    v_sender_wallet_id, v_sender_user_id, 'clan', 'transfer_out'::transaction_type, 
    amount, v_fee, 'processing', 'pending'::public.wallet_tx_state, v_ref || '_out', 'Transfer to ' || recipient_ign, NOW()
  )
  RETURNING id INTO v_sender_tx_id;

  -- Create receiver transaction (credit)
  INSERT INTO public.transactions(
    wallet_id, user_id, wallet_type, type, amount, fee, 
    status, wallet_state, reference, description, created_at
  )
  VALUES(
    v_receiver_wallet_id, v_recipient_id, 'clan', 'transfer_in'::transaction_type, 
    amount, 0, 'processing', 'pending'::public.wallet_tx_state, v_ref || '_in', 'Transfer from ' || (SELECT ign FROM public.profiles WHERE id = sender_id), NOW()
  )
  RETURNING id INTO v_receiver_tx_id;

  -- Execute DEBIT (amount + fee)
  PERFORM public.wallet_debit(v_sender_tx_id, v_sender_wallet_id, v_total_debit);

  -- Execute CREDIT
  PERFORM public.wallet_credit(v_receiver_tx_id, v_receiver_wallet_id, amount);

  -- Mark sender as complete
  UPDATE public.transactions 
    SET wallet_state = 'debited'::public.wallet_tx_state, 
        status = 'completed', 
        updated_at = NOW() 
  WHERE id = v_sender_tx_id;

  RETURN json_build_object(
    'success', true, 
    'reference', v_ref, 
    'fee', v_fee,
    'sender_transaction_id', v_sender_tx_id,
    'receiver_transaction_id', v_receiver_tx_id
  );
END;
$$;

-- 5. Fix wallet_create_withdrawal_intent to return net_amount
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
SET search_path TO 'public'
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
          'net_amount', COALESCE((t.metadata->>'netAmount')::NUMERIC, t.amount),
          'new_balance', w.balance,
          'success', true
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
    'net_amount', v_net
  );
END;
$$;

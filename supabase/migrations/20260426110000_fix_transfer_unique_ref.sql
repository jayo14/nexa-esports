-- Fix duplicate key error in execute_user_transfer by making references unique
CREATE OR REPLACE FUNCTION public.execute_user_transfer(
  sender_id UUID,
  recipient_ign TEXT,
  amount NUMERIC
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
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

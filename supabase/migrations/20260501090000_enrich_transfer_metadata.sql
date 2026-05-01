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
  v_fee NUMERIC := 50.00;
  v_total_debit NUMERIC := amount + v_fee;
  v_sender_balance NUMERIC;
  v_sender_user_id UUID;
  v_sender_ign TEXT;
BEGIN
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
  FROM public.profiles
  WHERE id = sender_id;

  INSERT INTO public.wallets (user_id, wallet_type, balance, currency)
  VALUES (v_recipient_id, 'clan', 0, 'NGN')
  ON CONFLICT (user_id, wallet_type) DO NOTHING;

  SELECT id INTO v_sender_wallet_id
  FROM public.wallets
  WHERE user_id = sender_id AND wallet_type = 'clan'
  FOR UPDATE;

  SELECT id INTO v_receiver_wallet_id
  FROM public.wallets
  WHERE user_id = v_recipient_id AND wallet_type = 'clan'
  FOR UPDATE;

  IF v_sender_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Sender wallet not found';
  END IF;

  IF v_receiver_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Recipient wallet not found';
  END IF;

  SELECT balance, user_id INTO v_sender_balance, v_sender_user_id
  FROM public.wallets
  WHERE id = v_sender_wallet_id;

  IF v_sender_balance < v_total_debit THEN
    RAISE EXCEPTION 'Insufficient balance. Need ₦%, have ₦%', v_total_debit, v_sender_balance;
  END IF;

  INSERT INTO public.transactions(
    wallet_id, user_id, wallet_type, type, amount, fee,
    status, wallet_state, reference, description, metadata, created_at
  )
  VALUES(
    v_sender_wallet_id, v_sender_user_id, 'clan', 'transfer_out'::transaction_type,
    amount, v_fee, 'processing', 'pending'::public.wallet_tx_state, v_ref || '_out',
    'Transfer to ' || recipient_ign,
    jsonb_build_object(
      'transfer_reference', v_ref,
      'direction', 'out',
      'sender_ign', v_sender_ign,
      'recipient_ign', recipient_ign,
      'fee', v_fee,
      'net_amount', amount
    ),
    NOW()
  )
  RETURNING id INTO v_sender_tx_id;

  INSERT INTO public.transactions(
    wallet_id, user_id, wallet_type, type, amount, fee,
    status, wallet_state, reference, description, metadata, created_at
  )
  VALUES(
    v_receiver_wallet_id, v_recipient_id, 'clan', 'transfer_in'::transaction_type,
    amount, 0, 'processing', 'pending'::public.wallet_tx_state, v_ref || '_in',
    'Transfer from ' || COALESCE(v_sender_ign, 'Unknown'),
    jsonb_build_object(
      'transfer_reference', v_ref,
      'direction', 'in',
      'sender_ign', v_sender_ign,
      'recipient_ign', recipient_ign,
      'fee', 0,
      'net_amount', amount
    ),
    NOW()
  )
  RETURNING id INTO v_receiver_tx_id;

  PERFORM public.wallet_debit(v_sender_tx_id, v_sender_wallet_id, v_total_debit);
  PERFORM public.wallet_credit(v_receiver_tx_id, v_receiver_wallet_id, amount);

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

GRANT EXECUTE ON FUNCTION public.execute_user_transfer(uuid, text, numeric) TO authenticated;

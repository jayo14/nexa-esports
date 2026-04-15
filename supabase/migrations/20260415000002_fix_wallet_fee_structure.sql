ALTER TABLE public.wallets
  ADD COLUMN IF NOT EXISTS wallet_type TEXT NOT NULL DEFAULT 'clan'
  CHECK (wallet_type IN ('clan', 'marketplace'));

CREATE OR REPLACE FUNCTION public.calculate_wallet_fee(
  p_amount DECIMAL,
  p_wallet_type TEXT
) RETURNS DECIMAL AS $$
DECLARE
  v_rate DECIMAL;
  v_cap DECIMAL;
  v_fee DECIMAL;
BEGIN
  IF p_wallet_type = 'marketplace' THEN
    v_rate := 0.0105;
    v_cap := 2000;
  ELSE
    v_rate := 0.035;
    v_cap := 5000;
  END IF;

  v_fee := ROUND(p_amount * v_rate, 2);
  RETURN LEAST(v_fee, v_cap);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION public.credit_wallet(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_currency TEXT DEFAULT 'NGN',
  p_wallet_type TEXT DEFAULT 'clan'
) RETURNS DECIMAL AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance DECIMAL;
  v_fee DECIMAL;
  v_net_amount DECIMAL;
  v_transaction_id UUID;
  v_existing_status TEXT;
  v_lock_key BIGINT;
BEGIN
  v_lock_key := ('x' || substr(encode(digest(p_reference, 'sha256'), 'hex'), 1, 15))::bit(60)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  SELECT id, status INTO v_transaction_id, v_existing_status
  FROM transactions
  WHERE reference = p_reference
  LIMIT 1;

  IF v_existing_status = 'success' THEN
    SELECT balance INTO v_new_balance
    FROM wallets
    WHERE user_id = p_user_id
      AND wallet_type = p_wallet_type
    LIMIT 1;
    RETURN COALESCE(v_new_balance, 0);
  END IF;

  v_fee := public.calculate_wallet_fee(p_amount, p_wallet_type);
  v_net_amount := ROUND(p_amount - v_fee, 2);

  SELECT id INTO v_wallet_id
  FROM wallets
  WHERE user_id = p_user_id
    AND wallet_type = p_wallet_type
  LIMIT 1;

  IF v_wallet_id IS NULL THEN
    INSERT INTO wallets (user_id, balance, wallet_type)
    VALUES (p_user_id, 0, p_wallet_type)
    RETURNING id INTO v_wallet_id;
  END IF;

  UPDATE wallets
  SET balance = balance + v_net_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  IF v_transaction_id IS NOT NULL THEN
    UPDATE transactions
    SET status = 'success',
        amount = v_net_amount,
        currency = p_currency,
        wallet_id = v_wallet_id,
        user_id = p_user_id,
        updated_at = NOW()
    WHERE id = v_transaction_id;
  ELSE
    INSERT INTO transactions (wallet_id, user_id, amount, type, status, reference, currency)
    VALUES (v_wallet_id, p_user_id, v_net_amount, 'deposit', 'success', p_reference, p_currency)
    RETURNING id INTO v_transaction_id;
  END IF;

  INSERT INTO earnings (transaction_id, amount, source)
  VALUES (v_transaction_id, v_fee, p_wallet_type || '_deposit_fee');

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.debit_wallet(
  p_user_id UUID,
  p_amount DECIMAL,
  p_reference TEXT,
  p_wallet_type TEXT DEFAULT 'clan'
) RETURNS DECIMAL AS $$
DECLARE
  v_wallet_id UUID;
  v_fee DECIMAL;
  v_net_payout DECIMAL;
  v_new_balance DECIMAL;
  v_current_balance DECIMAL;
  v_transaction_id UUID;
BEGIN
  SELECT id, balance
  INTO v_wallet_id, v_current_balance
  FROM wallets
  WHERE user_id = p_user_id
    AND wallet_type = p_wallet_type
  LIMIT 1;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  v_fee := public.calculate_wallet_fee(p_amount, p_wallet_type);
  v_net_payout := ROUND(p_amount - v_fee, 2);

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  UPDATE wallets
  SET balance = balance - p_amount,
      updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO transactions (wallet_id, user_id, amount, type, status, reference)
  VALUES (v_wallet_id, p_user_id, p_amount, 'withdrawal', 'pending', p_reference)
  RETURNING id INTO v_transaction_id;

  INSERT INTO earnings (transaction_id, amount, source)
  VALUES (v_transaction_id, v_fee, p_wallet_type || '_withdrawal_fee');

  RETURN v_net_payout;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

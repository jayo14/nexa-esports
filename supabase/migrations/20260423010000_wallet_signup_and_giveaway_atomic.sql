CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, ign, created_at)
  VALUES (NEW.id, NEW.email, NEW.email, NOW())
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.wallets (user_id, wallet_type, balance, currency)
  VALUES (NEW.id, 'clan', 0, 'NGN')
  ON CONFLICT (user_id, wallet_type) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP POLICY IF EXISTS profiles_insert ON public.profiles;
CREATE POLICY profiles_insert
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.create_giveaway_with_codes(
  p_title text,
  p_message text,
  p_code_value numeric,
  p_total_codes integer,
  p_expires_in_hours numeric,
  p_is_private boolean DEFAULT false
)
RETURNS TABLE(giveaway_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_creator_id UUID;
  v_wallet_id UUID;
  v_wallet_balance NUMERIC;
  v_total_amount NUMERIC;
  v_giveaway_id UUID;
  v_transaction_id UUID;
  v_expires_at TIMESTAMPTZ;
  v_code TEXT;
  i INTEGER;
BEGIN
  v_creator_id := auth.uid();
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF NOT (get_user_role(v_creator_id) IN ('admin', 'clan_master', 'player')) THEN
    RAISE EXCEPTION 'User does not have the required privileges';
  END IF;

  v_total_amount := p_code_value * p_total_codes;

  SELECT id, balance
  INTO v_wallet_id, v_wallet_balance
  FROM wallets
  WHERE user_id = v_creator_id
    AND wallet_type = 'clan'
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  IF v_wallet_balance < v_total_amount THEN
    RAISE EXCEPTION 'Insufficient funds. You need ₦% but only have ₦%', v_total_amount, v_wallet_balance;
  END IF;

  INSERT INTO transactions (
    wallet_id,
    wallet_type,
    type,
    amount,
    status,
    wallet_state,
    reference,
    description,
    metadata
  )
  VALUES (
    v_wallet_id,
    'clan',
    'giveaway_created',
    v_total_amount,
    'pending',
    'pending',
    'giveaway_' || gen_random_uuid()::text,
    p_title,
    jsonb_build_object('message', p_message, 'is_private', p_is_private)
  )
  RETURNING id INTO v_transaction_id;

  PERFORM wallet_debit(v_transaction_id, v_wallet_id, v_total_amount);

  v_expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;

  INSERT INTO giveaways (
    created_by,
    title,
    message,
    code_value,
    total_codes,
    total_amount,
    expires_at,
    is_private
  )
  VALUES (
    v_creator_id,
    p_title,
    p_message,
    p_code_value,
    p_total_codes,
    v_total_amount,
    v_expires_at,
    p_is_private
  )
  RETURNING id INTO v_giveaway_id;

  FOR i IN 1..p_total_codes LOOP
    LOOP
      v_code := 'NEXA' || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM giveaway_codes WHERE code = v_code);
    END LOOP;

    INSERT INTO giveaway_codes (
      giveaway_id,
      code,
      value,
      expires_at
    )
    VALUES (
      v_giveaway_id,
      v_code,
      p_code_value,
      v_expires_at
    );
  END LOOP;

  UPDATE transactions
  SET status = 'completed',
      wallet_state = 'debited',
      updated_at = NOW()
  WHERE id = v_transaction_id;

  RETURN QUERY SELECT v_giveaway_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_giveaway_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_code_record RECORD;
  v_wallet_id UUID;
  v_transaction_id UUID;
  v_new_balance NUMERIC;
  v_redeemer_ign TEXT;
  v_giveaway_title TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT ign INTO v_redeemer_ign FROM profiles WHERE id = v_user_id;

  SELECT *
  INTO v_code_record
  FROM giveaway_codes
  WHERE code = UPPER(p_code)
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Invalid code');
  END IF;

  IF v_code_record.is_redeemed THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code already redeemed');
  END IF;

  IF v_code_record.expires_at < NOW() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Code expired');
  END IF;

  SELECT title INTO v_giveaway_title FROM giveaways WHERE id = v_code_record.giveaway_id;

  SELECT id
  INTO v_wallet_id
  FROM wallets
  WHERE user_id = v_user_id
    AND wallet_type = 'clan'
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    INSERT INTO wallets (user_id, wallet_type, balance, currency)
    VALUES (v_user_id, 'clan', 0, 'NGN')
    RETURNING id INTO v_wallet_id;
  END IF;

  INSERT INTO transactions (
    wallet_id,
    wallet_type,
    type,
    amount,
    status,
    wallet_state,
    reference,
    description
  )
  VALUES (
    v_wallet_id,
    'clan',
    'giveaway_redeemed',
    v_code_record.value,
    'pending',
    'pending',
    'redeem_' || p_code,
    'Giveaway redemption'
  )
  RETURNING id INTO v_transaction_id;

  UPDATE giveaway_codes
  SET is_redeemed = true,
      redeemed_by = v_user_id,
      redeemed_at = NOW()
  WHERE id = v_code_record.id;

  UPDATE giveaways
  SET redeemed_count = redeemed_count + 1,
      redeemed_amount = redeemed_amount + v_code_record.value,
      updated_at = NOW()
  WHERE id = v_code_record.giveaway_id;

  PERFORM wallet_credit(v_transaction_id, v_wallet_id, v_code_record.value, 'redeem_' || p_code);

  SELECT balance INTO v_new_balance FROM wallets WHERE id = v_wallet_id;

  UPDATE profiles
  SET last_giveaway_redeemed_at = NOW()
  WHERE id = v_user_id;

  INSERT INTO notifications (type, title, message, user_id, data)
  VALUES (
    'giveaway_redeemed',
    '🎉 Code Redeemed!',
    v_redeemer_ign || ' just redeemed ₦' || v_code_record.value || ' from ' || v_giveaway_title,
    NULL,
    jsonb_build_object(
      'giveaway_id', v_code_record.giveaway_id,
      'redeemer', v_redeemer_ign,
      'amount', v_code_record.value
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'amount', v_code_record.value,
    'new_balance', v_new_balance,
    'message', 'Successfully redeemed ₦' || v_code_record.value
  );
END;
$$;

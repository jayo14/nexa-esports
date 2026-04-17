-- 1. Trigger for new user signup to create both wallets
CREATE OR REPLACE FUNCTION public.handle_new_user_wallets()
RETURNS TRIGGER AS $$
BEGIN
  -- Create clan wallet
  INSERT INTO public.wallets (user_id, balance, wallet_type)
  VALUES (NEW.id, 0, 'clan')
  ON CONFLICT (user_id, wallet_type) DO NOTHING;
  
  -- Create marketplace wallet
  INSERT INTO public.wallets (user_id, balance, wallet_type)
  VALUES (NEW.id, 0, 'marketplace')
  ON CONFLICT (user_id, wallet_type) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists on profiles table AFTER INSERT
DROP TRIGGER IF EXISTS on_profile_created_create_wallets ON public.profiles;
CREATE TRIGGER on_profile_created_create_wallets
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_wallets();

-- 2. Update marketplace_checkout to handle p_buyer_role and correct commission
CREATE OR REPLACE FUNCTION public.marketplace_checkout(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_price DECIMAL,
  p_buyer_role TEXT DEFAULT 'buyer'
) RETURNS JSONB AS $$
DECLARE
  v_seller_id UUID;
  v_buyer_balance DECIMAL;
  v_commission_rate DECIMAL;
  v_commission_cap DECIMAL;
  v_commission_amount DECIMAL;
  v_seller_payout DECIMAL;
  v_transaction_id UUID;
  v_listing RECORD;
  v_buyer_wallet_id UUID;
  v_wallet_type TEXT;
BEGIN
  -- Determine wallet type and commission rate based on role
  IF p_buyer_role IN ('player', 'admin', 'moderator', 'clan_master') THEN
    v_wallet_type := 'clan';
    v_commission_rate := 0.035; -- 3.5%
    v_commission_cap := 5000;
  ELSE
    v_wallet_type := 'marketplace';
    v_commission_rate := 0.0105; -- 1.05%
    v_commission_cap := 2000;
  END IF;

  SELECT * INTO v_listing
  FROM account_listings
  WHERE id = p_listing_id AND status = 'available'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing not available');
  END IF;

  v_seller_id := v_listing.seller_id;

  -- Select the specific wallet type
  SELECT id, balance INTO v_buyer_wallet_id, v_buyer_balance
  FROM wallets
  WHERE user_id = p_buyer_id AND wallet_type = v_wallet_type
  FOR UPDATE;

  IF v_buyer_wallet_id IS NULL OR COALESCE(v_buyer_balance, 0) < p_price THEN
    -- Fallback to any wallet if specific one not found (to be safe for existing users)
    SELECT id, balance INTO v_buyer_wallet_id, v_buyer_balance
    FROM wallets
    WHERE user_id = p_buyer_id
    ORDER BY (wallet_type = v_wallet_type) DESC, updated_at DESC
    LIMIT 1
    FOR UPDATE;
    
    IF v_buyer_wallet_id IS NULL OR COALESCE(v_buyer_balance, 0) < p_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient ' || v_wallet_type || ' wallet balance');
    END IF;
  END IF;

  v_commission_amount := LEAST(ROUND(p_price * v_commission_rate, 2), v_commission_cap);
  v_seller_payout := ROUND(p_price - v_commission_amount, 2);

  UPDATE wallets
  SET balance = balance - p_price, updated_at = NOW()
  WHERE id = v_buyer_wallet_id;

  INSERT INTO account_transactions (
    listing_id,
    buyer_id,
    seller_id,
    price,
    commission_amount,
    seller_payout_amount,
    status,
    payment_method,
    auto_release_at
  ) VALUES (
    p_listing_id,
    p_buyer_id,
    v_seller_id,
    p_price,
    v_commission_amount,
    v_seller_payout,
    'processing',
    'wallet',
    NOW() + INTERVAL '3 days'
  ) RETURNING id INTO v_transaction_id;

  -- Record commission in earnings
  INSERT INTO earnings (transaction_id, amount, source)
  VALUES (v_transaction_id, v_commission_amount, 'marketplace_commission');

  UPDATE account_listings
  SET status = 'reserved', updated_at = NOW()
  WHERE id = p_listing_id;

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'message', 'Purchase successful',
    'wallet_used', v_wallet_used
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Update execute_user_transfer to include 3.5% fee and record earnings
CREATE OR REPLACE FUNCTION public.execute_user_transfer(
    sender_id UUID,
    recipient_ign TEXT,
    amount DECIMAL
)
RETURNS void AS $$
DECLARE
    v_sender_wallet_id UUID;
    v_sender_balance DECIMAL;
    v_recipient_id UUID;
    v_recipient_wallet_id UUID;
    v_fee DECIMAL;
    v_total_deduction DECIMAL;
    v_sender_transaction_id UUID;
    v_transfer_ref TEXT;
BEGIN
    -- Verify the sender is the authenticated user
    IF sender_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: You can only transfer from your own wallet';
    END IF;

    -- Verify amount is positive
    IF amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be greater than zero';
    END IF;

    -- Calculate fee (Clan wallet rate: 3.5%, cap 5000)
    v_fee := public.calculate_wallet_fee(amount, 'clan');
    v_total_deduction := amount + v_fee;

    -- Find recipient's user ID from their IGN in the profiles table
    SELECT id INTO v_recipient_id FROM profiles WHERE ign = recipient_ign;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recipient not found';
    END IF;

    -- Prevent self-transfers
    IF sender_id = v_recipient_id THEN
        RAISE EXCEPTION 'Cannot transfer to yourself';
    END IF;

    -- Get sender's wallet and balance (using clan wallet for transfers)
    SELECT id, balance INTO v_sender_wallet_id, v_sender_balance 
    FROM wallets WHERE user_id = sender_id AND wallet_type = 'clan';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sender clan wallet not found';
    END IF;

    -- Check for sufficient funds
    IF v_sender_balance < v_total_deduction THEN
        RAISE EXCEPTION 'Insufficient funds (Amount: ₦%, Fee: ₦%)', amount, v_fee;
    END IF;

    -- Get or create recipient's clan wallet
    SELECT id INTO v_recipient_wallet_id FROM wallets WHERE user_id = v_recipient_id AND wallet_type = 'clan';
    IF NOT FOUND THEN
        INSERT INTO wallets (user_id, balance, wallet_type) VALUES (v_recipient_id, 0, 'clan') RETURNING id INTO v_recipient_wallet_id;
    END IF;

    -- Perform the transfer
    UPDATE wallets SET balance = balance - v_total_deduction, updated_at = NOW() WHERE id = v_sender_wallet_id;
    UPDATE wallets SET balance = balance + amount, updated_at = NOW() WHERE id = v_recipient_wallet_id;

    -- Generate unique reference
    v_transfer_ref := 'transfer_' || gen_random_uuid()::text;

    -- Log both transactions
    INSERT INTO transactions (wallet_id, user_id, amount, type, status, reference)
    VALUES
        (v_sender_wallet_id, sender_id, amount, 'transfer_out', 'success', v_transfer_ref || '_out')
    RETURNING id INTO v_sender_transaction_id;

    INSERT INTO transactions (wallet_id, user_id, amount, type, status, reference)
    VALUES
        (v_recipient_wallet_id, v_recipient_id, amount, 'transfer_in', 'success', v_transfer_ref || '_in');

    -- Log the fee to earnings
    INSERT INTO earnings (transaction_id, amount, source)
    VALUES (v_sender_transaction_id, v_fee, 'clan_transfer_fee');

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

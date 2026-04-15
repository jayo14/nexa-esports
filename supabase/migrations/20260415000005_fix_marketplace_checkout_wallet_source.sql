-- Ensure marketplace checkout uses wallets table balance source (not profiles.wallet_balance).
-- Also credit seller payout to wallets table for consistency.

CREATE OR REPLACE FUNCTION public.marketplace_checkout(
  p_listing_id UUID,
  p_buyer_id UUID,
  p_price DECIMAL
) RETURNS JSONB AS $$
DECLARE
  v_seller_id UUID;
  v_buyer_balance DECIMAL;
  v_commission_rate DECIMAL := 0.05;
  v_commission_amount DECIMAL;
  v_seller_payout DECIMAL;
  v_transaction_id UUID;
  v_listing RECORD;
  v_buyer_wallet_id UUID;
BEGIN
  SELECT * INTO v_listing
  FROM account_listings
  WHERE id = p_listing_id AND status = 'available'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing not available');
  END IF;

  v_seller_id := v_listing.seller_id;

  -- Prefer marketplace wallet, then fallback to latest wallet for compatibility.
  SELECT id, balance INTO v_buyer_wallet_id, v_buyer_balance
  FROM wallets
  WHERE user_id = p_buyer_id AND wallet_type = 'marketplace'
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF v_buyer_wallet_id IS NULL THEN
    SELECT id, balance INTO v_buyer_wallet_id, v_buyer_balance
    FROM wallets
    WHERE user_id = p_buyer_id
    ORDER BY updated_at DESC NULLS LAST
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_buyer_wallet_id IS NULL OR COALESCE(v_buyer_balance, 0) < p_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  v_commission_amount := ROUND(p_price * v_commission_rate, 2);
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

  UPDATE account_listings
  SET status = 'reserved', updated_at = NOW()
  WHERE id = p_listing_id;

  INSERT INTO transactions (
    wallet_id,
    user_id,
    type,
    amount,
    description,
    status,
    reference
  ) VALUES (
    v_buyer_wallet_id,
    p_buyer_id,
    'marketplace_purchase',
    -p_price,
    'Purchased CODM Account: ' || v_listing.title,
    'completed',
    'MP-' || v_transaction_id::TEXT
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'message', 'Purchase successful'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.confirm_marketplace_purchase(
  p_transaction_id UUID,
  p_buyer_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_transaction RECORD;
  v_seller_payout DECIMAL;
  v_seller_wallet_id UUID;
BEGIN
  SELECT * INTO v_transaction
  FROM account_transactions
  WHERE id = p_transaction_id AND buyer_id = p_buyer_id AND status = 'processing'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found or already completed');
  END IF;

  v_seller_payout := COALESCE(v_transaction.seller_payout_amount, 0);

  SELECT id INTO v_seller_wallet_id
  FROM wallets
  WHERE user_id = v_transaction.seller_id AND wallet_type = 'marketplace'
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF v_seller_wallet_id IS NULL THEN
    INSERT INTO wallets (user_id, balance, wallet_type)
    VALUES (v_transaction.seller_id, 0, 'marketplace')
    RETURNING id INTO v_seller_wallet_id;
  END IF;

  UPDATE wallets
  SET balance = balance + v_seller_payout, updated_at = NOW()
  WHERE id = v_seller_wallet_id;

  UPDATE account_transactions
  SET
    status = 'completed',
    buyer_confirmed = TRUE,
    escrow_released = TRUE,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transaction_id;

  UPDATE account_listings
  SET status = 'sold', sold_at = NOW(), updated_at = NOW()
  WHERE id = v_transaction.listing_id;

  INSERT INTO transactions (
    wallet_id,
    user_id,
    type,
    amount,
    description,
    status,
    reference
  ) VALUES (
    v_seller_wallet_id,
    v_transaction.seller_id,
    'marketplace_sale',
    v_seller_payout,
    'Sale of CODM Account (Transaction: ' || p_transaction_id::TEXT || ')',
    'completed',
    'MPS-' || p_transaction_id::TEXT
  );

  RETURN jsonb_build_object('success', true, 'message', 'Purchase confirmed and escrow released');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration: Disable Marketplace Escrow and Simplify Checkout
-- Flow: available -> sold (immediate completion)

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
  v_seller_wallet_id UUID;
BEGIN
  -- 1. Lock listing
  SELECT * INTO v_listing
  FROM account_listings
  WHERE id = p_listing_id AND status = 'available'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Listing not available');
  END IF;

  v_seller_id := v_listing.seller_id;

  -- 2. Lock and check buyer wallet
  SELECT id, balance INTO v_buyer_wallet_id, v_buyer_balance
  FROM wallets
  WHERE user_id = p_buyer_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF v_buyer_wallet_id IS NULL OR COALESCE(v_buyer_balance, 0) < p_price THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
  END IF;

  -- 3. Prepare figures
  v_commission_amount := ROUND(p_price * v_commission_rate, 2);
  v_seller_payout := ROUND(p_price - v_commission_amount, 2);

  -- 4. Deduct from buyer
  UPDATE wallets
  SET balance = balance - p_price, updated_at = NOW()
  WHERE id = v_buyer_wallet_id;

  -- 5. Credit seller immediately (Escrow Bypassed)
  SELECT id INTO v_seller_wallet_id
  FROM wallets
  WHERE user_id = v_seller_id
  ORDER BY updated_at DESC NULLS LAST
  LIMIT 1
  FOR UPDATE;

  IF v_seller_wallet_id IS NULL THEN
    INSERT INTO wallets (user_id, balance)
    VALUES (v_seller_id, v_seller_payout)
    RETURNING id INTO v_seller_wallet_id;
  ELSE
    UPDATE wallets
    SET balance = balance + v_seller_payout, updated_at = NOW()
    WHERE id = v_seller_wallet_id;
  END IF;

  -- 6. Record transaction as COMPLETED
  INSERT INTO account_transactions (
    listing_id,
    buyer_id,
    seller_id,
    price,
    commission_amount,
    seller_payout_amount,
    status,
    payment_method,
    escrow_released,
    buyer_confirmed,
    seller_confirmed,
    completed_at
  ) VALUES (
    p_listing_id,
    p_buyer_id,
    v_seller_id,
    p_price,
    v_commission_amount,
    v_seller_payout,
    'completed',
    'wallet',
    TRUE,
    TRUE,
    TRUE,
    NOW()
  ) RETURNING id INTO v_transaction_id;

  -- 7. Mark listing as SOLD
  UPDATE account_listings
  SET status = 'sold', sold_at = NOW(), updated_at = NOW()
  WHERE id = p_listing_id;

  -- 8. Log wallet transactions
  INSERT INTO transactions (user_id, type, amount, description, status, reference)
  VALUES (
    p_buyer_id,
    'marketplace_purchase',
    -p_price,
    'Purchased: ' || v_listing.title,
    'completed',
    'MPB-' || v_transaction_id
  );

  INSERT INTO transactions (user_id, type, amount, description, status, reference)
  VALUES (
    v_seller_id,
    'marketplace_sale',
    v_seller_payout,
    'Sold: ' || v_listing.title,
    'completed',
    'MPS-' || v_transaction_id
  );

  -- 9. Send notification to seller
  INSERT INTO notifications (user_id, type, title, message, data)
  VALUES (
    v_seller_id,
    'sale_completed',
    '💰 Sale Completed',
    format('Your listing "%s" has been sold. ₦%s has been added to your wallet.', v_listing.title, v_seller_payout),
    jsonb_build_object('transaction_id', v_transaction_id, 'type', 'money_in')
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'message', 'Purchase successful and funds released'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

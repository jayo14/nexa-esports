-- Update confirm_marketplace_purchase to include notifications and earnings logging
CREATE OR REPLACE FUNCTION public.confirm_marketplace_purchase(
  p_transaction_id UUID,
  p_buyer_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_transaction RECORD;
  v_seller_payout DECIMAL;
  v_seller_wallet_id UUID;
  v_listing RECORD;
BEGIN
  -- Lock transaction for update
  SELECT * INTO v_transaction
  FROM account_transactions
  WHERE id = p_transaction_id AND buyer_id = p_buyer_id AND status IN ('processing', 'delivered')
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transaction not found or already completed');
  END IF;

  SELECT * INTO v_listing FROM account_listings WHERE id = v_transaction.listing_id;

  v_seller_payout := COALESCE(v_transaction.seller_payout_amount, 0);

  -- Get/Create seller marketplace wallet
  SELECT id INTO v_seller_wallet_id
  FROM wallets
  WHERE user_id = v_transaction.seller_id AND type = 'marketplace'
  LIMIT 1;

  IF v_seller_wallet_id IS NULL THEN
    INSERT INTO wallets (user_id, balance, type)
    VALUES (v_transaction.seller_id, 0, 'marketplace')
    RETURNING id INTO v_seller_wallet_id;
  END IF;

  -- Release escrow to seller
  UPDATE wallets
  SET 
    balance = balance + v_seller_payout, 
    updated_at = NOW()
  WHERE id = v_seller_wallet_id;

  -- Update transaction status
  UPDATE account_transactions
  SET
    status = 'completed',
    buyer_confirmed = TRUE,
    escrow_released = TRUE,
    completed_at = NOW(),
    updated_at = NOW()
  WHERE id = p_transaction_id;

  -- Update listing status
  UPDATE account_listings
  SET status = 'sold', sold_at = NOW(), updated_at = NOW()
  WHERE id = v_transaction.listing_id;

  -- Log platform commission to earnings
  IF v_transaction.commission_amount > 0 THEN
    INSERT INTO public.earnings (amount, source, transaction_id)
    VALUES (v_transaction.commission_amount, 'marketplace_commission', p_transaction_id);
  END IF;

  -- Notify seller
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    v_transaction.seller_id,
    'marketplace_payout',
    'Payment Received!',
    format('Buyer confirmed receipt for "%s". ₦%s has been added to your marketplace wallet.', COALESCE(v_listing.title, 'Your listing'), v_seller_payout),
    jsonb_build_object('transaction_id', p_transaction_id, 'amount', v_seller_payout)
  );

  RETURN jsonb_build_object('success', true, 'message', 'Purchase confirmed and escrow released');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

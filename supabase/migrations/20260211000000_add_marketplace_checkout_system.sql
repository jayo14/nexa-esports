-- Migration: Add Marketplace Checkout System
-- Adds fields for account credentials, receipts, and enhanced purchase flow

-- Add columns to account_listings for storing account credentials
ALTER TABLE public.account_listings
ADD COLUMN IF NOT EXISTS account_credentials JSONB,
ADD COLUMN IF NOT EXISTS security_notes TEXT;

-- Add columns to account_transactions for receipt and purchase details
ALTER TABLE public.account_transactions
ADD COLUMN IF NOT EXISTS receipt_data JSONB,
ADD COLUMN IF NOT EXISTS credentials_revealed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS credentials_revealed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS buyer_notes TEXT,
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS platform_fee_amount DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_payout_amount DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ;

-- Create function to handle marketplace purchase with wallet
CREATE OR REPLACE FUNCTION marketplace_checkout(
    p_listing_id UUID,
    p_buyer_id UUID,
    p_price DECIMAL
) RETURNS JSONB AS $$
DECLARE
    v_seller_id UUID;
    v_buyer_balance DECIMAL;
    v_commission_rate DECIMAL := 0.05; -- 5% commission
    v_commission_amount DECIMAL;
    v_seller_payout DECIMAL;
    v_transaction_id UUID;
    v_listing RECORD;
BEGIN
    -- Get listing details
    SELECT * INTO v_listing
    FROM account_listings
    WHERE id = p_listing_id AND status = 'available';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Listing not available');
    END IF;

    v_seller_id := v_listing.seller_id;

    -- Check if buyer has enough balance
    SELECT wallet_balance INTO v_buyer_balance
    FROM profiles
    WHERE id = p_buyer_id;

    IF v_buyer_balance < p_price THEN
        RETURN jsonb_build_object('success', false, 'error', 'Insufficient wallet balance');
    END IF;

    -- Calculate commission and seller payout
    v_commission_amount := p_price * v_commission_rate;
    v_seller_payout := p_price - v_commission_amount;

    -- Deduct from buyer's wallet
    UPDATE profiles
    SET wallet_balance = wallet_balance - p_price
    WHERE id = p_buyer_id;

    -- Create transaction record (funds in escrow)
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
        NOW() + INTERVAL '3 days' -- Auto-release after 3 days if no disputes
    ) RETURNING id INTO v_transaction_id;

    -- Update listing status to reserved
    UPDATE account_listings
    SET status = 'reserved',
        updated_at = NOW()
    WHERE id = p_listing_id;

    -- Record transaction in wallet history
    INSERT INTO transactions (
        user_id,
        type,
        amount,
        description,
        status,
        reference
    ) VALUES (
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

-- Create function to reveal credentials to buyer
CREATE OR REPLACE FUNCTION reveal_account_credentials(
    p_transaction_id UUID,
    p_user_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_transaction RECORD;
    v_listing RECORD;
    v_credentials JSONB;
BEGIN
    -- Get transaction details
    SELECT * INTO v_transaction
    FROM account_transactions
    WHERE id = p_transaction_id AND buyer_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction not found or unauthorized');
    END IF;

    -- Check if transaction is completed or processing
    IF v_transaction.status NOT IN ('processing', 'completed') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction not in valid state');
    END IF;

    -- Get listing with credentials
    SELECT * INTO v_listing
    FROM account_listings
    WHERE id = v_transaction.listing_id;

    IF NOT FOUND OR v_listing.account_credentials IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Account credentials not available');
    END IF;

    -- Mark credentials as revealed
    UPDATE account_transactions
    SET credentials_revealed = TRUE,
        credentials_revealed_at = NOW()
    WHERE id = p_transaction_id;

    -- Return credentials
    RETURN jsonb_build_object(
        'success', true,
        'credentials', v_listing.account_credentials,
        'account_uid', v_listing.account_uid,
        'security_notes', v_listing.security_notes
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to confirm purchase and release escrow
CREATE OR REPLACE FUNCTION confirm_marketplace_purchase(
    p_transaction_id UUID,
    p_buyer_id UUID
) RETURNS JSONB AS $$
DECLARE
    v_transaction RECORD;
    v_seller_payout DECIMAL;
BEGIN
    -- Get transaction details
    SELECT * INTO v_transaction
    FROM account_transactions
    WHERE id = p_transaction_id AND buyer_id = p_buyer_id AND status = 'processing';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Transaction not found or already completed');
    END IF;

    v_seller_payout := v_transaction.seller_payout_amount;

    -- Credit seller's wallet
    UPDATE profiles
    SET wallet_balance = wallet_balance + v_seller_payout
    WHERE id = v_transaction.seller_id;

    -- Update transaction status
    UPDATE account_transactions
    SET status = 'completed',
        buyer_confirmed = TRUE,
        escrow_released = TRUE,
        completed_at = NOW()
    WHERE id = p_transaction_id;

    -- Update listing status
    UPDATE account_listings
    SET status = 'sold',
        sold_at = NOW()
    WHERE id = v_transaction.listing_id;

    -- Record seller payout in transactions
    INSERT INTO transactions (
        user_id,
        type,
        amount,
        description,
        status,
        reference
    ) VALUES (
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

-- Create view for buyer purchases
CREATE OR REPLACE VIEW buyer_purchases AS
SELECT
    t.id as transaction_id,
    t.buyer_id,
    t.seller_id,
    t.listing_id,
    t.price,
    t.commission_amount,
    t.status,
    t.payment_method,
    t.credentials_revealed,
    t.credentials_revealed_at,
    t.buyer_confirmed,
    t.created_at,
    t.completed_at,
    l.title as listing_title,
    l.description as listing_description,
    l.account_uid,
    l.assets,
    l.player_level,
    l.rank,
    s.ign as seller_ign,
    s.username as seller_username,
    s.avatar_url as seller_avatar
FROM account_transactions t
JOIN account_listings l ON t.listing_id = l.id
JOIN profiles s ON t.seller_id = s.id;

-- Grant permissions
GRANT SELECT ON buyer_purchases TO authenticated;
GRANT EXECUTE ON FUNCTION marketplace_checkout TO authenticated;
GRANT EXECUTE ON FUNCTION reveal_account_credentials TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_marketplace_purchase TO authenticated;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_transactions_buyer_status ON account_transactions(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_account_transactions_seller_status ON account_transactions(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_account_transactions_auto_release ON account_transactions(auto_release_at) WHERE status = 'processing';

-- Create comment explaining credential storage
COMMENT ON COLUMN account_listings.account_credentials IS 'Encrypted JSON containing login credentials: {email, password, linked_accounts, recovery_info}';
COMMENT ON COLUMN account_transactions.credentials_revealed IS 'Whether buyer has accessed the account credentials';

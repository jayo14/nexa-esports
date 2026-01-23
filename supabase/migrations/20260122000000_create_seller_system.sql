-- Migration: Create Seller System and Enhance Marketplace
-- Includes seller_requests, updates to account_transactions for escrow

-- Create seller_requests table
CREATE TABLE IF NOT EXISTS public.seller_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reason TEXT, -- Reason for request or rejection
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, status) -- Prevent multiple pending requests
);

-- Enable RLS for seller_requests
ALTER TABLE public.seller_requests ENABLE ROW LEVEL SECURITY;

-- Policies for seller_requests
CREATE POLICY "Users can view their own seller requests"
    ON public.seller_requests FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can create their own seller requests"
    ON public.seller_requests FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage seller requests"
    ON public.seller_requests FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    );

-- Update account_transactions status check constraint to include 'funds_held' and 'delivered'
ALTER TABLE public.account_transactions 
    DROP CONSTRAINT IF EXISTS account_transactions_status_check;

ALTER TABLE public.account_transactions 
    ADD CONSTRAINT account_transactions_status_check 
    CHECK (status IN ('pending', 'funds_held', 'delivered', 'processing', 'completed', 'cancelled', 'disputed', 'refunded'));

-- Add seller_id to wallets if we want to distinguish or link explicitly? 
-- No, wallets link to user_id.

-- Function to handle marketplace purchase (Buyer Wallet -> Escrow)
CREATE OR REPLACE FUNCTION public.marketplace_purchase_listing(
    p_listing_id UUID,
    p_price DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_id UUID;
    v_seller_id UUID;
    v_buyer_wallet_id UUID;
    v_buyer_balance DECIMAL;
    v_listing_price DECIMAL;
    v_transaction_id UUID;
BEGIN
    v_buyer_id := auth.uid();
    
    -- Get listing details and lock row
    SELECT seller_id, price INTO v_seller_id, v_listing_price
    FROM public.account_listings
    WHERE id = p_listing_id AND status = 'available'
    FOR UPDATE;

    IF v_seller_id IS NULL THEN
        RAISE EXCEPTION 'Listing not found or not available';
    END IF;

    IF v_seller_id = v_buyer_id THEN
        RAISE EXCEPTION 'Cannot purchase your own listing';
    END IF;

    IF p_price != v_listing_price THEN
        RAISE EXCEPTION 'Price mismatch. Listing price has changed.';
    END IF;

    -- Get buyer wallet and lock row
    SELECT id, balance INTO v_buyer_wallet_id, v_buyer_balance
    FROM public.wallets
    WHERE user_id = v_buyer_id
    FOR UPDATE;

    IF v_buyer_wallet_id IS NULL THEN
        RAISE EXCEPTION 'Buyer wallet not found';
    END IF;

    IF v_buyer_balance < v_listing_price THEN
        RAISE EXCEPTION 'Insufficient funds in wallet';
    END IF;

    -- Deduct from buyer wallet
    UPDATE public.wallets
    SET balance = balance - v_listing_price,
        updated_at = NOW()
    WHERE id = v_buyer_wallet_id;

    -- Create wallet transaction record (Debit)
    INSERT INTO public.transactions (
        wallet_id,
        amount,
        type,
        status,
        reference,
        description,
        currency
    ) VALUES (
        v_buyer_wallet_id,
        v_listing_price,
        'marketplace_purchase',
        'completed',
        'mp_purch_' || p_listing_id,
        'Purchase of listing ' || p_listing_id,
        'NGN'
    );

    -- Create marketplace transaction (Escrow)
    INSERT INTO public.account_transactions (
        listing_id,
        buyer_id,
        seller_id,
        price,
        status,
        payment_method,
        escrow_released
    ) VALUES (
        p_listing_id,
        v_buyer_id,
        v_seller_id,
        v_listing_price,
        'funds_held',
        'wallet',
        false
    ) RETURNING id INTO v_transaction_id;

    -- Update listing status
    UPDATE public.account_listings
    SET status = 'reserved',
        updated_at = NOW()
    WHERE id = p_listing_id;

    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'new_balance', v_buyer_balance - v_listing_price
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- Function to Confirm Delivery (Escrow -> Seller)
CREATE OR REPLACE FUNCTION public.marketplace_confirm_delivery(
    p_transaction_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_buyer_id UUID;
    v_seller_id UUID;
    v_price DECIMAL;
    v_status VARCHAR;
    v_seller_wallet_id UUID;
    v_commission DECIMAL;
    v_final_amount DECIMAL;
BEGIN
    v_buyer_id := auth.uid();

    -- Get transaction details
    SELECT seller_id, price, status INTO v_seller_id, v_price, v_status
    FROM public.account_transactions
    WHERE id = p_transaction_id
    FOR UPDATE;

    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    -- Only buyer can confirm delivery? Or admin?
    -- Assuming buyer confirms delivery or admin forces it.
    IF v_buyer_id != (SELECT buyer_id FROM public.account_transactions WHERE id = p_transaction_id) AND
       NOT EXISTS (SELECT 1 FROM profiles WHERE id = v_buyer_id AND role IN ('admin', 'clan_master')) THEN
       RAISE EXCEPTION 'Not authorized to confirm delivery';
    END IF;

    IF v_status NOT IN ('funds_held', 'delivered') THEN
        RAISE EXCEPTION 'Transaction status is not valid for release (%s)', v_status;
    END IF;

    -- Get commission rate from app_settings
    SELECT value::DECIMAL INTO v_commission
    FROM public.app_settings
    WHERE key = 'marketplace_commission';

    IF v_commission IS NULL THEN
        v_commission := 5; -- Default 5%
    END IF;

    v_final_amount := v_price * (1 - (v_commission / 100));

    -- Get seller wallet
    SELECT id INTO v_seller_wallet_id
    FROM public.wallets
    WHERE user_id = v_seller_id;

    -- If seller has no wallet, create one?
    IF v_seller_wallet_id IS NULL THEN
        INSERT INTO public.wallets (user_id, balance)
        VALUES (v_seller_id, 0)
        RETURNING id INTO v_seller_wallet_id;
    END IF;

    -- Credit seller wallet
    UPDATE public.wallets
    SET balance = balance + v_final_amount,
        updated_at = NOW()
    WHERE id = v_seller_wallet_id;

    -- Create wallet transaction record (Credit)
    INSERT INTO public.transactions (
        wallet_id,
        amount,
        type,
        status,
        reference,
        description,
        currency
    ) VALUES (
        v_seller_wallet_id,
        v_final_amount,
        'marketplace_sale',
        'completed',
        'mp_sale_' || p_transaction_id,
        'Sale of listing ' || (SELECT listing_id FROM public.account_transactions WHERE id = p_transaction_id),
        'NGN'
    );

    -- Update marketplace transaction
    UPDATE public.account_transactions
    SET status = 'completed',
        escrow_released = true,
        completed_at = NOW(),
        buyer_confirmed = true
    WHERE id = p_transaction_id;

    -- Update listing status to sold
    UPDATE public.account_listings
    SET status = 'sold'
    WHERE id = (SELECT listing_id FROM public.account_transactions WHERE id = p_transaction_id);

    RETURN jsonb_build_object(
        'success', true,
        'amount_credited', v_final_amount
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

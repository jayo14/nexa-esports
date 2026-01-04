-- Migration: Create CODM Accounts Marketplace System
-- This adds tables for buying and selling CODM accounts

-- Create account_listings table
CREATE TABLE IF NOT EXISTS public.account_listings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL CHECK (price > 0),
    player_level INTEGER CHECK (player_level >= 1 AND player_level <= 500),
    rank VARCHAR(50),
    kd_ratio DECIMAL(4, 2),
    weapons_owned INTEGER,
    skins_owned INTEGER,
    legendary_items INTEGER DEFAULT 0,
    mythic_items INTEGER DEFAULT 0,
    images JSONB DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'sold', 'reserved', 'under_review', 'rejected')),
    verification_status VARCHAR(50) DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'rejected')),
    verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    verified_at TIMESTAMPTZ,
    featured BOOLEAN DEFAULT false,
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    sold_at TIMESTAMPTZ
);

-- Create account_transactions table
CREATE TABLE IF NOT EXISTS public.account_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES public.account_listings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'disputed', 'refunded')),
    payment_method VARCHAR(50) DEFAULT 'wallet',
    escrow_released BOOLEAN DEFAULT false,
    buyer_confirmed BOOLEAN DEFAULT false,
    seller_confirmed BOOLEAN DEFAULT false,
    dispute_reason TEXT,
    dispute_opened_at TIMESTAMPTZ,
    dispute_resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Create account_reviews table
CREATE TABLE IF NOT EXISTS public.account_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES public.account_transactions(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(transaction_id, reviewer_id)
);

-- Create account_reports table for reporting suspicious listings
CREATE TABLE IF NOT EXISTS public.account_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    listing_id UUID NOT NULL REFERENCES public.account_listings(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('fake', 'scam', 'inappropriate', 'stolen', 'other')),
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'resolved', 'dismissed')),
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_account_listings_seller ON public.account_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_account_listings_status ON public.account_listings(status);
CREATE INDEX IF NOT EXISTS idx_account_listings_price ON public.account_listings(price);
CREATE INDEX IF NOT EXISTS idx_account_listings_created_at ON public.account_listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_account_listings_featured ON public.account_listings(featured) WHERE featured = true;

CREATE INDEX IF NOT EXISTS idx_account_transactions_listing ON public.account_transactions(listing_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_buyer ON public.account_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_seller ON public.account_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_status ON public.account_transactions(status);

CREATE INDEX IF NOT EXISTS idx_account_reviews_transaction ON public.account_reviews(transaction_id);
CREATE INDEX IF NOT EXISTS idx_account_reviews_reviewee ON public.account_reviews(reviewee_id);

CREATE INDEX IF NOT EXISTS idx_account_reports_listing ON public.account_reports(listing_id);
CREATE INDEX IF NOT EXISTS idx_account_reports_status ON public.account_reports(status);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_account_listing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.status = 'sold' AND OLD.status != 'sold' THEN
        NEW.sold_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for account_listings
CREATE TRIGGER trigger_update_account_listing_updated_at
    BEFORE UPDATE ON public.account_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_account_listing_updated_at();

-- Create function to update transaction timestamp
CREATE OR REPLACE FUNCTION update_account_transaction_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
        NEW.completed_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for account_transactions
CREATE TRIGGER trigger_update_account_transaction_updated_at
    BEFORE UPDATE ON public.account_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_account_transaction_updated_at();

-- Enable RLS
ALTER TABLE public.account_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for account_listings
-- Everyone can view available listings
CREATE POLICY "Everyone can view available account listings"
    ON public.account_listings FOR SELECT
    TO authenticated
    USING (status = 'available' OR seller_id = auth.uid());

-- Users can create their own listings
CREATE POLICY "Users can create their own account listings"
    ON public.account_listings FOR INSERT
    TO authenticated
    WITH CHECK (seller_id = auth.uid());

-- Users can update their own listings
CREATE POLICY "Users can update their own account listings"
    ON public.account_listings FOR UPDATE
    TO authenticated
    USING (seller_id = auth.uid())
    WITH CHECK (seller_id = auth.uid());

-- Users can delete their own listings
CREATE POLICY "Users can delete their own account listings"
    ON public.account_listings FOR DELETE
    TO authenticated
    USING (seller_id = auth.uid());

-- Admins can manage all listings
CREATE POLICY "Admins can manage all account listings"
    ON public.account_listings FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    );

-- RLS Policies for account_transactions
-- Users can view transactions they're involved in
CREATE POLICY "Users can view their own account transactions"
    ON public.account_transactions FOR SELECT
    TO authenticated
    USING (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Users can create transactions as buyers
CREATE POLICY "Users can create account transactions as buyers"
    ON public.account_transactions FOR INSERT
    TO authenticated
    WITH CHECK (buyer_id = auth.uid());

-- Users can update their own transactions
CREATE POLICY "Users can update their own account transactions"
    ON public.account_transactions FOR UPDATE
    TO authenticated
    USING (buyer_id = auth.uid() OR seller_id = auth.uid())
    WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid());

-- Admins can view and manage all transactions
CREATE POLICY "Admins can manage all account transactions"
    ON public.account_transactions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    );

-- RLS Policies for account_reviews
-- Everyone can view reviews
CREATE POLICY "Everyone can view account reviews"
    ON public.account_reviews FOR SELECT
    TO authenticated
    USING (true);

-- Users can create reviews for transactions they're involved in
CREATE POLICY "Users can create account reviews for their transactions"
    ON public.account_reviews FOR INSERT
    TO authenticated
    WITH CHECK (reviewer_id = auth.uid());

-- RLS Policies for account_reports
-- Users can view their own reports
CREATE POLICY "Users can view their own account reports"
    ON public.account_reports FOR SELECT
    TO authenticated
    USING (reporter_id = auth.uid());

-- Users can create reports
CREATE POLICY "Users can create account reports"
    ON public.account_reports FOR INSERT
    TO authenticated
    WITH CHECK (reporter_id = auth.uid());

-- Admins can view and manage all reports
CREATE POLICY "Admins can manage all account reports"
    ON public.account_reports FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    );

-- Add marketplace settings to app_settings table
INSERT INTO public.app_settings (key, value, description)
VALUES 
    ('marketplace_enabled', 'true', 'Enable CODM accounts marketplace'),
    ('marketplace_commission', '5', 'Commission percentage for marketplace sales'),
    ('marketplace_min_price', '1000', 'Minimum price for account listings in Naira'),
    ('marketplace_max_price', '1000000', 'Maximum price for account listings in Naira')
ON CONFLICT (key) DO NOTHING;

-- Create view for seller statistics
CREATE OR REPLACE VIEW seller_statistics AS
SELECT
    seller_id,
    COUNT(*) as total_listings,
    SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) as total_sold,
    SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as active_listings,
    AVG(CASE WHEN status = 'sold' THEN price ELSE NULL END) as avg_sale_price,
    SUM(CASE WHEN status = 'sold' THEN price ELSE 0 END) as total_revenue
FROM account_listings
GROUP BY seller_id;

-- Grant access to the view
GRANT SELECT ON seller_statistics TO authenticated;

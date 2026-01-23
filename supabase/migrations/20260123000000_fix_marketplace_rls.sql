-- Fix RLS for account_listings to allow buyers to view purchased items

DROP POLICY IF EXISTS "Everyone can view available account listings" ON public.account_listings;

CREATE POLICY "Everyone can view available or purchased account listings"
    ON public.account_listings FOR SELECT
    TO authenticated
    USING (
        status = 'available' 
        OR seller_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.account_transactions 
            WHERE account_transactions.listing_id = public.account_listings.id 
            AND account_transactions.buyer_id = auth.uid()
        )
    );

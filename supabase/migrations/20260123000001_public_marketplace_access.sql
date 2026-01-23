-- Allow public (anon + authenticated) to view available listings
DROP POLICY IF EXISTS "Everyone can view available or purchased account listings" ON public.account_listings;

CREATE POLICY "Everyone can view available or purchased account listings"
    ON public.account_listings FOR SELECT
    TO public
    USING (
        status = 'available' 
        OR (auth.uid() IS NOT NULL AND seller_id = auth.uid())
        OR (auth.uid() IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.account_transactions 
            WHERE account_transactions.listing_id = public.account_listings.id 
            AND account_transactions.buyer_id = auth.uid()
        ))
    );

-- Allow public to view basic profile info (needed for seller details)
-- We use column-level security for extra safety for the anon role
GRANT SELECT (id, ign, username, avatar_url, role, created_at, grade, tier) ON public.profiles TO anon;

-- Ensure RLS allows the row access
CREATE POLICY "Public can view all profiles basic info"
    ON public.profiles FOR SELECT
    TO anon
    USING (true);
-- Migration: Restrict listing creation to approved sellers

-- Drop old policy if it exists (generic "Users can create...")
DROP POLICY IF EXISTS "Users can create their own account listings" ON public.account_listings;

-- Create new policy
CREATE POLICY "Approved sellers can create account listings"
    ON public.account_listings FOR INSERT
    TO authenticated
    WITH CHECK (
        seller_id = auth.uid() AND
        EXISTS (
            SELECT 1 FROM public.seller_requests 
            WHERE user_id = auth.uid() 
            AND status = 'approved'
        )
    );

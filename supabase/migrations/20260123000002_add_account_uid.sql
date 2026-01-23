-- Add account_uid column to account_listings
ALTER TABLE public.account_listings ADD COLUMN IF NOT EXISTS account_uid TEXT;

-- Update the view to include the new column if necessary (optional, but good practice if views use *)
-- In this case, seller_statistics view doesn't use *, so it's fine.

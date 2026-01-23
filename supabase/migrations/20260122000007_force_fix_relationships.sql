-- Migration: Force Fix Marketplace to Profiles Relationship
-- This ensures the foreign key specifically points to the public.profiles table
-- which is required for PostgREST to perform the join in the marketplace query.

DO $$
DECLARE
    r RECORD;
BEGIN
    -- 1. Identify and drop any existing foreign key constraints on the seller_id column
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'account_listings' 
        AND column_name = 'seller_id' 
        AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.account_listings DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;

    -- 2. Create the correct constraint pointing to public.profiles
    ALTER TABLE public.account_listings
    ADD CONSTRAINT account_listings_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;
END $$;

-- 3. Also fix the account_transactions table relationships if they are broken
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Fix buyer_id
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'account_transactions' 
        AND column_name = 'buyer_id' 
        AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.account_transactions DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;

    ALTER TABLE public.account_transactions
    ADD CONSTRAINT account_transactions_buyer_id_fkey
    FOREIGN KEY (buyer_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;

    -- Fix seller_id
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_name = 'account_transactions' 
        AND column_name = 'seller_id' 
        AND table_schema = 'public'
    ) LOOP
        EXECUTE 'ALTER TABLE public.account_transactions DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;

    ALTER TABLE public.account_transactions
    ADD CONSTRAINT account_transactions_seller_id_fkey
    FOREIGN KEY (seller_id) REFERENCES public.profiles(id)
    ON DELETE CASCADE;
END $$;

-- Nudge the schema cache by doing a small comment update
COMMENT ON TABLE public.account_listings IS 'Table for CODM account marketplace listings';

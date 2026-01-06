DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'account_listings_seller_id_fkey'
    )
    THEN
        ALTER TABLE public.account_listings
        ADD CONSTRAINT account_listings_seller_id_fkey
        FOREIGN KEY (seller_id) REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;
END;
$$;
-- Migration: Add airtime giveaway support
-- This adds airtime as a giveaway reward type

-- Add giveaway_type column to giveaways table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'giveaways' 
        AND column_name = 'giveaway_type'
    ) THEN
        ALTER TABLE public.giveaways 
        ADD COLUMN giveaway_type VARCHAR(50) DEFAULT 'cash' 
        CHECK (giveaway_type IN ('cash', 'airtime'));
    END IF;
END $$;

-- Add airtime_network column for airtime giveaways
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'giveaways' 
        AND column_name = 'airtime_network'
    ) THEN
        ALTER TABLE public.giveaways 
        ADD COLUMN airtime_network VARCHAR(50) 
        CHECK (airtime_network IN ('MTN', 'GLO', 'AIRTEL', '9MOBILE', NULL));
    END IF;
END $$;

-- Add comment for clarity
COMMENT ON COLUMN public.giveaways.giveaway_type IS 'Type of giveaway: cash (wallet balance) or airtime (phone credit)';
COMMENT ON COLUMN public.giveaways.airtime_network IS 'Network provider for airtime giveaways (MTN, GLO, AIRTEL, 9MOBILE). Required only for airtime giveaways.';

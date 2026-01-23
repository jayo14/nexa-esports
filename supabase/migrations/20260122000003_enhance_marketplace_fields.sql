-- Migration: Enhance account_listings with more detailed fields
-- Adds support for specific assets, price type, login methods, region, and video

ALTER TABLE public.account_listings 
ADD COLUMN IF NOT EXISTS game VARCHAR(100) DEFAULT 'Call Of Duty Mobile',
ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS assets JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS login_methods JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS region VARCHAR(100),
ADD COLUMN IF NOT EXISTS refund_policy BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create bucket for marketplace videos if it doesn't exist
-- Note: Bucket creation is usually done via RPC or Console, but we can set up policies.
-- We'll assume the bucket 'marketplace-assets' is created.

-- Add policies for marketplace-assets bucket (if we were using SQL to manage storage)
-- For now, we'll just ensure the table columns are ready.

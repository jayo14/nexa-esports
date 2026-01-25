-- Add native push support columns
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS token TEXT,
ADD COLUMN IF NOT EXISTS platform TEXT;

-- Make web push columns nullable for native subscriptions
ALTER TABLE public.push_subscriptions 
ALTER COLUMN endpoint DROP NOT NULL,
ALTER COLUMN p256dh_key DROP NOT NULL,
ALTER COLUMN auth_key DROP NOT NULL;

-- Update RLS if needed (already broad enough)

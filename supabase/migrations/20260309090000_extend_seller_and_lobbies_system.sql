-- Extend seller workflow and add lobbies system

-- 1) Seller profiles table for richer seller onboarding data
CREATE TABLE IF NOT EXISTS public.seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  tiktok TEXT,
  twitter TEXT,
  instagram TEXT,
  description TEXT,
  seller_status TEXT NOT NULL DEFAULT 

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
  seller_status TEXT NOT NULL DEFAULT 'pending' CHECK (seller_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.seller_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own seller profile" ON public.seller_profiles;
CREATE POLICY "Users can view own seller profile"
  ON public.seller_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'clan_master')
    )
  );

DROP POLICY IF EXISTS "Users can insert own seller profile" ON public.seller_profiles;
CREATE POLICY "Users can insert own seller profile"
  ON public.seller_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own seller profile" ON public.seller_profiles;
CREATE POLICY "Users can update own seller profile"
  ON public.seller_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'clan_master')
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'clan_master')
    )
  );

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.set_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seller_profiles_set_updated_at ON public.seller_profiles;
CREATE TRIGGER seller_profiles_set_updated_at
BEFORE UPDATE ON public.seller_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_column();

-- 2) Sync seller request decisions into seller_profiles + profile role
CREATE OR REPLACE FUNCTION public.sync_seller_request_state()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.seller_profiles (user_id, full_name, whatsapp_number, seller_status)
  VALUES (
    NEW.user_id,
    COALESCE((SELECT ign FROM public.profiles WHERE id = NEW.user_id), 'Seller Applicant'),
    'Pending update',
    NEW.status
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    seller_status = EXCLUDED.seller_status,
    updated_at = NOW();

  IF NEW.status = 'approved' THEN
    UPDATE public.profiles
    SET role = 'seller'
    WHERE id = NEW.user_id
      AND role NOT IN ('admin', 'clan_master');
  ELSIF NEW.status = 'rejected' THEN
    UPDATE public.profiles
    SET role = 'buyer'
    WHERE id = NEW.user_id
      AND role NOT IN ('admin', 'clan_master');
  ELSIF NEW.status = 'pending' THEN
    UPDATE public.profiles
    SET role = 'buyer'
    WHERE id = NEW.user_id
      AND role NOT IN ('admin', 'clan_master', 'seller');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_seller_request_state_trigger ON public.seller_requests;
CREATE TRIGGER sync_seller_request_state_trigger
AFTER INSERT OR UPDATE OF status ON public.seller_requests
FOR EACH ROW
EXECUTE FUNCTION public.sync_seller_request_state();

-- 3) Lobbies table for marketplace/clan room links
CREATE TABLE IF NOT EXISTS public.lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  room_link TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lobbies_expires_at ON public.lobbies (expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_lobbies_creator_id ON public.lobbies (creator_id);

ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view lobbies" ON public.lobbies;
CREATE POLICY "Authenticated users can view lobbies"
  ON public.lobbies
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can create own lobbies" ON public.lobbies;
CREATE POLICY "Users can create own lobbies"
  ON public.lobbies
  FOR INSERT
  TO authenticated
  WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "Users can manage own lobbies" ON public.lobbies;
CREATE POLICY "Users can manage own lobbies"
  ON public.lobbies
  FOR UPDATE
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'clan_master')
    )
  )
  WITH CHECK (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'clan_master')
    )
  );

DROP POLICY IF EXISTS "Users can delete own lobbies" ON public.lobbies;
CREATE POLICY "Users can delete own lobbies"
  ON public.lobbies
  FOR DELETE
  TO authenticated
  USING (
    creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'clan_master')
    )
  );

-- 4) Account listing workflow fields
ALTER TABLE public.account_listings
  ADD COLUMN IF NOT EXISTS price_type TEXT NOT NULL DEFAULT 'non_negotiable' CHECK (price_type IN ('negotiable', 'non_negotiable')),
  ADD COLUMN IF NOT EXISTS listing_status TEXT NOT NULL DEFAULT 'pending_review' CHECK (listing_status IN ('pending_review', 'approved', 'rejected'));

CREATE OR REPLACE FUNCTION public.sync_account_listing_statuses()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- listing_status -> status
  IF NEW.listing_status IS DISTINCT FROM OLD.listing_status THEN
    IF NEW.listing_status = 'pending_review' THEN
      NEW.status := 'under_review';
    ELSIF NEW.listing_status = 'approved' THEN
      NEW.status := 'available';
    ELSIF NEW.listing_status = 'rejected' THEN
      NEW.status := 'rejected';
    END IF;
  END IF;

  -- status -> listing_status
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'under_review' THEN
      NEW.listing_status := 'pending_review';
    ELSIF NEW.status = 'available' THEN
      NEW.listing_status := 'approved';
    ELSIF NEW.status = 'rejected' THEN
      NEW.listing_status := 'rejected';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS account_listings_sync_status_trigger ON public.account_listings;
CREATE TRIGGER account_listings_sync_status_trigger
BEFORE UPDATE ON public.account_listings
FOR EACH ROW
EXECUTE FUNCTION public.sync_account_listing_statuses();

UPDATE public.account_listings
SET listing_status = CASE
  WHEN status = 'under_review' THEN 'pending_review'
  WHEN status = 'available' THEN 'approved'
  WHEN status = 'rejected' THEN 'rejected'
  ELSE listing_status
END;

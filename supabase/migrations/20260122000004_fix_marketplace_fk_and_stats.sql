-- Migration: Fix Marketplace Foreign Key and Update Admin Stats View

-- 1. Fix account_listings seller_id relationship to profiles
ALTER TABLE public.account_listings 
DROP CONSTRAINT IF EXISTS account_listings_seller_id_fkey;

ALTER TABLE public.account_listings
ADD CONSTRAINT account_listings_seller_id_fkey
FOREIGN KEY (seller_id) REFERENCES public.profiles(id)
ON DELETE CASCADE;

-- 2. Update admin_dashboard_stats view to be consistent
DROP VIEW IF EXISTS public.admin_dashboard_stats;

CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM public.profiles) as total_players,
  (SELECT COUNT(*) FROM public.profiles WHERE is_banned = true) as banned_players,
  (SELECT COUNT(*) FROM public.events) as total_events,
  (SELECT COALESCE(SUM(kills), 0) FROM public.profiles) as total_kills,
  (SELECT COALESCE(SUM(br_kills), 0) FROM public.profiles) as total_br_kills,
  (SELECT COALESCE(SUM(mp_kills), 0) FROM public.profiles) as total_mp_kills,
  (SELECT COALESCE(AVG(attendance), 0) FROM public.profiles WHERE role = 'player') as avg_attendance,
  (SELECT COUNT(*) FROM public.weapon_layouts) as total_loadouts;

-- Grant select permissions
GRANT SELECT ON public.admin_dashboard_stats TO authenticated;

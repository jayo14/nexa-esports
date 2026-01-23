-- Migration: Refine Admin Stats View for clarity and consistency
-- This migration updates the admin_dashboard_stats view to provide a clearer breakdown
-- of user counts, aligning with the user's request for figures to tally logically.

DROP VIEW IF EXISTS public.admin_dashboard_stats;

CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM public.profiles) as total_members,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'player') as total_players,
  (SELECT COUNT(*) FROM public.profiles WHERE is_banned = true) as banned_players,
  (SELECT COUNT(*) FROM public.profiles WHERE is_banned = false AND role = 'player') as active_players,
  (SELECT COUNT(*) FROM public.events) as total_events,
  (SELECT COALESCE(SUM(kills), 0) FROM public.profiles) as total_kills,
  (SELECT COALESCE(SUM(br_kills), 0) FROM public.profiles) as total_br_kills,
  (SELECT COALESCE(SUM(mp_kills), 0) FROM public.profiles) as total_mp_kills,
  (SELECT COALESCE(AVG(attendance), 0) FROM public.profiles WHERE role = 'player') as avg_attendance,
  (SELECT COUNT(*) FROM public.weapon_layouts) as total_loadouts;

-- Grant select permissions
GRANT SELECT ON public.admin_dashboard_stats TO authenticated;
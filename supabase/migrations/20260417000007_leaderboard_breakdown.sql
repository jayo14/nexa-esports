-- Update Leaderboard Views to include breakdown
DROP VIEW IF EXISTS public.season_team_leaderboard CASCADE;

CREATE OR REPLACE VIEW public.season_team_leaderboard AS
SELECT
  md.season_id,
  lr.team_id,
  t.name AS team_name,
  t.tag AS team_tag,
  t.logo_url,
  SUM(lr.total_pts) AS season_points,
  SUM(lr.kills) AS season_kills,
  SUM(lr.kill_pts) AS season_kill_pts,
  SUM(lr.placement_pts) AS season_placement_pts,
  COUNT(DISTINCT md.id) AS match_days_played,
  RANK() OVER (PARTITION BY md.season_id ORDER BY SUM(lr.total_pts) DESC) AS rank
FROM public.lobby_results lr
JOIN public.lobbies l ON l.id = lr.lobby_id
JOIN public.match_days md ON md.id = l.match_day_id
JOIN public.teams t ON t.id = lr.team_id
GROUP BY md.season_id, lr.team_id, t.name, t.tag, t.logo_url;

-- Lobby-level team scores
CREATE OR REPLACE VIEW public.lobby_team_scores AS
SELECT
  lr.lobby_id,
  l.match_day_id,
  lr.team_id,
  t.name AS team_name,
  t.tag AS team_tag,
  t.logo_url,
  SUM(lr.kills) AS total_kills,
  SUM(lr.kill_points) AS total_kill_points,
  SUM(lr.placement_points) AS total_placement_points,
  SUM(lr.total_points) AS total_points
FROM public.lobby_results lr
JOIN public.teams t ON t.id = lr.team_id
JOIN public.lobbies l ON l.id = lr.lobby_id
GROUP BY lr.lobby_id, l.match_day_id, lr.team_id, t.name, t.tag, t.logo_url;

-- Match day team scores (sum of all lobbies)
CREATE OR REPLACE VIEW public.match_day_team_scores AS
SELECT
  lts.match_day_id,
  md.name AS match_day_name,
  md.date AS match_date,
  md.season_id,
  lts.team_id,
  lts.team_name,
  lts.team_tag,
  lts.logo_url,
  SUM(lts.total_kills) AS total_kills,
  SUM(lts.total_kill_points) AS total_kill_points,
  SUM(lts.total_placement_points) AS total_placement_points,
  SUM(lts.total_points) AS total_points
FROM public.lobby_team_scores lts
JOIN public.match_days md ON md.id = lts.match_day_id
GROUP BY lts.match_day_id, md.name, md.date, md.season_id, lts.team_id, lts.team_name, lts.team_tag, lts.logo_url;

-- Seasonal leaderboard (all match days accumulated per season)
CREATE OR REPLACE VIEW public.season_team_leaderboard AS
SELECT
  mdts.season_id,
  s.name AS season_name,
  mdts.team_id,
  mdts.team_name,
  mdts.team_tag,
  mdts.logo_url,
  SUM(mdts.total_kills) AS season_kills,
  SUM(mdts.total_points) AS season_points,
  RANK() OVER (PARTITION BY mdts.season_id ORDER BY SUM(mdts.total_points) DESC) AS rank
FROM public.match_day_team_scores mdts
JOIN public.seasons s ON s.id = mdts.season_id
GROUP BY mdts.season_id, s.name, mdts.team_id, mdts.team_name, mdts.team_tag, mdts.logo_url;

-- Individual player season stats (for kill leaderboard + MVP)
CREATE OR REPLACE VIEW public.season_player_stats AS
SELECT
  md.season_id,
  lr.user_id,
  lr.team_id,
  t.name AS team_name,
  p.username,
  p.ign,
  p.avatar_url,
  SUM(lr.kills) AS total_kills,
  SUM(lr.kill_points) AS total_kill_points,
  SUM(lr.placement_points) AS total_placement_points,
  SUM(lr.total_points) AS total_points,
  COUNT(DISTINCT lr.lobby_id) AS lobbies_played,
  RANK() OVER (PARTITION BY md.season_id ORDER BY SUM(lr.total_points) DESC) AS rank
FROM public.lobby_results lr
JOIN public.match_days md ON md.id = (SELECT match_day_id FROM public.lobbies WHERE id = lr.lobby_id)
JOIN public.profiles p ON p.id = lr.user_id
JOIN public.teams t ON t.id = lr.team_id
GROUP BY md.season_id, lr.user_id, lr.team_id, t.name, p.username, p.ign, p.avatar_url;

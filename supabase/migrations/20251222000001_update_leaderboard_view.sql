create or replace view public.leaderboard as
select 
  id,
  username,
  ign,
  avatar_url,
  tier,
  grade,
  status,
  br_kills,
  mp_kills,
  kills as total_kills,
  is_banned
from public.profiles;

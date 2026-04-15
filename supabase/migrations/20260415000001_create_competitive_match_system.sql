-- ══════════════════════════════════════════════════════
-- COMPETITIVE MATCH SYSTEM
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.match_days (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id     UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  match_date    DATE NOT NULL,
  is_finalized  BOOLEAN NOT NULL DEFAULT FALSE,
  created_by    UUID NOT NULL REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lobbies (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_day_id   UUID NOT NULL REFERENCES public.match_days(id) ON DELETE CASCADE,
  lobby_number   INTEGER NOT NULL CHECK (lobby_number BETWEEN 1 AND 10),
  recording_url  TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_day_id, lobby_number)
);

CREATE TABLE IF NOT EXISTS public.lobby_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id      UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id       UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  kills         INTEGER NOT NULL DEFAULT 0 CHECK (kills >= 0),
  placement     INTEGER NOT NULL CHECK (placement > 0),
  placement_pts INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN placement BETWEEN 1  AND 3  THEN 10
      WHEN placement BETWEEN 4  AND 7  THEN 7
      WHEN placement BETWEEN 8  AND 15 THEN 5
      ELSE 3
    END
  ) STORED,
  kill_pts      INTEGER GENERATED ALWAYS AS (kills * 2) STORED,
  total_pts     INTEGER GENERATED ALWAYS AS (
    (kills * 2) + CASE
      WHEN placement BETWEEN 1  AND 3  THEN 10
      WHEN placement BETWEEN 4  AND 7  THEN 7
      WHEN placement BETWEEN 8  AND 15 THEN 5
      ELSE 3
    END
  ) STORED,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lobby_id, user_id)
);

-- Normalize legacy schemas if these tables existed before this migration
DO $$
BEGIN
  -- match_days legacy compatibility
  ALTER TABLE public.match_days ADD COLUMN IF NOT EXISTS season_id UUID;
  ALTER TABLE public.match_days ADD COLUMN IF NOT EXISTS name TEXT;
  ALTER TABLE public.match_days ADD COLUMN IF NOT EXISTS match_date DATE;
  ALTER TABLE public.match_days ADD COLUMN IF NOT EXISTS is_finalized BOOLEAN NOT NULL DEFAULT FALSE;
  ALTER TABLE public.match_days ADD COLUMN IF NOT EXISTS created_by UUID;
  ALTER TABLE public.match_days ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  ALTER TABLE public.match_days ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'match_days'
      AND column_name = 'date'
  ) THEN
    EXECUTE 'UPDATE public.match_days SET match_date = COALESCE(match_date, date)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'match_days'
      AND column_name = 'status'
  ) THEN
    EXECUTE $sql$
      UPDATE public.match_days
      SET is_finalized = CASE
        WHEN lower(status::text) IN ('completed', 'finalized') THEN TRUE
        ELSE COALESCE(is_finalized, FALSE)
      END
    $sql$;
  END IF;

  -- lobbies legacy compatibility (older marketplace lobby table)
  ALTER TABLE public.lobbies ADD COLUMN IF NOT EXISTS match_day_id UUID;
  ALTER TABLE public.lobbies ADD COLUMN IF NOT EXISTS lobby_number INTEGER;
  ALTER TABLE public.lobbies ADD COLUMN IF NOT EXISTS recording_url TEXT;
  ALTER TABLE public.lobbies ADD COLUMN IF NOT EXISTS notes TEXT;
  ALTER TABLE public.lobbies ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'lobbies'
      AND column_name = 'room_link'
  ) THEN
    EXECUTE 'UPDATE public.lobbies SET recording_url = COALESCE(recording_url, room_link)';
  END IF;

  -- lobby_results compatibility
  ALTER TABLE public.lobby_results ADD COLUMN IF NOT EXISTS lobby_id UUID;
  ALTER TABLE public.lobby_results ADD COLUMN IF NOT EXISTS user_id UUID;
  ALTER TABLE public.lobby_results ADD COLUMN IF NOT EXISTS team_id UUID;
  ALTER TABLE public.lobby_results ADD COLUMN IF NOT EXISTS kills INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE public.lobby_results ADD COLUMN IF NOT EXISTS placement INTEGER;
  ALTER TABLE public.lobby_results ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  ALTER TABLE public.lobby_results ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
END
$$;

-- Ensure computed columns exist for scoring
ALTER TABLE public.lobby_results
  ADD COLUMN IF NOT EXISTS placement_pts INTEGER GENERATED ALWAYS AS (
    CASE
      WHEN placement BETWEEN 1  AND 3  THEN 10
      WHEN placement BETWEEN 4  AND 7  THEN 7
      WHEN placement BETWEEN 8  AND 15 THEN 5
      ELSE 3
    END
  ) STORED;

ALTER TABLE public.lobby_results
  ADD COLUMN IF NOT EXISTS kill_pts INTEGER GENERATED ALWAYS AS (kills * 2) STORED;

ALTER TABLE public.lobby_results
  ADD COLUMN IF NOT EXISTS total_pts INTEGER GENERATED ALWAYS AS (
    (kills * 2) + CASE
      WHEN placement BETWEEN 1  AND 3  THEN 10
      WHEN placement BETWEEN 4  AND 7  THEN 7
      WHEN placement BETWEEN 8  AND 15 THEN 5
      ELSE 3
    END
  ) STORED;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lobbies_match_day_lobby_unique'
      AND conrelid = 'public.lobbies'::regclass
  ) THEN
    ALTER TABLE public.lobbies
      ADD CONSTRAINT lobbies_match_day_lobby_unique UNIQUE (match_day_id, lobby_number);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'lobby_results_lobby_user_unique'
      AND conrelid = 'public.lobby_results'::regclass
  ) THEN
    ALTER TABLE public.lobby_results
      ADD CONSTRAINT lobby_results_lobby_user_unique UNIQUE (lobby_id, user_id);
  END IF;
END
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'match_days' AND column_name = 'season_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_match_days_season ON public.match_days(season_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lobbies' AND column_name = 'match_day_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_lobbies_match_day ON public.lobbies(match_day_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lobby_results' AND column_name = 'lobby_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_lobby_results_lobby ON public.lobby_results(lobby_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lobby_results' AND column_name = 'team_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_lobby_results_team ON public.lobby_results(team_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lobby_results' AND column_name = 'user_id'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_lobby_results_user ON public.lobby_results(user_id);
  END IF;
END
$$;

ALTER TABLE public.match_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_days_select" ON public.match_days;
DROP POLICY IF EXISTS "match_days_insert" ON public.match_days;
DROP POLICY IF EXISTS "match_days_update" ON public.match_days;
DROP POLICY IF EXISTS "match_days_delete" ON public.match_days;
DROP POLICY IF EXISTS "lobbies_select" ON public.lobbies;
DROP POLICY IF EXISTS "lobbies_write" ON public.lobbies;
DROP POLICY IF EXISTS "lobby_results_select" ON public.lobby_results;
DROP POLICY IF EXISTS "lobby_results_write" ON public.lobby_results;

CREATE POLICY "match_days_select"
ON public.match_days FOR SELECT TO authenticated USING (true);

CREATE POLICY "match_days_insert"
ON public.match_days FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'clan_master')
  )
);

CREATE POLICY "match_days_update"
ON public.match_days FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'clan_master')
  )
);

CREATE POLICY "match_days_delete"
ON public.match_days FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'clan_master')
  )
);

CREATE POLICY "lobbies_select"
ON public.lobbies FOR SELECT TO authenticated USING (true);

CREATE POLICY "lobbies_write"
ON public.lobbies FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'clan_master')
  )
);

CREATE POLICY "lobby_results_select"
ON public.lobby_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "lobby_results_write"
ON public.lobby_results FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'clan_master')
  )
);

CREATE OR REPLACE VIEW public.match_day_team_scores AS
SELECT
  md.id AS match_day_id,
  md.season_id,
  md.name AS match_day_name,
  md.match_date,
  lr.team_id,
  t.name AS team_name,
  t.tag AS team_tag,
  SUM(lr.total_pts) AS team_total_pts,
  SUM(lr.kills) AS team_total_kills,
  SUM(lr.kill_pts) AS team_kill_pts,
  SUM(lr.placement_pts) AS team_placement_pts,
  COUNT(DISTINCT lr.user_id) AS player_count,
  RANK() OVER (PARTITION BY md.id ORDER BY SUM(lr.total_pts) DESC) AS match_day_rank
FROM public.lobby_results lr
JOIN public.lobbies l ON l.id = lr.lobby_id
JOIN public.match_days md ON md.id = l.match_day_id
JOIN public.teams t ON t.id = lr.team_id
GROUP BY md.id, md.season_id, md.name, md.match_date, lr.team_id, t.name, t.tag;

CREATE OR REPLACE VIEW public.season_team_leaderboard AS
SELECT
  md.season_id,
  lr.team_id,
  t.name AS team_name,
  t.tag AS team_tag,
  t.logo_url,
  SUM(lr.total_pts) AS season_points,
  SUM(lr.kills) AS season_kills,
  COUNT(DISTINCT md.id) AS match_days_played,
  RANK() OVER (PARTITION BY md.season_id ORDER BY SUM(lr.total_pts) DESC) AS rank
FROM public.lobby_results lr
JOIN public.lobbies l ON l.id = lr.lobby_id
JOIN public.match_days md ON md.id = l.match_day_id
JOIN public.teams t ON t.id = lr.team_id
GROUP BY md.season_id, lr.team_id, t.name, t.tag, t.logo_url;

CREATE OR REPLACE VIEW public.season_player_stats AS
SELECT
  md.season_id,
  lr.user_id,
  p.username,
  p.ign,
  p.avatar_url,
  lr.team_id,
  t.name AS team_name,
  SUM(lr.total_pts) AS season_points,
  SUM(lr.kills) AS season_kills,
  COUNT(DISTINCT l.id) AS lobbies_played,
  RANK() OVER (PARTITION BY md.season_id ORDER BY SUM(lr.total_pts) DESC) AS rank
FROM public.lobby_results lr
JOIN public.lobbies l ON l.id = lr.lobby_id
JOIN public.match_days md ON md.id = l.match_day_id
JOIN public.profiles p ON p.id = lr.user_id
LEFT JOIN public.teams t ON t.id = lr.team_id
GROUP BY md.season_id, lr.user_id, p.username, p.ign, p.avatar_url, lr.team_id, t.name;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'match_days'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_days;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'lobby_results'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lobby_results;
  END IF;
END
$$;

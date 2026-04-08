-- Teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  tag TEXT NOT NULL UNIQUE CHECK (char_length(tag) <= 6),
  logo_url TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Team members join table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('captain', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id) -- A player can only belong to one team at a time
);

-- Seasons table
CREATE TABLE public.seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Match Days
CREATE TABLE public.match_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Lobbies (3–4 per match day)
CREATE TABLE public.lobbies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_day_id UUID NOT NULL REFERENCES public.match_days(id) ON DELETE CASCADE,
  lobby_number INT NOT NULL CHECK (lobby_number BETWEEN 1 AND 4),
  recording_url TEXT,
  recording_label TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'verified')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(match_day_id, lobby_number)
);

-- Lobby results per team member (admin submits kills + placement per player per lobby)
CREATE TABLE public.lobby_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id UUID NOT NULL REFERENCES public.lobbies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  kills INT NOT NULL DEFAULT 0 CHECK (kills >= 0),
  placement INT NOT NULL CHECK (placement >= 1),
  kill_points INT GENERATED ALWAYS AS (kills * 2) STORED,
  placement_points INT GENERATED ALWAYS AS (
    CASE
      WHEN placement <= 3  THEN 10
      WHEN placement <= 7  THEN 7
      WHEN placement <= 15 THEN 5
      ELSE 3
    END
  ) STORED,
  total_points INT GENERATED ALWAYS AS (
    (kills * 2) + (
      CASE
        WHEN placement <= 3  THEN 10
        WHEN placement <= 7  THEN 7
        WHEN placement <= 15 THEN 5
        ELSE 3
      END
    )
  ) STORED,
  submitted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lobby_id, user_id)
);

-- RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobby_results ENABLE ROW LEVEL SECURITY;

-- Teams: everyone reads, authenticated creates, captain/admin updates
CREATE POLICY "teams_select" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "teams_insert" ON public.teams FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "teams_update" ON public.teams FOR UPDATE TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = id AND tm.user_id = auth.uid() AND tm.role = 'captain')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master'))
  );
CREATE POLICY "teams_delete" ON public.teams FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master')));

-- Team members: everyone reads, user inserts self, captain/admin deletes
CREATE POLICY "team_members_select" ON public.team_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_members_insert" ON public.team_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "team_members_delete" ON public.team_members FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_id AND tm.user_id = auth.uid() AND tm.role = 'captain')
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master'))
  );

-- Seasons + match_days + lobbies: all authenticated users read, only admin/clan_master write
CREATE POLICY "seasons_select" ON public.seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "seasons_write" ON public.seasons FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master')));

CREATE POLICY "match_days_select" ON public.match_days FOR SELECT TO authenticated USING (true);
CREATE POLICY "match_days_write" ON public.match_days FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master')));

CREATE POLICY "lobbies_select" ON public.lobbies FOR SELECT TO authenticated USING (true);
CREATE POLICY "lobbies_write" ON public.lobbies FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master')));

CREATE POLICY "lobby_results_select" ON public.lobby_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "lobby_results_write" ON public.lobby_results FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','clan_master')));

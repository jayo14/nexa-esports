-- Migration: Create Clan Seasons System
-- This adds seasonal structure to clan system with season tracking

-- Create seasons table
CREATE TABLE IF NOT EXISTS public.seasons (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_number INTEGER NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT false,
    description TEXT,
    rewards JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    CONSTRAINT valid_dates CHECK (end_date > start_date),
    CONSTRAINT one_active_season CHECK (
        NOT is_active OR NOT EXISTS (
            SELECT 1 FROM seasons s2 
            WHERE s2.is_active = true 
            AND s2.id != seasons.id
        )
    )
);

-- Create season_stats table to track player performance per season
CREATE TABLE IF NOT EXISTS public.season_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    total_kills INTEGER DEFAULT 0,
    br_kills INTEGER DEFAULT 0,
    mp_kills INTEGER DEFAULT 0,
    attendance_days INTEGER DEFAULT 0,
    events_participated INTEGER DEFAULT 0,
    tournaments_won INTEGER DEFAULT 0,
    rank INTEGER,
    season_points INTEGER DEFAULT 0,
    achievements JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, user_id)
);

-- Create season_events junction table
CREATE TABLE IF NOT EXISTS public.season_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(season_id, event_id)
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_seasons_active ON public.seasons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_seasons_dates ON public.seasons(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_season_stats_season_user ON public.season_stats(season_id, user_id);
CREATE INDEX IF NOT EXISTS idx_season_stats_season_rank ON public.season_stats(season_id, rank);
CREATE INDEX IF NOT EXISTS idx_season_events_season ON public.season_events(season_id);
CREATE INDEX IF NOT EXISTS idx_season_events_event ON public.season_events(event_id);

-- Create function to update season stats
CREATE OR REPLACE FUNCTION update_season_stats()
RETURNS TRIGGER AS $$
DECLARE
    current_season_id UUID;
BEGIN
    -- Get current active season
    SELECT id INTO current_season_id 
    FROM seasons 
    WHERE is_active = true 
    LIMIT 1;

    IF current_season_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Update or insert season stats based on the trigger
    IF TG_TABLE_NAME = 'profiles' THEN
        -- Update kills from profiles table
        INSERT INTO season_stats (season_id, user_id, br_kills, mp_kills, total_kills)
        VALUES (
            current_season_id, 
            NEW.id, 
            COALESCE(NEW.br_kills, 0),
            COALESCE(NEW.mp_kills, 0),
            COALESCE(NEW.br_kills, 0) + COALESCE(NEW.mp_kills, 0)
        )
        ON CONFLICT (season_id, user_id) 
        DO UPDATE SET
            br_kills = EXCLUDED.br_kills,
            mp_kills = EXCLUDED.mp_kills,
            total_kills = EXCLUDED.total_kills,
            updated_at = NOW();
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create function to automatically update season dates
CREATE OR REPLACE FUNCTION check_season_dates()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    
    -- Automatically deactivate season if end date has passed
    IF NEW.end_date < NOW() AND NEW.is_active = true THEN
        NEW.is_active = false;
    END IF;
    
    -- Automatically activate season if within date range and no other active season
    IF NEW.start_date <= NOW() 
       AND NEW.end_date > NOW() 
       AND NEW.is_active = false 
       AND NOT EXISTS (
           SELECT 1 FROM seasons 
           WHERE is_active = true 
           AND id != NEW.id
       ) THEN
        NEW.is_active = true;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_check_season_dates
    BEFORE INSERT OR UPDATE ON public.seasons
    FOR EACH ROW
    EXECUTE FUNCTION check_season_dates();

-- Enable RLS
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.season_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for seasons table
CREATE POLICY "Everyone can view seasons"
    ON public.seasons FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage seasons"
    ON public.seasons FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    );

-- RLS Policies for season_stats table
CREATE POLICY "Everyone can view season stats"
    ON public.season_stats FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can view their own season stats"
    ON public.season_stats FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Admins can manage season stats"
    ON public.season_stats FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    );

-- RLS Policies for season_events table
CREATE POLICY "Everyone can view season events"
    ON public.season_events FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage season events"
    ON public.season_events FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'clan_master')
        )
    );

-- Insert first season as example
INSERT INTO public.seasons (season_number, name, start_date, end_date, is_active, description)
VALUES (
    1,
    'Season 1 - Genesis',
    NOW(),
    NOW() + INTERVAL '3 months',
    true,
    'The inaugural season of NeXa Elite Nexus'
);

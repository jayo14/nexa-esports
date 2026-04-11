import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Season,
  MatchDay,
  Lobby,
  LobbyResult,
  SeasonTeamLeaderboard,
  MatchDayTeamScore,
  SeasonPlayerStats,
} from '@/types/competitive';

export function useCompetitive() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSeasons = useCallback(async () => {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) {
      setSeasons(data as Season[]);
      const active = (data as Season[]).find((s) => s.is_active) || null;
      setActiveSeason(active);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchSeasons();
      setIsLoading(false);
    };
    load();
  }, [fetchSeasons]);

  return {
    seasons,
    activeSeason,
    isLoading,
    fetchSeasons,
  };
}

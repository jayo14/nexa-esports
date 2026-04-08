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
  const [matchDays, setMatchDays] = useState<MatchDay[]>([]);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<SeasonTeamLeaderboard[]>([]);
  const [matchDayTeamScores, setMatchDayTeamScores] = useState<MatchDayTeamScore[]>([]);
  const [playerSeasonStats, setPlayerSeasonStats] = useState<SeasonPlayerStats[]>([]);
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

  const fetchMatchDays = useCallback(async (seasonId?: string) => {
    let query = supabase.from('match_days').select('*').order('date', { ascending: true });
    if (seasonId) query = query.eq('season_id', seasonId);
    const { data, error } = await query;
    if (!error && data) setMatchDays(data as MatchDay[]);
  }, []);

  const fetchSeasonLeaderboard = useCallback(async (seasonId?: string) => {
    let query = supabase
      .from('season_team_leaderboard')
      .select('*')
      .order('rank', { ascending: true });
    if (seasonId) query = query.eq('season_id', seasonId);
    const { data, error } = await query;
    if (!error && data) setSeasonLeaderboard(data as unknown as SeasonTeamLeaderboard[]);
  }, []);

  const fetchMatchDayTeamScores = useCallback(async (seasonId?: string) => {
    let query = supabase
      .from('match_day_team_scores')
      .select('*')
      .order('total_points', { ascending: false });
    if (seasonId) query = query.eq('season_id', seasonId);
    const { data, error } = await query;
    if (!error && data) setMatchDayTeamScores(data as unknown as MatchDayTeamScore[]);
  }, []);

  const fetchPlayerSeasonStats = useCallback(async (seasonId?: string) => {
    let query = supabase
      .from('season_player_stats')
      .select('*')
      .order('rank', { ascending: true });
    if (seasonId) query = query.eq('season_id', seasonId);
    const { data, error } = await query;
    if (!error && data) setPlayerSeasonStats(data as unknown as SeasonPlayerStats[]);
  }, []);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await fetchSeasons();
      setIsLoading(false);
    };
    load();
  }, [fetchSeasons]);

  useEffect(() => {
    if (activeSeason) {
      fetchMatchDays(activeSeason.id);
      fetchSeasonLeaderboard(activeSeason.id);
      fetchMatchDayTeamScores(activeSeason.id);
      fetchPlayerSeasonStats(activeSeason.id);
    }
  }, [activeSeason, fetchMatchDays, fetchSeasonLeaderboard, fetchMatchDayTeamScores, fetchPlayerSeasonStats]);

  const getMatchDayLobbies = async (matchDayId: string): Promise<Lobby[]> => {
    const { data, error } = await supabase
      .from('lobbies')
      .select('*')
      .eq('match_day_id', matchDayId)
      .order('lobby_number', { ascending: true });
    if (error) throw error;
    return (data as Lobby[]) || [];
  };

  const getLobbyResults = async (lobbyId: string): Promise<LobbyResult[]> => {
    const { data, error } = await supabase
      .from('lobby_results')
      .select('*')
      .eq('lobby_id', lobbyId);
    if (error) throw error;
    return (data as LobbyResult[]) || [];
  };

  const refetchForSeason = async (seasonId: string) => {
    await Promise.all([
      fetchMatchDays(seasonId),
      fetchSeasonLeaderboard(seasonId),
      fetchMatchDayTeamScores(seasonId),
      fetchPlayerSeasonStats(seasonId),
    ]);
  };

  return {
    seasons,
    activeSeason,
    matchDays,
    seasonLeaderboard,
    matchDayTeamScores,
    playerSeasonStats,
    isLoading,
    getMatchDayLobbies,
    getLobbyResults,
    fetchSeasons,
    fetchMatchDays,
    refetchForSeason,
  };
}

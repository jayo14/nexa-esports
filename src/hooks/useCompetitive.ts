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

type LobbyResultInput = {
  lobby_id: string;
  user_id: string;
  team_id?: string;
  kills: number;
  placement: number;
};

export function useCompetitive() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [matchDays, setMatchDays] = useState<MatchDay[]>([]);
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [lobbyResults, setLobbyResults] = useState<LobbyResult[]>([]);
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<SeasonTeamLeaderboard[]>([]);
  const [matchDayTeamScores, setMatchDayTeamScores] = useState<MatchDayTeamScore[]>([]);
  const [playerSeasonStats, setPlayerSeasonStats] = useState<SeasonPlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const [
        { data: seasonsData },
        { data: matchDaysData },
        { data: lobbiesData },
        { data: lobbyResultsData },
        { data: seasonLB },
        { data: matchDayScores },
        { data: playerStats },
      ] = await Promise.all([
        supabase.from('seasons').select('*').order('season_number', { ascending: false }),
        supabase.from('match_days').select('*').order('match_date', { ascending: false }),
        supabase.from('lobbies').select('*').order('lobby_number'),
        supabase.from('lobby_results').select('*').order('created_at', { ascending: false }),
        supabase.from('season_team_leaderboard').select('*').order('rank'),
        supabase.from('match_day_team_scores').select('*').order('match_day_rank'),
        supabase.from('season_player_stats').select('*').order('rank'),
      ]);

      const sData = (seasonsData as Season[]) || [];
      setSeasons(sData);
      setActiveSeason(sData.find((s) => s.is_active) || null);
      setMatchDays((matchDaysData as MatchDay[]) || []);
      setLobbies((lobbiesData as Lobby[]) || []);
      setLobbyResults((lobbyResultsData as LobbyResult[]) || []);
      setSeasonLeaderboard((seasonLB as SeasonTeamLeaderboard[]) || []);
      setMatchDayTeamScores(
        (((matchDayScores as MatchDayTeamScore[]) || []).map((row) => ({
          ...row,
          total_points: row.total_points ?? row.team_total_pts,
          total_kills: row.total_kills ?? row.team_total_kills,
        })))
      );
      setPlayerSeasonStats(
        (((playerStats as SeasonPlayerStats[]) || []).map((row) => ({
          ...row,
          total_points: row.total_points ?? row.season_points,
          total_kills: row.total_kills ?? row.season_kills,
        })))
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchSeasons = useCallback(async () => {
    const { data } = await supabase.from('seasons').select('*').order('season_number', { ascending: false });
    const sData = (data as Season[]) || [];
    setSeasons(sData);
    setActiveSeason(sData.find((s) => s.is_active) || null);
  }, []);

  const fetchMatchDays = useCallback(async (seasonId?: string) => {
    let query = supabase.from('match_days').select('*').order('match_date', { ascending: false });
    if (seasonId) query = query.eq('season_id', seasonId);
    const { data } = await query;
    setMatchDays((data as MatchDay[]) || []);
  }, []);

  const fetchLobbies = useCallback(async (matchDayId?: string) => {
    let query = supabase.from('lobbies').select('*').order('lobby_number', { ascending: true });
    if (matchDayId) query = query.eq('match_day_id', matchDayId);
    const { data } = await query;
    setLobbies((data as Lobby[]) || []);
  }, []);

  useEffect(() => {
    fetchAll();
    const channel = supabase
      .channel('competitive-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobby_results' }, () => void fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_days' }, () => void fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lobbies' }, () => void fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  const createMatchDay = async (seasonId: string, name: string, matchDate: string) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) throw new Error('You must be logged in to create a match day.');

    const { data, error } = await supabase
      .from('match_days')
      .insert({
        season_id: seasonId,
        name,
        match_date: matchDate,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchAll();
    return data as MatchDay;
  };

  const createLobby = async (matchDayId: string, lobbyNumber: number, recordingUrl?: string) => {
    const { data, error } = await supabase
      .from('lobbies')
      .insert({
        match_day_id: matchDayId,
        lobby_number: lobbyNumber,
        recording_url: recordingUrl || null,
      })
      .select()
      .single();

    if (error) throw error;
    await fetchAll();
    return data as Lobby;
  };

  const upsertLobbyResult = async (
    lobbyId: string,
    userId: string,
    teamId: string,
    kills: number,
    placement: number,
  ) => {
    const { error } = await supabase
      .from('lobby_results')
      .upsert(
        {
          lobby_id: lobbyId,
          user_id: userId,
          team_id: teamId,
          kills,
          placement,
        },
        { onConflict: 'lobby_id,user_id' }
      );

    if (error) throw error;
    await fetchAll();
  };

  const bulkUpsertLobbyResults = async (results: LobbyResultInput[]) => {
    const payload = results.map((result) => ({
      lobby_id: result.lobby_id,
      user_id: result.user_id,
      team_id: result.team_id || null,
      kills: result.kills,
      placement: result.placement,
    }));

    const { error } = await supabase
      .from('lobby_results')
      .upsert(payload, { onConflict: 'lobby_id,user_id' });

    if (error) throw error;
    await fetchAll();
  };

  const updateLobbyRecording = async (lobbyId: string, recordingUrl: string) => {
    const { error } = await supabase
      .from('lobbies')
      .update({ recording_url: recordingUrl || null })
      .eq('id', lobbyId);

    if (error) throw error;
    await fetchAll();
  };

  return {
    seasons,
    activeSeason,
    matchDays,
    lobbies,
    lobbyResults,
    seasonLeaderboard,
    matchDayTeamScores,
    playerSeasonStats,
    isLoading,
    fetchAll,
    fetchSeasons,
    fetchMatchDays,
    fetchLobbies,
    createMatchDay,
    createLobby,
    upsertLobbyResult,
    bulkUpsertLobbyResults,
    updateLobbyRecording,
  };
}

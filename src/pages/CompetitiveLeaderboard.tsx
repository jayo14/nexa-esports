import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetitive } from '@/hooks/useCompetitive';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Medal, Trophy, Users, Zap, ChevronDown, ChevronUp, PlayCircle } from 'lucide-react';

const PRIMARY = '#ec131e';

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

type TabKey = 'season' | 'match-days' | 'players';

const rankBadgeStyle = (rank: number): React.CSSProperties => {
  if (rank === 1) return { background: '#FFD70022', color: '#FFD700', border: '1px solid #FFD70055' };
  if (rank === 2) return { background: '#C0C0C022', color: '#C0C0C0', border: '1px solid #C0C0C055' };
  if (rank === 3) return { background: '#CD7F3222', color: '#CD7F32', border: '1px solid #CD7F3255' };
  return { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' };
};

const teamTagFallback = (tag?: string) => (tag || 'TM').slice(0, 2).toUpperCase();

export const CompetitiveLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeSeason,
    seasonLeaderboard,
    matchDayTeamScores,
    playerSeasonStats,
    matchDays,
    lobbies,
    isLoading,
  } = useCompetitive();

  const [tab, setTab] = useState<TabKey>('season');
  const [selectedMatchDayId, setSelectedMatchDayId] = useState('');
  const [expandedLobbies, setExpandedLobbies] = useState<Record<string, boolean>>({});

  const seasonId = activeSeason?.id;
  const seasonMatchDays = useMemo(
    () =>
      matchDays
        .filter((day) => day.season_id === seasonId)
        .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()),
    [matchDays, seasonId],
  );

  const seasonTeams = useMemo(
    () => seasonLeaderboard.filter((entry) => entry.season_id === seasonId),
    [seasonLeaderboard, seasonId],
  );

  const seasonPlayers = useMemo(
    () => playerSeasonStats.filter((entry) => entry.season_id === seasonId),
    [playerSeasonStats, seasonId],
  );

  const selectedMatchDayScores = useMemo(
    () =>
      matchDayTeamScores
        .filter((score) => score.match_day_id === selectedMatchDayId)
        .sort((a, b) => a.match_day_rank - b.match_day_rank),
    [matchDayTeamScores, selectedMatchDayId],
  );

  const selectedMatchDayLobbies = useMemo(
    () =>
      lobbies
        .filter((lobby) => lobby.match_day_id === selectedMatchDayId)
        .sort((a, b) => a.lobby_number - b.lobby_number),
    [lobbies, selectedMatchDayId],
  );

  useEffect(() => {
    if (seasonMatchDays.length > 0 && !selectedMatchDayId) {
      setSelectedMatchDayId(seasonMatchDays[0].id);
    }
    if (seasonMatchDays.length === 0) {
      setSelectedMatchDayId('');
    }
  }, [seasonMatchDays, selectedMatchDayId]);

  const toggleLobby = (lobbyId: string) => {
    setExpandedLobbies((prev) => ({ ...prev, [lobbyId]: !prev[lobbyId] }));
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/statistics')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-white tracking-wide" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              COMPETITIVE LEADERBOARD
            </h1>
            {activeSeason && (
              <p className="text-sm font-bold" style={{ color: PRIMARY }}>
                {activeSeason.name}
              </p>
            )}
          </div>
        </div>

        <Tabs value={tab} onValueChange={(value) => setTab(value as TabKey)}>
          <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10">
            <TabsTrigger value="season" className="gap-2"><Trophy className="w-4 h-4" />Season Leaderboard</TabsTrigger>
            <TabsTrigger value="match-days" className="gap-2"><Zap className="w-4 h-4" />Match Days</TabsTrigger>
            <TabsTrigger value="players" className="gap-2"><Users className="w-4 h-4" />Player Stats</TabsTrigger>
          </TabsList>

          <TabsContent value="season" className="mt-6 space-y-3">
            {isLoading ? (
              <Card style={glassCardStyle}><CardContent className="py-12 text-center text-slate-500">Loading season standings...</CardContent></Card>
            ) : seasonTeams.length === 0 ? (
              <Card style={glassCardStyle}>
                <CardContent className="py-12 text-center text-slate-400">
                  No season data yet. Matches will appear here once results are submitted.
                </CardContent>
              </Card>
            ) : (
              seasonTeams.map((team) => (
                <button
                  key={team.team_id}
                  onClick={() => navigate(`/teams/${team.team_id}`)}
                  className="w-full rounded-2xl p-4 flex items-center gap-4 text-left transition-all hover:scale-[1.01]"
                  style={glassCardStyle}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0" style={rankBadgeStyle(team.rank)}>
                    #{team.rank}
                  </div>
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.team_name} className="w-11 h-11 rounded-xl object-cover shrink-0 border border-white/20" />
                  ) : (
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                      style={{ background: `${PRIMARY}22`, color: PRIMARY, fontFamily: 'Orbitron, sans-serif' }}
                    >
                      {teamTagFallback(team.team_tag)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{team.team_name}</p>
                    <p className="text-xs font-bold" style={{ color: PRIMARY }}>[{team.team_tag}]</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-black text-white">{team.season_points}</p>
                    <p className="text-xs text-slate-400">{team.season_kills} kills</p>
                  </div>
                </button>
              ))
            )}
          </TabsContent>

          <TabsContent value="match-days" className="mt-6 space-y-4">
            <Card style={glassCardStyle}>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Match Day</p>
                  <Select value={selectedMatchDayId} onValueChange={setSelectedMatchDayId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select match day" />
                    </SelectTrigger>
                    <SelectContent>
                      {seasonMatchDays.map((day) => (
                        <SelectItem key={day.id} value={day.id}>
                          {day.name} • {new Date(day.match_date).toLocaleDateString()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedMatchDayId && selectedMatchDayScores.length > 0 ? (
                  <div className="space-y-2">
                    {selectedMatchDayScores.map((score) => (
                      <div key={score.team_id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black" style={rankBadgeStyle(score.match_day_rank)}>
                          #{score.match_day_rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white truncate">{score.team_name}</p>
                          <p className="text-xs" style={{ color: PRIMARY }}>[{score.team_tag}]</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-white">{score.team_total_pts} pts</p>
                          <p className="text-xs text-slate-400">{score.team_total_kills} kills</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">
                    {selectedMatchDayId ? 'No team scores for this match day yet.' : 'Select a match day to view standings.'}
                  </p>
                )}

                {selectedMatchDayId && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-bold">Lobbies</p>
                    {selectedMatchDayLobbies.length === 0 ? (
                      <p className="text-slate-500 text-sm">No lobbies found for this match day.</p>
                    ) : (
                      selectedMatchDayLobbies.map((lobby) => {
                        const expanded = !!expandedLobbies[lobby.id];
                        return (
                          <div key={lobby.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                            <button
                              onClick={() => toggleLobby(lobby.id)}
                              className="w-full px-3 py-2 flex items-center justify-between"
                            >
                              <span className="text-sm font-semibold text-white">Lobby {lobby.lobby_number}</span>
                              {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>
                            {expanded && (
                              <div className="px-3 pb-3 border-t border-white/10 space-y-2">
                                {lobby.notes && <p className="text-xs text-slate-400 pt-2">{lobby.notes}</p>}
                                {lobby.recording_url ? (
                                  <Button
                                    onClick={() => window.open(lobby.recording_url, '_blank', 'noopener,noreferrer')}
                                    size="sm"
                                    className="mt-2 bg-[#ec131e] hover:bg-[#ec131e]/90"
                                  >
                                    <PlayCircle className="w-4 h-4 mr-2" />
                                    Watch Recording
                                  </Button>
                                ) : (
                                  <p className="text-xs text-slate-500 pt-2">No recording URL provided.</p>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="players" className="mt-6 space-y-3">
            {isLoading ? (
              <Card style={glassCardStyle}><CardContent className="py-12 text-center text-slate-500">Loading player stats...</CardContent></Card>
            ) : seasonPlayers.length === 0 ? (
              <Card style={glassCardStyle}><CardContent className="py-12 text-center text-slate-400">No player stats yet this season.</CardContent></Card>
            ) : (
              seasonPlayers.map((player) => (
                <div key={player.user_id} className="rounded-2xl p-4 flex items-center gap-3" style={glassCardStyle}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0" style={rankBadgeStyle(player.rank)}>
                    {player.rank <= 3 ? <Medal className="w-4 h-4" /> : `#${player.rank}`}
                  </div>
                  <img
                    src={player.avatar_url || '/placeholder.svg'}
                    alt={player.ign || player.username}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{player.ign || player.username}</p>
                    <p className="text-xs" style={{ color: PRIMARY }}>
                      {player.team_name ? `[${player.team_name}]` : 'No team'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-white">{player.season_points} pts</p>
                    <p className="text-xs text-slate-400">{player.season_kills} kills</p>
                    <p className="text-xs text-slate-500">{player.lobbies_played} lobbies</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

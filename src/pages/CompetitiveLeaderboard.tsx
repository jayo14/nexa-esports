import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetitive } from '@/hooks/useCompetitive';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Medal, Trophy, Users, Zap, ChevronDown, ChevronUp, PlayCircle, Download, Table as TableIcon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import html2canvas from 'html2canvas';

const PRIMARY = '#ec131e';

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const rankBadgeStyle = (rank: number): React.CSSProperties => {
  if (rank === 1) return { background: '#FFD70022', color: '#FFD700', border: '1px solid #FFD70055' };
  if (rank === 2) return { background: '#C0C0C022', color: '#C0C0C0', border: '1px solid #C0C0C055' };
  if (rank === 3) return { background: '#CD7F3222', color: '#CD7F32', border: '1px solid #CD7F3255' };
  return { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' };
};

const teamTagFallback = (tag?: string) => (tag || 'TM').slice(0, 2).toUpperCase();

export const CompetitiveLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  
  // High-quality previews from Unsplash matching Config.tsx
  const themeImages: Record<string, string> = {
    default: 'https://images.unsplash.com/photo-1614854262340-ab1ca7d079c7?w=1200&q=80',
    ramadan: 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?w=1200&q=80',
    christmas: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?w=1200&q=80',
    cyber: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=1200&q=80',
    military: 'https://images.unsplash.com/photo-1526920929362-5b26677c148c?w=1200&q=80',
    'dark-purple': 'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=1200&q=80',
  };

  const {
    seasons,
    activeSeason,
    seasonLeaderboard,
    matchDayTeamScores,
    playerSeasonStats,
    matchDays,
    lobbies,
    isLoading,
  } = useCompetitive();

  const [tab, setTab] = useState<string>('season');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [selectedMatchDayId, setSelectedMatchDayId] = useState('');
  const [expandedLobbies, setExpandedLobbies] = useState<Record<string, boolean>>({});
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeSeason && !selectedSeasonId) {
      setSelectedSeasonId(activeSeason.id);
    }
  }, [activeSeason, selectedSeasonId]);

  const currentSeason = useMemo(
    () => seasons.find(s => s.id === selectedSeasonId) || activeSeason,
    [seasons, selectedSeasonId, activeSeason]
  );

  const seasonMatchDays = useMemo(
    () =>
      matchDays
        .filter((day) => day.season_id === selectedSeasonId)
        .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime()),
    [matchDays, selectedSeasonId],
  );

  const seasonTeams = useMemo(
    () => seasonLeaderboard.filter((entry) => entry.season_id === selectedSeasonId).sort((a, b) => a.rank - b.rank),
    [seasonLeaderboard, selectedSeasonId],
  );

  const seasonPlayers = useMemo(
    () => playerSeasonStats.filter((entry) => entry.season_id === selectedSeasonId),
    [playerSeasonStats, selectedSeasonId],
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
    if (seasonMatchDays.length > 0) {
      // Find the first match day of the season if current one isn't in this season
      const exists = seasonMatchDays.some(d => d.id === selectedMatchDayId);
      if (!exists) {
        setSelectedMatchDayId(seasonMatchDays[0].id);
      }
    } else {
      setSelectedMatchDayId('');
    }
  }, [seasonMatchDays, selectedMatchDayId]);

  const toggleLobby = (lobbyId: string) => {
    setExpandedLobbies((prev) => ({ ...prev, [lobbyId]: !prev[lobbyId] }));
  };

  const handleDownloadImage = async () => {
    if (tableRef.current) {
      try {
        const canvas = await html2canvas(tableRef.current, {
          allowTaint: true,
          useCORS: true,
          backgroundColor: '#000',
          scale: 2,
        });
        const dataUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `Nexa_Leaderboard_${currentSeason?.name?.replace(/\s+/g, '_')}.png`;
        link.href = dataUrl;
        link.click();
      } catch (err) {
        console.error('Download failed:', err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/statistics')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                LEADERBOARD
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Competitive Division</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
              <SelectTrigger className="w-[180px] bg-white/5 border-white/10 h-10 font-bold uppercase text-[10px] tracking-widest">
                <SelectValue placeholder="Select Season" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a0b0d] border-white/10">
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-[10px] font-bold uppercase tracking-widest">
                    {s.name} {s.is_active && '• ACTIVE'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-4 bg-white/5 border border-white/10 p-1 rounded-2xl h-12">
            <TabsTrigger value="season" className="gap-2 text-[10px] font-bold uppercase"><Trophy className="w-3.5 h-3.5" />Season</TabsTrigger>
            <TabsTrigger value="match-days" className="gap-2 text-[10px] font-bold uppercase"><Zap className="w-3.5 h-3.5" />Match Days</TabsTrigger>
            <TabsTrigger value="players" className="gap-2 text-[10px] font-bold uppercase"><Users className="w-3.5 h-3.5" />Players</TabsTrigger>
            <TabsTrigger value="table" className="gap-2 text-[10px] font-bold uppercase"><TableIcon className="w-3.5 h-3.5" />Table View</TabsTrigger>
          </TabsList>

          <TabsContent value="season" className="mt-6 space-y-3 outline-none">
            {isLoading ? (
              <Card style={glassCardStyle}><CardContent className="py-12 text-center text-slate-500">Loading season standings...</CardContent></Card>
            ) : seasonTeams.length === 0 ? (
              <Card style={glassCardStyle}>
                <CardContent className="py-12 text-center text-slate-400">
                  No data for this season yet.
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

          <TabsContent value="match-days" className="mt-6 space-y-4 outline-none">
            <Card style={glassCardStyle}>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Choose Match Day</p>
                  <Select value={selectedMatchDayId} onValueChange={setSelectedMatchDayId}>
                    <SelectTrigger className="bg-white/5 border-white/10">
                      <SelectValue placeholder="Select match day" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0b0d] border-white/10">
                      {seasonMatchDays.map((day) => (
                        <SelectItem key={day.id} value={day.id} className="text-xs">
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
                          <p className="text-xs font-bold" style={{ color: PRIMARY }}>[{score.team_tag}]</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-white">{score.team_total_pts} pts</p>
                          <p className="text-xs text-slate-400">{score.team_total_kills} kills</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm py-4">
                    {selectedMatchDayId ? 'No team scores recorded yet.' : 'Select a match day.'}
                  </p>
                )}

                {selectedMatchDayId && (
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-black">Lobby Intel</p>
                    {selectedMatchDayLobbies.length === 0 ? (
                      <p className="text-slate-500 text-xs">No lobbies recorded.</p>
                    ) : (
                      selectedMatchDayLobbies.map((lobby) => {
                        const expanded = !!expandedLobbies[lobby.id];
                        return (
                          <div key={lobby.id} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                            <button
                              onClick={() => toggleLobby(lobby.id)}
                              className="w-full px-3 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
                            >
                              <span className="text-xs font-bold text-white uppercase tracking-widest">Lobby {lobby.lobby_number}</span>
                              {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                            </button>
                            {expanded && (
                              <div className="px-3 pb-3 border-t border-white/10 space-y-2">
                                {lobby.notes && <p className="text-xs text-slate-400 pt-3 italic">"{lobby.notes}"</p>}
                                {lobby.recording_url ? (
                                  <Button
                                    onClick={() => window.open(lobby.recording_url, '_blank')}
                                    size="sm"
                                    className="mt-2 bg-[#ec131e] hover:bg-[#ec131e]/90 text-[10px] font-black uppercase tracking-widest h-8"
                                  >
                                    <PlayCircle className="w-3.5 h-3.5 mr-2" />
                                    Watch Recording
                                  </Button>
                                ) : (
                                  <p className="text-[10px] text-slate-600 font-bold uppercase pt-3">Recording unavailable</p>
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

          <TabsContent value="players" className="mt-6 space-y-3 outline-none">
            {isLoading ? (
              <Card style={glassCardStyle}><CardContent className="py-12 text-center text-slate-500">Loading player stats...</CardContent></Card>
            ) : seasonPlayers.length === 0 ? (
              <Card style={glassCardStyle}><CardContent className="py-12 text-center text-slate-400">No stats for this season yet.</CardContent></Card>
            ) : (
              seasonPlayers.map((player) => (
                <div key={player.user_id} className="rounded-2xl p-4 flex items-center gap-3" style={glassCardStyle}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black shrink-0" style={rankBadgeStyle(player.rank)}>
                    {player.rank <= 3 ? <Medal className="w-4 h-4" /> : `#${player.rank}`}
                  </div>
                  <img
                    src={player.avatar_url || '/placeholder.svg'}
                    alt={player.ign}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-white/20"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-white truncate">{player.ign || player.username}</p>
                    <p className="text-[10px] font-bold uppercase" style={{ color: PRIMARY }}>
                      {player.team_name ? `[${player.team_name}]` : 'Free Agent'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-white">{player.season_points} pts</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">{player.season_kills} kills</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-6 outline-none">
            <div className="flex justify-end mb-4">
              <Button onClick={handleDownloadImage} className="bg-red-600 hover:bg-red-500 gap-2 h-10 rounded-xl uppercase font-black tracking-widest text-[10px]">
                <Download className="w-4 h-4" /> Export as Image
              </Button>
            </div>
            
            <div className="overflow-x-auto rounded-[32px] border border-white/10 shadow-2xl" ref={tableRef}>
              <div 
                className="min-w-[800px] p-8 relative overflow-hidden"
                style={{
                  background: `linear-gradient(rgba(0,0,0,0.85), rgba(0,0,0,0.85)), url(${themeImages[currentTheme || 'default']})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="relative z-10 space-y-8">
                  <div className="flex justify-between items-center border-b border-white/10 pb-6">
                    <div>
                      <h2 className="text-4xl font-black text-white font-orbitron tracking-tighter uppercase">{currentSeason?.name || 'SEASON STANDINGS'}</h2>
                      <p className="text-red-500 font-black tracking-[0.4em] text-xs uppercase mt-1">Official Leaderboard Table</p>
                    </div>
                    <img src="/nexa-logo-ramadan.jpg" className="w-16 h-16 rounded-2xl border-2 border-white/10" alt="Nexa" />
                  </div>

                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 border-b border-white/5">
                        <th className="py-4 px-4">Rank</th>
                        <th className="py-4 px-4">Team Unit</th>
                        <th className="py-4 px-4">Tag</th>
                        <th className="py-4 px-4 text-center">Total KL</th>
                        <th className="py-4 px-4 text-center">PL Pts</th>
                        <th className="py-4 px-4 text-center">Total Ex</th>
                        <th className="py-4 px-4 text-right">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {seasonTeams.length === 0 ? (
                        <tr><td colSpan={7} className="py-20 text-center text-slate-600 font-bold uppercase tracking-widest">Awaiting match results...</td></tr>
                      ) : (
                        seasonTeams.map((team, idx) => {
                          const isTop3 = team.rank <= 3;
                          const rowBg = idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent';
                          
                          let rankStyle = {};
                          if (team.rank === 1) rankStyle = { color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.3)' };
                          if (team.rank === 2) rankStyle = { color: '#C0C0C0', textShadow: '0 0 10px rgba(192,192,192,0.3)' };
                          if (team.rank === 3) rankStyle = { color: '#CD7F32', textShadow: '0 0 10px rgba(205,127,50,0.3)' };

                          return (
                            <tr key={team.team_id} className={cn("transition-colors", rowBg)}>
                              <td className="py-5 px-4">
                                <span className="text-xl font-black font-orbitron italic" style={rankStyle}>{team.rank.toString().padStart(2, '0')}</span>
                              </td>
                              <td className="py-5 px-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                                    {team.logo_url ? <img src={team.logo_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-bold text-xs" style={{ color: PRIMARY }}>{teamTagFallback(team.team_tag)}</div>}
                                  </div>
                                  <span className="font-bold text-white text-sm uppercase tracking-tight">{team.team_name}</span>
                                </div>
                              </td>
                              <td className="py-5 px-4">
                                <span className="text-xs font-black text-red-500">[{team.team_tag}]</span>
                              </td>
                              <td className="py-5 px-4 text-center font-bold text-white text-sm">
                                {team.season_kills}
                              </td>
                              <td className="py-5 px-4 text-center font-bold text-slate-400 text-sm">
                                {team.season_placement_pts || 0}
                              </td>
                              <td className="py-5 px-4 text-center font-bold text-slate-600 text-sm">
                                0
                              </td>
                              <td className="py-5 px-4 text-right">
                                <span className="text-lg font-black text-white font-orbitron tracking-tighter">{team.season_points}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  
                  <div className="flex justify-between items-center pt-8 border-t border-white/10">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">© NEXA ESPORTS • COMMAND OVERVIEW</p>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Synchronized: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

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
import { cn } from '@/lib/utils';

const teamTagFallback = (tag?: string) => (tag || 'TM').slice(0, 2).toUpperCase();

export const CompetitiveLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentTheme } = useTheme();
  
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

  const getRankStyle = (rank: number) => {
    if (rank === 1) return "bg-[#FFD70022] text-[#FFD700] border-[#FFD70055] brand-glow shadow-[0_0_10px_rgba(255,215,0,0.2)]";
    if (rank === 2) return "bg-[#C0C0C022] text-[#C0C0C0] border-[#C0C0C055] shadow-[0_0_10px_rgba(192,192,192,0.2)]";
    if (rank === 3) return "bg-[#CD7F3222] text-[#CD7F32] border-[#CD7F3255] shadow-[0_0_10px_rgba(205,127,50,0.2)]";
    return "bg-white/5 text-slate-400 border-white/10";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0b]">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/statistics')} className="rounded-xl hover:bg-white/5">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white font-orbitron tracking-tight uppercase">
                LEADERBOARD
              </h1>
              <p className="text-[10px] font-black uppercase text-[#ec131e] tracking-[0.3em]">Competitive Division Alpha</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Select value={selectedSeasonId} onValueChange={setSelectedSeasonId}>
              <SelectTrigger className="w-[200px] glass-level-2 h-11 font-black uppercase text-[10px] tracking-widest border-white/10">
                <SelectValue placeholder="Select Season" />
              </SelectTrigger>
              <SelectContent className="glass-level-3 border-white/10">
                {seasons.map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase tracking-widest py-3">
                    {s.name} {s.is_active && '• ACTIVE'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 glass-level-2 border-white/10 p-1 rounded-[20px] h-14 mb-8">
            <TabsTrigger value="season" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#ec131e] data-[state=active]:text-white rounded-[16px] transition-all"><Trophy className="w-3.5 h-3.5" />Season</TabsTrigger>
            <TabsTrigger value="match-days" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#ec131e] data-[state=active]:text-white rounded-[16px] transition-all"><Zap className="w-3.5 h-3.5" />Matches</TabsTrigger>
            <TabsTrigger value="players" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#ec131e] data-[state=active]:text-white rounded-[16px] transition-all"><Users className="w-3.5 h-3.5" />Players</TabsTrigger>
            <TabsTrigger value="table" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#ec131e] data-[state=active]:text-white rounded-[16px] transition-all"><TableIcon className="w-3.5 h-3.5" />Table Feed</TabsTrigger>
          </TabsList>

          <TabsContent value="season" className="space-y-4 outline-none">
            {isLoading ? (
              <div className="py-20 text-center"><PlayCircle className="w-10 h-10 animate-spin mx-auto text-[#ec131e] opacity-50" /></div>
            ) : seasonTeams.length === 0 ? (
              <div className="glass-level-2 p-20 text-center rounded-[32px] border border-dashed border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">No Intelligence Data Compiled for this Season</p>
              </div>
            ) : (
              seasonTeams.map((team) => (
                <button
                  key={team.team_id}
                  onClick={() => navigate(`/teams/${team.team_id}`)}
                  className="w-full glass-level-2 p-5 flex items-center gap-5 text-left rounded-[24px] group"
                >
                  <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black border shrink-0 transition-transform group-hover:scale-110 font-orbitron", getRankStyle(team.rank))}>
                    #{team.rank}
                  </div>
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.team_name} className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-600/10 text-[#ec131e] font-black shrink-0 border border-red-500/10 font-orbitron">
                      {teamTagFallback(team.team_tag)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-white uppercase tracking-tight mb-0.5">{team.team_name}</p>
                    <p className="text-[10px] font-black text-[#ec131e] uppercase tracking-widest">[{team.team_tag}]</p>
                  </div>
                  <div className="text-right shrink-0 pr-2">
                    <p className="text-2xl font-black text-white font-orbitron tracking-tighter">{team.season_points}</p>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{team.season_kills} Kills</p>
                  </div>
                </button>
              ))
            )}
          </TabsContent>

          <TabsContent value="match-days" className="space-y-6 outline-none">
            <div className="glass-level-2 p-8 rounded-[32px] space-y-8">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Select Operations Day</p>
                <Select value={selectedMatchDayId} onValueChange={setSelectedMatchDayId}>
                  <SelectTrigger className="glass-level-3 h-12 border-white/5 font-bold">
                    <SelectValue placeholder="Select Match Day" />
                  </SelectTrigger>
                  <SelectContent className="glass-level-3 border-white/10">
                    {seasonMatchDays.map((day) => (
                      <SelectItem key={day.id} value={day.id} className="text-xs py-3">
                        {day.name} • {new Date(day.match_date).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMatchDayId && selectedMatchDayScores.length > 0 ? (
                <div className="space-y-3 border-t border-white/5 pt-8">
                  {selectedMatchDayScores.map((score) => (
                    <div key={score.team_id} className="glass-level-3 p-4 flex items-center gap-4 rounded-2xl border-white/5">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black border font-orbitron", getRankStyle(score.match_day_rank))}>
                        #{score.match_day_rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-white uppercase tracking-tight text-sm">{score.team_name}</p>
                        <p className="text-[9px] font-black text-[#ec131e] uppercase tracking-widest">[{score.team_tag}]</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-white font-orbitron">{score.team_total_pts} PTS</p>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{score.team_total_kills} Kills</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Mission results pending upload</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="players" className="space-y-4 outline-none">
            {isLoading ? (
               <div className="py-20 text-center"><PlayCircle className="w-10 h-10 animate-spin mx-auto text-[#ec131e] opacity-50" /></div>
            ) : seasonPlayers.length === 0 ? (
              <div className="glass-level-2 p-20 text-center rounded-[32px] border border-dashed border-white/10">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Operator Stats Synchronization Required</p>
              </div>
            ) : (
              Math.min(seasonPlayers.length, 50) === 0 ? null :
              seasonPlayers.slice(0, 50).map((player) => (
                <div key={player.user_id} className="glass-level-2 p-4 flex items-center gap-4 rounded-2xl group">
                  <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center text-xs font-black border shrink-0 transition-transform group-hover:scale-110", getRankStyle(player.rank))}>
                    {player.rank <= 3 ? <Medal className="w-5 h-5" /> : player.rank}
                  </div>
                  <div className="w-11 h-11 rounded-full border-2 border-white/10 overflow-hidden shrink-0">
                    <img src={player.avatar_url || '/placeholder.svg'} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-black text-white uppercase tracking-tight text-sm">{player.ign || player.username}</p>
                    <p className="text-[10px] font-black text-[#ec131e] uppercase tracking-widest">
                      {player.team_name ? `[${player.team_name}]` : 'Free Agent'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-black text-white font-orbitron">{player.season_points} PTS</p>
                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-tighter">{player.season_kills} Global ELIMS</p>
                  </div>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="table" className="mt-8 outline-none">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-black text-white font-orbitron tracking-widest uppercase">Export Intel Data</h3>
              <Button onClick={handleDownloadImage} className="bg-[#ec131e] hover:bg-red-700 gap-2 h-11 px-6 rounded-xl uppercase font-black tracking-widest text-[10px] brand-glow">
                <Download className="w-4 h-4" /> Download Intelligence PDF/PNG
              </Button>
            </div>
            
            <div className="overflow-x-auto rounded-[32px] border border-white/10 shadow-2xl" ref={tableRef}>
              <div 
                className="min-w-[850px] p-10 relative overflow-hidden"
                style={{
                  background: `linear-gradient(rgba(0,0,0,0.9), rgba(0,0,0,0.9)), url(${themeImages[currentTheme || 'default']})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="relative z-10 space-y-10">
                  <div className="flex justify-between items-end border-b-2 border-red-600/30 pb-10">
                    <div>
                      <h2 className="text-5xl font-black text-white font-orbitron tracking-tighter uppercase leading-none">{currentSeason?.name || 'SEASON OPS'}</h2>
                      <p className="text-[#ec131e] font-black tracking-[0.5em] text-xs uppercase mt-3">Final Operational Standings</p>
                    </div>
                    <img src="/nexa-logo-ramadan.jpg" className="w-20 h-20 rounded-3xl border-2 border-white/10 shadow-2xl" alt="Nexa" />
                  </div>

                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-500 border-b border-white/10">
                        <th className="py-6 px-4">Sector Rank</th>
                        <th className="py-6 px-4">Squad Unit</th>
                        <th className="py-6 px-4">Tag</th>
                        <th className="py-6 px-4 text-center">ELIMS</th>
                        <th className="py-6 px-4 text-center">PL Points</th>
                        <th className="py-6 px-4 text-center">XP Bonus</th>
                        <th className="py-6 px-4 text-right pr-6">Net Points</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {seasonTeams.length === 0 ? (
                        <tr><td colSpan={7} className="py-32 text-center text-slate-600 font-black uppercase tracking-widest">Awaiting sector synchronization...</td></tr>
                      ) : (
                        seasonTeams.map((team, idx) => {
                          let rankColor = "text-white";
                          if (team.rank === 1) rankColor = "text-[#FFD700]";
                          if (team.rank === 2) rankColor = "text-[#C0C0C0]";
                          if (team.rank === 3) rankColor = "text-[#CD7F32]";

                          return (
                            <tr key={team.team_id} className={cn("transition-colors", idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent')}>
                              <td className="py-7 px-4">
                                <span className={cn("text-2xl font-black font-orbitron italic", rankColor)}>{team.rank.toString().padStart(2, '0')}</span>
                              </td>
                              <td className="py-7 px-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden shrink-0">
                                    {team.logo_url ? <img src={team.logo_url} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center font-black text-xs text-[#ec131e]">{teamTagFallback(team.team_tag)}</div>}
                                  </div>
                                  <span className="font-black text-white text-base uppercase tracking-tight">{team.team_name}</span>
                                </div>
                              </td>
                              <td className="py-7 px-4">
                                <span className="text-[10px] font-black text-[#ec131e] tracking-widest uppercase">[{team.team_tag}]</span>
                              </td>
                              <td className="py-7 px-4 text-center font-black text-white text-base">
                                {team.season_kills}
                              </td>
                              <td className="py-7 px-4 text-center font-black text-slate-400 text-sm">
                                {team.season_placement_pts || 0}
                              </td>
                              <td className="py-7 px-4 text-center font-black text-slate-600 text-sm">
                                0
                              </td>
                              <td className="py-7 px-4 text-right pr-6">
                                <span className="text-2xl font-black text-white font-orbitron tracking-tighter">{team.season_points}</span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                  
                  <div className="flex justify-between items-center pt-10 border-t border-white/10">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">Command Synchronized: {new Date().toLocaleDateString()}</p>
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.5em]">NEXA OPERATIONS PROTOCOL VER v4.5</p>
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

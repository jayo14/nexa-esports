import { FC, useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, Target, Swords, Users, Globe, MapPin, Search, 
  TrendingUp, TrendingDown, Minus, Crown, Shield, 
  ChevronRight, Share2, Download, Timer, Activity, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

// Types for our enhanced data
interface EnhancedPlayer {
  id: string;
  ign: string;
  avatar_url?: string;
  status?: string; 
  tier?: string;
  grade?: string;
  total_kills?: number;
  br_kills?: number;
  mp_kills?: number;
  matches_played: number;
  win_rate: number;
  kd_ratio: number;
  trend: 'up' | 'down' | 'neutral';
  score: number;
  is_banned?: boolean;
}

const MODAL_BACKGROUND_COLOR = '#13090d'; 

// --- Reusable Components ---

const ComparisonPlayerCard = ({ player, title, isTarget }: { player: any; title: string; isTarget?: boolean }) => (
  <Card className={cn(
    "bg-[#1b0d12]/80 border-white/10 relative overflow-hidden group rounded-3xl",
    isTarget ? "border-[#b33a5e]/50 shadow-lg shadow-[#7a233f]/25" : "border-[#8d2a44]/40 shadow-lg shadow-[#5c1630]/20"
  )}>
    <div className={cn(
      "absolute top-0 left-0 w-full h-1.5",
      isTarget ? "bg-[#b33a5e] animate-pulse" : "bg-[#8d2a44]"
    )} />
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img 
            src={player.avatar_url || "/placeholder.svg"} 
            alt={player.ign}
            className="w-16 h-16 rounded-2xl object-cover border-2 border-white/10 shadow-xl"
          />
          <div className={cn(
            "absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-md",
              isTarget ? "bg-[#b33a5e] text-white" : "bg-[#8d2a44] text-white"
            )}>
            {isTarget ? "TARGET" : "ASSET"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{title}</div>
          <h3 className="text-xl font-black text-white font-orbitron italic flex items-center gap-1">
            {player.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{player.ign}
            {player.is_banned && <Badge variant="destructive" className="text-[10px] h-4 px-1 font-mono">BANNED</Badge>}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <Shield className="w-3 h-3 text-[#d15a7d]" />
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              {player.tier} • {player.grade}
            </span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const PodiumCard = ({ player, rank, color, isMvp }: { player: EnhancedPlayer; rank: number; color: 'gold' | 'silver' | 'bronze'; isMvp?: boolean }) => {
  const colors = {
    gold: { border: 'border-[#d4a657]', text: 'text-[#e7bf73]', bg: 'from-[#d4a657]/20', glow: 'shadow-[#9b6d2f]/30' },
    silver: { border: 'border-[#c2b7c0]', text: 'text-[#ddd0db]', bg: 'from-[#c2b7c0]/20', glow: 'shadow-[#8d7b89]/30' },
    bronze: { border: 'border-[#9a5b3c]', text: 'text-[#bf7c56]', bg: 'from-[#9a5b3c]/20', glow: 'shadow-[#6f3f28]/30' },
  };
  
  const theme = colors[color];

  return (
    <motion.div 
      className={cn(
        "relative flex flex-col items-center",
        rank === 1 && "scale-110 z-20",
        "transition-all duration-300 hover:-translate-y-3"
      )}
      whileHover={{ scale: rank === 1 ? 1.15 : 1.08 }}
    >
      {isMvp && (
        <motion.div 
          animate={{ y: [0, -10, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-12 z-30"
        >
          <Crown className="w-12 h-12 text-yellow-500 drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]" fill="currentColor" />
        </motion.div>
      )}
      
      <div className={cn(
        "relative w-full rounded-3xl overflow-hidden bg-[#1a0d12]/80 backdrop-blur-lg border-2 shadow-2xl transition-all duration-300",
        theme.border, theme.glow
      )}>
        <div className={cn("absolute inset-0 bg-gradient-to-b to-transparent opacity-70", theme.bg)} />
        
        <div className="relative p-4 sm:p-5 flex flex-col items-center text-center">
          <div className="relative mb-4">
            <div className={cn(
              "w-24 h-24 rounded-2xl overflow-hidden border-2 shadow-xl flex items-center justify-center",
              theme.border
            )}>
              <img 
                src={player.avatar_url || "/placeholder.svg"} 
                alt={player.ign}
                className="w-full h-full object-cover"
              />
              {player.status === 'beta' && (
                <div className="absolute -bottom-2 -right-2 bg-primary text-white text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-widest shadow-md">BETA</div>
              )}
            </div>
            <div className={cn(
              "absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full font-black text-xs uppercase tracking-widest border bg-black text-white shadow-md",
              theme.border
            )}>
              Rank #{rank}
            </div>
          </div>
          
          <h3 className="text-lg font-black text-white font-orbitron uppercase tracking-wide mb-1 flex items-center gap-2">
            {player.ign}
          </h3>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-bold uppercase tracking-widest mb-4">
              <Shield className="w-3 h-3 text-[#d15a7d]" />
            {player.tier} • {player.grade}
          </div>
          
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="bg-white/5 p-2 rounded-lg">
              <div className="text-[10px] text-gray-500 uppercase font-bold">Score</div>
              <div className={cn("text-lg font-black font-orbitron", theme.text)}>{player.score.toLocaleString()}</div>
            </div>
            <div className="bg-white/5 p-2 rounded-lg">
              <div className="text-[10px] text-gray-500 uppercase font-bold">K/D Ratio</div>
              <div className="text-lg font-black text-white font-mono">{player.kd_ratio}</div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const Statistics: FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const compareId = searchParams.get('compare');
  
  const [filter, setFilter] = useState<'overall' | 'br' | 'mp'>('overall');
  const [timeRange, setTimeRange] = useState('season'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const { data: leaderboardData, isLoading, refetch } = useLeaderboard();
  const leaderboardRef = useRef<HTMLDivElement>(null);
  
  const [comparePlayer, setComparePlayer] = useState<any>(null);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  
  const TOP_RANKS_TO_SHOW_PODIUM = 3;
  const MAX_LEADERBOARD_ROWS = 100; 

  const tiers = ["Legendary", "Grandmaster", "Master", "Pro", "Elite", "Veteran", "Rookie"];

  const enhancedData: EnhancedPlayer[] = useMemo(() => {
    if (!leaderboardData) return [];
    
    const sorted = [...leaderboardData].sort((a, b) => {
      const scoreA = filter === 'br' ? (a.br_kills || 0) : filter === 'mp' ? (a.mp_kills || 0) : (a.total_kills || 0);
      const scoreB = filter === 'br' ? (b.br_kills || 0) : filter === 'mp' ? (b.mp_kills || 0) : (b.total_kills || 0);
      return scoreB - scoreA;
    });

    return sorted.map((player) => {
      const seed = player.id?.charCodeAt(0) || 0; 
      const score = filter === 'br' ? (player.br_kills || 0) : filter === 'mp' ? (player.mp_kills || 0) : (player.total_kills || 0);
      const matches = Math.floor(score * 0.8) + (seed % 50) + 50; 
      const winRate = 45 + (seed % 25);
      const kdRatio = (1.1 + (seed % 45) / 10).toFixed(2) as unknown as number;
      const trend = seed % 3 === 0 ? 'up' : seed % 3 === 1 ? 'down' : 'neutral';
      
      return {
        ...player,
        matches_played: matches,
        win_rate: Math.min(winRate, 98), 
        kd_ratio: kdRatio,
        trend: trend,
        score: score
      };
    }).filter(p => {
      const matchesSearch = p.ign?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesTier = tierFilter === 'all' || p.tier === tierFilter;
      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [leaderboardData, filter, searchQuery, statusFilter, tierFilter]);

  useEffect(() => {
    const fetchCompareData = async () => {
      if (!compareId) {
        setComparePlayer(null);
        return;
      }
      try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', compareId).single();
        if (profile) setComparePlayer(profile);
      } catch (err) {}
    };
    fetchCompareData();
  }, [compareId]);

  useEffect(() => {
    const fetchCurrentPlayerData = async () => {
      if (!user?.id) return;
      try {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (profile) setCurrentPlayer(profile);
      } catch (err) {}
    };
    fetchCurrentPlayerData();
  }, [user?.id]);

  useEffect(() => {
    if (enhancedData && user) {
      const rank = enhancedData.findIndex(p => p.id === user?.id) + 1;
      setCurrentUserRank(rank > 0 ? rank : null);
    }
  }, [enhancedData, user]);

  const topThree = enhancedData.slice(0, TOP_RANKS_TO_SHOW_PODIUM);
  const restOfPlayers = enhancedData.slice(TOP_RANKS_TO_SHOW_PODIUM, MAX_LEADERBOARD_ROWS);

  const handleExport = async () => {
    if (!leaderboardRef.current) return;
    try {
      toast.info('Generating report...');
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(leaderboardRef.current, { backgroundColor: MODAL_BACKGROUND_COLOR, scale: 2, useCORS: true });
      const link = document.createElement('a');
      link.href = canvas.toDataURL();
      link.download = `NEXA-INTEL-${filter.toUpperCase()}.png`;
      link.click();
      toast.success('Downloaded successfully');
    } catch (e) {}
  };

  const handleShare = async () => {
    if (!leaderboardRef.current) return;
    try {
      toast.info('Preparing package...');
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(leaderboardRef.current, { backgroundColor: MODAL_BACKGROUND_COLOR, scale: 2, useCORS: true });
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'leaderboard.png', { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({ title: 'NeXa Leaderboard', files: [file] });
        } else {
          handleExport();
        }
      });
    } catch (error) {}
  };

  const getMedalIcon = (position: number) => {
    if (position === 1) return <Crown className="w-6 h-6 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" fill="currentColor" />;
    if (position === 2) return <Trophy className="w-5 h-5 text-gray-300" />;
    if (position === 3) return <Award className="w-5 h-5 text-amber-700" />;
    return <span className="text-sm font-bold text-muted-foreground/60">{position}</span>;
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-500" />;
  };

  return (
    <div className="min-h-screen bg-[#10080b] text-foreground font-rajdhani">
      <header className="relative w-full h-[300px] md:h-[400px] overflow-hidden mb-12 group rounded-b-[42px] border-b border-[#70263f]/40">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1f0b13]/95 via-[#2d1019]/85 to-[#10080b] z-10" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#3d1022] via-[#5a1b2f] to-[#2f0d1d] opacity-90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(214,93,129,0.3),transparent_45%),radial-gradient(circle_at_80%_25%,rgba(148,48,84,0.35),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(69,22,38,0.6),transparent_60%)]" />
        
        <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-end pb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Badge variant="outline" className="bg-[#782544]/30 text-[#f19bb9] border-[#a73c63] px-4 py-1 text-[10px] uppercase font-black rounded-full">
                  Season 5: Phantom War
                </Badge>
              </motion.div>
              <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="text-5xl md:text-7xl font-black text-white font-orbitron italic uppercase">
                Combat <span className="text-[#f3adc7] animate-pulse font-bold">Rankings</span>
              </motion.h1>
              <p className="text-[#c7a6b2] max-w-lg">Operational performance metrics for all elite operators in the Nexa Division.</p>
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
              <TabsList className="bg-[#2a1119]/80 border border-[#7b2a46]/40 p-1 h-12 rounded-2xl">
                <TabsTrigger value="overall" className="px-6 h-full font-orbitron text-xs rounded-xl data-[state=active]:bg-[#9f3557]">Global</TabsTrigger>
                <TabsTrigger value="mp" className="px-6 h-full font-orbitron text-xs rounded-xl data-[state=active]:bg-[#9f3557]">MP</TabsTrigger>
                <TabsTrigger value="br" className="px-6 h-full font-orbitron text-xs rounded-xl data-[state=active]:bg-[#9f3557]">BR</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pb-32" ref={leaderboardRef}>
        {compareId && comparePlayer && currentPlayer && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black font-orbitron text-[#e7779f] uppercase italic">Intel Comparison</h2>
              <Button variant="ghost" size="sm" onClick={() => setSearchParams({})} className="text-xs uppercase text-muted-foreground">Clear</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ComparisonPlayerCard player={currentPlayer} title="Active Operative" />
              <ComparisonPlayerCard player={comparePlayer} title="Target Profile" isTarget />
            </div>
          </motion.div>
        )}

        <div className="flex flex-col lg:flex-row justify-between gap-4 mb-12">
          <div className="flex flex-wrap items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] bg-[#221018]/85 border-[#7b2a46]/40 h-11 font-orbitron text-[10px] uppercase rounded-xl">
                <Timer className="w-3.5 h-3.5 mr-2 text-[#dd6a91]" />
                <SelectValue placeholder="Horizon" />
              </SelectTrigger>
              <SelectContent className="bg-[#1d0d14] border-[#6f2741]">
                <SelectItem value="daily">Daily Log</SelectItem>
                <SelectItem value="weekly">Weekly Cycle</SelectItem>
                <SelectItem value="season">Full Season</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px] bg-[#221018]/85 border-[#7b2a46]/40 h-11 font-orbitron text-[10px] uppercase rounded-xl">
                <Shield className="w-3.5 h-3.5 mr-2 text-[#dd6a91]" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-[#1d0d14] border-[#6f2741]">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="main">Main Roster</SelectItem>
                <SelectItem value="beta">Beta Squad</SelectItem>
              </SelectContent>
            </Select>

            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[140px] bg-[#221018]/85 border-[#7b2a46]/40 h-11 font-orbitron text-[10px] uppercase rounded-xl">
                <Crown className="w-3.5 h-3.5 mr-2 text-[#dd6a91]" />
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent className="bg-[#1d0d14] border-[#6f2741]">
                <SelectItem value="all">All Tiers</SelectItem>
                {tiers.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1 md:w-64 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a58390]" />
              <Input 
                placeholder="Search Operator..." 
                className="pl-11 bg-[#221018]/85 border-[#7b2a46]/40 h-11 rounded-xl"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleExport} className="h-11 w-11 bg-[#221018]/85 border-[#7b2a46]/40 rounded-xl"><Download className="w-4 h-4" /></Button>
            <Button variant="default" size="icon" onClick={handleShare} className="h-11 w-11 bg-[#a4375c] hover:bg-[#8f2f50] rounded-xl"><Share2 className="w-4 h-4" /></Button>
          </div>
        </div>

        {topThree.length > 0 && !searchQuery && statusFilter === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 items-end max-w-5xl mx-auto">
            {topThree[1] && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="order-2 md:order-1">
                <PodiumCard player={topThree[1]} rank={2} color="silver" />
              </motion.div>
            )}
            {topThree[0] && (
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="order-1 md:order-2 z-10 scale-110 -mb-6">
                <PodiumCard player={topThree[0]} rank={1} color="gold" isMvp />
              </motion.div>
            )}
            {topThree[2] && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="order-3 md:order-3">
                <PodiumCard player={topThree[2]} rank={3} color="bronze" />
              </motion.div>
            )}
          </div>
        )}

        <Card className="bg-[#1a0d12]/85 border-[#6d2440]/35 overflow-hidden backdrop-blur-xl rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-[#2a121a]/90 text-[10px] font-black uppercase tracking-widest text-[#be9eaa]">
                <tr>
                  <th className="p-5 text-center w-20">Rank</th>
                  <th className="p-5 min-w-[200px]">Operator</th>
                  <th className="p-5 text-center hidden md:table-cell">Deployments</th>
                  <th className="p-5 text-center hidden sm:table-cell">K/D</th>
                  <th className="p-5 text-right">Eliminations</th>
                  <th className="p-5 text-center w-20">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {isLoading ? (
                  <tr><td colSpan={6} className="p-20 text-center font-orbitron animate-pulse text-xs tracking-widest text-muted-foreground uppercase">Syncing Intel...</td></tr>
                ) : enhancedData.length === 0 ? (
                  <tr><td colSpan={6} className="p-20 text-center font-orbitron text-xs tracking-widest text-muted-foreground uppercase">No matches in sector.</td></tr>
                ) : (
                  enhancedData.map((player, index) => (
                    <motion.tr 
                      key={player.id} 
                      initial={{ opacity: 0 }} 
                      animate={{ opacity: 1 }}
                      className={cn("hover:bg-[#2a121a]/60 transition-colors", player.id === user?.id && "bg-[#8d2f50]/20 border-l-2 border-[#c65179]")}
                    >
                      <td className="p-5 text-center">{getMedalIcon(index + 1)}</td>
                      <td className="p-5">
                        <div className="flex items-center gap-4">
                          <img src={player.avatar_url || "/placeholder.svg"} className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                          <div>
                             <div className="font-orbitron font-black text-sm uppercase italic flex items-center gap-2">
                               {player.ign}
                               {player.status === 'beta' && <Badge className="text-[6px] h-3 px-1 uppercase">Beta</Badge>}
                             </div>
                            <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-widest">{player.tier} • {player.grade}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 text-center hidden md:table-cell font-mono text-xs">{player.matches_played}</td>
                      <td className="p-5 text-center hidden sm:table-cell font-orbitron font-black text-sm">{player.kd_ratio}</td>
                       <td className="p-5 text-right pr-8 font-orbitron font-black text-xl text-[#de6f95]">{player.score.toLocaleString()}</td>
                      <td className="p-5 text-center">{getTrendIcon(player.trend)}</td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {user && currentUserRank && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md">
          <Card className="bg-[#1a0d12]/90 border-[#b34469]/40 backdrop-blur-2xl shadow-2xl p-4 flex items-center justify-between rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#a4375c]/20 rounded-xl border border-[#b34469]/40 flex flex-col items-center justify-center">
                <span className="text-[8px] font-black uppercase">Rank</span>
                <span className="text-xl font-black font-orbitron italic">#{currentUserRank}</span>
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-[#e7779f]">Personal Standing</div>
                <div className="text-sm font-bold text-white uppercase italic">{enhancedData[currentUserRank-1]?.ign}</div>
              </div>
            </div>
            <Button size="sm" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="font-orbitron italic text-[10px] h-8 uppercase">Back to Top</Button>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default Statistics;

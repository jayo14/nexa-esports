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
  ChevronRight, Share2, Download, Timer, Activity, Link2, Award
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

// Types for our enhanced data
interface EnhancedPlayer {
  id: string;
  ign: string;
  avatar_url?: string;
  status?: string; // e.g., 'beta'
  tier?: string;
  grade?: string;
  total_kills?: number;
  br_kills?: number;
  mp_kills?: number;
  // Mocked/Derived stats for UI
  matches_played: number;
  win_rate: number;
  kd_ratio: number;
  trend: 'up' | 'down' | 'neutral';
  score: number;
  is_banned?: boolean;
}

const MODAL_BACKGROUND_COLOR = '#09090b'; // Dark background for export

// --- Reusable Components ---

const ComparisonPlayerCard = ({ player, title, isTarget }: { player: any; title: string; isTarget?: boolean }) => (
  <Card className={cn(
    "bg-black/40 border-white/5 relative overflow-hidden group",
    isTarget ? "border-primary/30 shadow-lg shadow-primary/20" : "border-blue-500/30 shadow-lg shadow-blue-500/20"
  )}>
    {/* Animated bar at the top */}
    <div className={cn(
      "absolute top-0 left-0 w-full h-1.5",
      isTarget ? "bg-primary animate-pulse" : "bg-blue-500"
    )} />
    <CardContent className="p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img 
            src={player.avatar_url || "/placeholder.svg"} 
            alt={player.ign}
            className="w-16 h-16 rounded-lg object-cover border-2 border-white/10 shadow-xl"
          />
          <div className={cn(
            "absolute -bottom-2 -right-2 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest shadow-md",
            isTarget ? "bg-primary text-white" : "bg-blue-500 text-white"
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
            <Shield className="w-3 h-3 text-primary" />
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
    gold: { border: 'border-yellow-500', text: 'text-yellow-500', bg: 'from-yellow-500/20', glow: 'shadow-yellow-500/30' },
    silver: { border: 'border-gray-300', text: 'text-gray-300', bg: 'from-gray-300/20', glow: 'shadow-gray-300/30' },
    bronze: { border: 'border-amber-700', text: 'text-amber-700', bg: 'from-amber-700/20', glow: 'shadow-amber-700/30' },
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
          <Crown className="w-12 h-12 text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" fill="currentColor" />
        </motion.div>
      )}
      
      <div className={cn(
        "relative w-full rounded-2xl overflow-hidden bg-black/60 backdrop-blur-lg border-2 shadow-2xl transition-all duration-300",
        theme.border, theme.glow
      )}>
        {/* Background Glow */}
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
            <Shield className="w-3 h-3 text-primary" />
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
  const [timeRange, setTimeRange] = useState('season'); // Default to season
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const { data: leaderboardData, isLoading, refetch } = useLeaderboard();
  const leaderboardRef = useRef<HTMLDivElement>(null);
  
  const [comparePlayer, setComparePlayer] = useState<any>(null);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  
  const TOP_RANKS_TO_SHOW_PODIUM = 3;
  const MAX_LEADERBOARD_ROWS = 100; // Increased for better view

  const tiers = ["Legendary", "Grandmaster", "Master", "Pro", "Elite", "Veteran", "Rookie"];

  // Mock data enhancement with deterministic pseudo-randomness
  const enhancedData: EnhancedPlayer[] = useMemo(() => {
    if (!leaderboardData) return [];
    
    // Sort based on current filter first to get correct rank and filter data
    const sorted = [...leaderboardData].sort((a, b) => {
      const scoreA = filter === 'br' ? (a.br_kills || 0) : filter === 'mp' ? (a.mp_kills || 0) : (a.total_kills || 0);
      const scoreB = filter === 'br' ? (b.br_kills || 0) : filter === 'mp' ? (b.mp_kills || 0) : (b.total_kills || 0);
      return scoreB - scoreA;
    });

    return sorted.map((player) => {
      // Deterministic pseudo-random based on ID for consistent UI
      const seed = player.id?.charCodeAt(0) || 0; 
      const score = filter === 'br' ? (player.br_kills || 0) : filter === 'mp' ? (player.mp_kills || 0) : (player.total_kills || 0);
      
      // Mocked stats for UI fidelity (in production these would be real DB fields)
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
      // Apply search query filter
      const matchesSearch = p.ign?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.status === 'beta' ? 'beta' : 'main').includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesTier = tierFilter === 'all' || p.tier === tierFilter;
      
      return matchesSearch && matchesStatus && matchesTier;
    });
  }, [leaderboardData, filter, searchQuery, statusFilter, tierFilter]);

  // Fetch comparison player data if compareId is in URL
  useEffect(() => {
    const fetchCompareData = async () => {
      if (!compareId) {
        setComparePlayer(null);
        return;
      };
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', compareId)
          .single();
        
        if (profile) setComparePlayer(profile);
        else toast.error("Player not found for comparison.");
      } catch (err: any) {
        console.error("Error fetching comparison player:", err);
        toast.error(`Error fetching player: ${err.message}`);
      }
    };

    fetchCompareData();
  }, [compareId, setSearchParams]);

  // Fetch current player data for "Your Rank" section
  useEffect(() => {
    const fetchCurrentPlayerData = async () => {
      if (!user?.id) return;
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user?.id)
          .single();
        
        if (profile) setCurrentPlayer(profile);
      } catch (err: any) {
        console.error("Error fetching current player:", err);
      }
    };
    fetchCurrentPlayerData();
  }, [user?.id]);

  // Real-time updates for profile changes affecting leaderboard display
  useEffect(() => {
    const profilesChannel = supabase
      .channel('profiles-changes-leaderboard')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, [refetch]);

  // Find current user rank for highlighting
  useEffect(() => {
    if (enhancedData && user) {
      const rank = enhancedData.findIndex(p => p.id === user?.id) + 1;
      setCurrentUserRank(rank > 0 ? rank : null);
    } else {
      setCurrentUserRank(null);
    }
  }, [enhancedData, user]);

  const topThree = enhancedData.slice(0, TOP_RANKS_TO_SHOW_PODIUM);
  const restOfPlayers = enhancedData.slice(TOP_RANKS_TO_SHOW_PODIUM, MAX_LEADERBOARD_ROWS);

  const handleExport = async () => {
    if (!leaderboardRef.current) return;
    try {
      toast.info('Generating intel report...');
      
      // Dynamic import to reduce load time
      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(leaderboardRef.current, {
        backgroundColor: MODAL_BACKGROUND_COLOR,
        scale: 2,
        useCORS: true,
      });
      const url = canvas.toDataURL();
      const link = document.createElement('a');
      link.href = url;
      link.download = `NEXA-INTEL-${filter.toUpperCase()}-${new Date().toISOString().split('T')[0]}.png`;
      link.click();
      toast.success('Intel downloaded successfully');
    } catch (e: any) {
      toast.error(`Export failed: ${e.message}`);
      console.error('Export error:', e);
    }
  };

  const handleShare = async () => {
    if (!leaderboardRef.current) return;
    try {
      toast.info('Preparing intel package...');
      
      // Dynamic import to reduce load time
      const html2canvas = (await import('html2canvas')).default;

      const canvas = await html2canvas(leaderboardRef.current, {
        backgroundColor: MODAL_BACKGROUND_COLOR,
        scale: 2,
        useCORS: true,
      });
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error('Failed to create image blob.');
          return;
        }
        const file = new File([blob], `NEXA-LEADERBOARD-${filter.toUpperCase()}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'NeXa Esports Leaderboard',
            text: `Check out the top operators on the NeXa Esports ${filter === 'overall' ? 'Global' : filter.toUpperCase()} Leaderboard!`,
            files: [file]
          });
          toast.success('Intel package shared!');
        } else {
          toast.info('Sharing not supported. Downloading image instead.');
          handleExport();
        }
      });
    } catch (error: any) {
      toast.error(`Sharing failed: ${error.message}`);
      console.error('Share error:', error);
    }
  };

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]" fill="currentColor" />;
      case 2:
        return <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-gray-300 drop-shadow-[0_0_10px_rgba(209,213,219,0.3)]" />;
      case 3:
        return <Award className="w-5 h-5 sm:w-6 sm:h-6 text-amber-700 drop-shadow-[0_0_10px_rgba(180,83,9,0.3)]" />;
      default:
        return <span className="text-sm sm:text-base font-bold text-muted-foreground/60">{position}</span>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const ComparisonSection = () => {
    if (!comparePlayer || !currentPlayer) return null;

    const stats = [
      { label: 'Total Eliminations', key: 'kills', primaryColor: 'text-primary', secondaryColor: 'text-white' },
      { label: 'BR Eliminations', key: 'br_kills', primaryColor: 'text-primary', secondaryColor: 'text-white' },
      { label: 'MP Eliminations', key: 'mp_kills', primaryColor: 'text-primary', secondaryColor: 'text-white' },
      { label: 'Attendance', key: 'attendance', suffix: '%' },
    ];

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-orbitron flex items-center gap-2 text-primary uppercase tracking-wide">
            <Activity className="w-5 h-5 text-primary" />
            Operator Intel Comparison
          </h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setSearchParams({}); 
              setComparePlayer(null);
            }}
            className="text-muted-foreground hover:bg-white/5 border-white/10 transition-colors"
          >
            Clear Comparison
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ComparisonPlayerCard player={currentPlayer} title="Active Operative" />
          <ComparisonPlayerCard player={comparePlayer} title="Target Profile" isTarget />
        </div>

        <Card className="mt-8 bg-black/60 border-primary/20 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-4 sm:p-8 space-y-8">
            {stats.map((stat) => {
              const val1 = (stat.key === 'kills' ? (currentPlayer.score || currentPlayer.total_kills) : currentPlayer[stat.key]) || 0;
              const val2 = (stat.key === 'kills' ? (comparePlayer.score || comparePlayer.total_kills) : comparePlayer[stat.key]) || 0;
              
              return (
                <div key={stat.key} className="space-y-3">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-gray-500">
                    <span>{stat.label}</span>
                    <div className="flex gap-6 font-mono">
                      <span className={cn(val1 >= val2 ? "text-primary scale-110" : "text-white opacity-60")}>
                        {val1}{(stat as any).suffix || ''}
                      </span>
                      <span className="text-gray-800 font-black">X</span>
                      <span className={cn(val2 >= val1 ? "text-primary scale-110" : "text-white opacity-60")}>
                        {val2}{(stat as any).suffix || ''}
                      </span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(val1 / (val1 + val2 || 1)) * 100}%` }}
                      className={`h-full ${val1 >= val2 ? "bg-primary" : "bg-blue-600"} transition-all duration-1000 ease-out`}
                    />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(val2 / (val1 + val2 || 1)) * 100}%` }}
                      className={`h-full ${val2 >= val1 ? "bg-primary" : "bg-blue-600"} transition-all duration-1000 ease-out`}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-rajdhani">
      {/* 1. Hero Header Section */}
      <header className="relative w-full h-[280px] md:h-[400px] lg:h-[450px] overflow-hidden mb-12 group">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/60 to-background z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40 group-hover:opacity-50 transition-all duration-1000 group-hover:scale-105" />
        
        <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-end pb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4 max-w-2xl">
              <motion.div 
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}
                className="flex items-center gap-3 flex-wrap"
              >
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/50 backdrop-blur-md px-4 py-1.5 text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(218,11,29,0.3)]">
                  Season 5: Phantom War
                </Badge>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live Intel Feed
                </div>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-4xl sm:text-6xl lg:text-7xl font-black text-white font-orbitron uppercase tracking-tighter italic"
              >
                Combat <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-red-500 to-yellow-500 animate-pulse">Rankings</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="text-lg md:text-xl text-gray-400 font-rajdhani max-w-lg leading-tight"
              >
                Operational performance metrics for all elite operators in the Nexa Division. Prove your worth or be upgraded.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}
              className="flex items-center gap-2 p-1 rounded-xl bg-white/5 backdrop-blur-md border border-white/10"
            >
              <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full sm:w-auto">
                <TabsList className="bg-transparent h-12 gap-1 p-1">
                  <TabsTrigger 
                    value="overall" 
                    className="px-6 h-full font-orbitron text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all shadow-xl"
                  >
                    <Globe className="w-4 h-4 mr-2" /> Global
                  </TabsTrigger>
                  <TabsTrigger 
                    value="mp" 
                    className="px-6 h-full font-orbitron text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all shadow-xl"
                  >
                    <Swords className="w-4 h-4 mr-2" /> MP
                  </TabsTrigger>
                  <TabsTrigger 
                    value="br" 
                    className="px-6 h-full font-orbitron text-xs uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all shadow-xl"
                  >
                    <Target className="w-4 h-4 mr-2" /> BR
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4" ref={leaderboardRef}>
        
        <AnimatePresence>
          {compareId && <ComparisonSection />}
        </AnimatePresence>

        {/* 4. Filters & Controls */}
        <div className="flex flex-col lg:flex-row justify-between items-stretch gap-4 mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex items-center gap-3 flex-1">
            <div className="flex gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="flex-1 lg:w-[150px] bg-white/5 border-white/10 font-orbitron text-[10px] uppercase tracking-widest h-11">
                  <Timer className="w-3.5 h-3.5 mr-2 text-primary" />
                  <SelectValue placeholder="Horizon" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="daily" className="font-orbitron text-xs">Daily Log</SelectItem>
                  <SelectItem value="weekly" className="font-orbitron text-xs">Weekly Cycle</SelectItem>
                  <SelectItem value="season" className="font-orbitron text-xs">Full Season</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 lg:w-[130px] bg-white/5 border-white/10 font-orbitron text-[10px] uppercase tracking-widest h-11">
                  <Shield className="w-3.5 h-3.5 mr-2 text-primary" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  <SelectItem value="all" className="font-orbitron text-xs uppercase">All Status</SelectItem>
                  <SelectItem value="main" className="font-orbitron text-xs uppercase">Main Roster</SelectItem>
                  <SelectItem value="beta" className="font-orbitron text-xs uppercase">Beta Squad</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="bg-white/5 border-white/10 font-orbitron text-[10px] uppercase tracking-widest h-11">
                <Crown className="w-3.5 h-3.5 mr-2 text-primary" />
                <SelectValue placeholder="Tier Filter" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 max-h-[300px]">
                <SelectItem value="all" className="font-orbitron text-xs uppercase">All Combat Tiers</SelectItem>
                {tiers.map(t => (
                  <SelectItem key={t} value={t} className="font-orbitron text-xs uppercase">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <div className="relative flex-1 lg:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
              <Input 
                placeholder="Search Operator Intel..." 
                className="pl-11 h-11 bg-white/5 border-white/10 font-rajdhani text-sm placeholder:opacity-50 focus-visible:ring-primary/40 focus-visible:border-primary/40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={handleExport} className="h-11 w-11 bg-white/5 border-white/10 hover:text-primary transition-all shadow-lg">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="default" size="icon" onClick={handleShare} className="h-11 w-11 bg-primary hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(218,11,29,0.3)]">
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
          {/* 2. Top 3 Podium Section */}
        {topThree.length > 0 && !searchQuery && statusFilter === 'all' && tierFilter === 'all' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 items-end justify-center max-w-6xl mx-auto px-4 sm:px-0">
            {/* Rank 2 (Silver) */}
            {topThree[1] && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                transition={{ duration: 0.5, delay: 0.2 }}
                className="order-2 md:order-1"
              >
                <PodiumCard player={topThree[1]} rank={2} color="silver" />
              </motion.div>
            )}
            
            {/* Rank 1 (Gold) */}
            {topThree[0] && (
              <motion.div 
                initial={{ opacity: 0, scale: 1.1, y: 40 }} 
                animate={{ opacity: 1, scale: 1.1, y: 0 }} 
                transition={{ duration: 0.6, delay: 0.1 }}
                className="order-1 md:order-2 z-10 -mb-4 md:-mb-10 lg:-mb-12" 
              >
                <PodiumCard player={topThree[0]} rank={1} color="gold" isMvp />
              </motion.div>
            )}
 
            {/* Rank 3 (Bronze) */}
            {topThree[2] && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 30 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                transition={{ duration: 0.5, delay: 0.3 }}
                className="order-3 md:order-3"
              >
                <PodiumCard player={topThree[2]} rank={3} color="bronze" />
              </motion.div>
            )}
          </div>
        )}

        {/* 3. Main Leaderboard Table */}
        <Card className="bg-zinc-950/40 border-white/5 shadow-2x backdrop-blur-3xl overflow-hidden mb-32 border-t border-white/[0.03]">
          <div className="overflow-x-auto overflow-y-hidden">
            <table className="w-full text-left border-collapse">
              <motion.thead 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="bg-zinc-900/60 text-muted-foreground text-[10px] uppercase font-black tracking-[0.2em] font-orbitron sticky top-0 z-30"
              >
                <tr>
                  <th className="p-5 text-center w-20">Rank</th>
                  <th className="p-5 min-w-[220px]">Operative Asset</th>
                  <th className="p-5 text-center min-w-[100px] hidden lg:table-cell">Deployments</th>
                  <th className="p-5 text-center min-w-[130px] hidden md:table-cell">Success Rate</th>
                  <th className="p-5 text-center min-w-[100px] hidden sm:table-cell">K/D Ratio</th>
                  <th className="p-5 text-right min-w-[130px] pr-8">Kills</th>
                  <th className="p-5 text-center w-20 pr-5">Trend</th>
                </tr>
              </motion.thead>
              <tbody className="divide-y divide-white/[0.03]">
                {isLoading ? (
                  <tr><td colSpan={7} className="p-20 text-center text-slate-500 font-orbitron animate-pulse uppercase tracking-widest text-xs">Syncing with Central Intelligence...</td></tr>
                ) : enhancedData.length === 0 ? (
                  <tr><td colSpan={7} className="p-20 text-center text-slate-500 font-orbitron uppercase tracking-widest text-xs">No matching operators in current sector.</td></tr>
                ) : (
                  enhancedData.map((player, index) => {
                    const position = index + 1;
                    const isPodium = position <= 3 && !searchQuery && statusFilter === 'all' && tierFilter === 'all';
                    
                    return (
                      <motion.tr 
                        key={player.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index < 10 ? 0.5 + index * 0.05 : 0, duration: 0.4 }}
                        className={cn(
                          "group transition-all duration-300",
                          player.id === user?.id ? "bg-primary/[0.07] border-l-4 border-l-primary shadow-[inset_0_0_20px_rgba(218,11,29,0.05)]" : "hover:bg-white/[0.02]",
                          isPodium && "opacity-80 grayscale-[0.5] contrast-125"
                        )}
                      >
                        <td className="p-5 text-center">
                          <div className="flex items-center justify-center">
                            {getMedalIcon(position)}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="flex items-center gap-4">
                            <div className="relative group-hover:scale-110 transition-transform duration-500">
                              <div className={cn(
                                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden border-2 transition-all p-0.5",
                                player.status === 'beta' ? "border-zinc-700 bg-zinc-800" : "border-primary/40 bg-primary/10"
                              )}>
                                <img 
                                  src={player.avatar_url || "/placeholder.svg"} 
                                  alt={player.ign}
                                  className="w-full h-full object-cover rounded-lg"
                                />
                              </div>
                              {player.id === user?.id && (
                                <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-zinc-950 shadow-md animate-pulse shadow-green-500/30" />
                              )}
                            </div>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  "font-black text-sm sm:text-base uppercase tracking-tight font-orbitron italic whitespace-nowrap",
                                  player.id === user?.id ? "text-primary" : "text-white group-hover:text-primary transition-colors"
                                )}>
                                  {player.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'} {player.ign}
                                </span>
                                {player.status === 'beta' && <Badge variant="outline" className="text-[7px] h-3 px-1 border-white/20 text-white/40 font-black">BETA</Badge>}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Shield className="w-3 h-3 text-primary/70" />
                                <span className="text-[9px] sm:text-[10px] text-gray-400 font-black uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">
                                  {player.tier} • {player.grade}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-center hidden lg:table-cell">
                          <span className="font-mono text-sm text-gray-500 group-hover:text-white transition-colors">{player.matches_played}</span>
                        </td>
                        <td className="p-5 text-center hidden md:table-cell">
                          <div className="flex flex-col items-center gap-1.5">
                            <div className="flex justify-between w-full max-w-[100px] text-[8px] font-black uppercase tracking-tighter text-gray-600">
                              <span>Ops</span>
                              <span>{player.win_rate}%</span>
                            </div>
                            <div className="w-full max-w-[100px] h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/[0.02] shadow-inner">
                              <motion.div 
                                className="h-full bg-gradient-to-r from-primary to-red-600 shadow-[0_0_8px_rgba(218,11,29,0.3)]" 
                                initial={{ width: 0 }}
                                animate={{ width: `${player.win_rate}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-center hidden sm:table-cell">
                          <span className={cn(
                            "font-black text-sm sm:text-base font-orbitron",
                            player.kd_ratio >= 3 ? "text-yellow-500" : player.kd_ratio >= 1.5 ? "text-green-500" : "text-gray-400"
                          )}>
                            {player.kd_ratio}
                          </span>
                        </td>
                        <td className="p-5 text-right pr-8">
                          <div className="flex flex-col items-end">
                            <span className="text-xl sm:text-2xl font-black text-white font-orbitron group-hover:text-primary transition-colors duration-300">
                              {player.score.toLocaleString()}
                            </span>
                            <span className="text-[8px] font-black uppercase tracking-widest text-primary opacity-60">ELIMINATIONS</span>
                          </div>
                        </td>
                        <td className="p-5 text-center pr-5">
                          <div className="flex justify-center group-hover:scale-125 transition-transform">
                            {getTrendIcon(player.trend)}
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* 5. Player Rank Summary (Sticky Bottom) */}
      {user && currentUserRank !== null && (
        <motion.div 
          initial={{ y: 200 }} animate={{ y: 0 }} 
          transition={{ duration: 0.8, type: "spring", stiffness: 50 }}
          className="fixed bottom-6 left-4 right-4 md:left-auto md:right-10 md:w-[400px] z-50 px-2 sm:px-0"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-orange-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
            <Card className="relative bg-zinc-950/80 border-primary/20 shadow-2xl backdrop-blur-3xl overflow-hidden rounded-2xl">
              {/* Scanline effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_4px] pointer-events-none opacity-20" />
              
              <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-6">
                <div className="flex items-center gap-5 flex-1">
                  <div className="relative group-hover:rotate-6 transition-transform">
                    <div className="flex flex-col items-center justify-center w-14 h-14 bg-primary/20 rounded-xl border border-primary/40 shadow-[inset_0_0_15px_rgba(218,11,29,0.2)]">
                      <span className="text-[9px] text-primary/80 uppercase font-black tracking-tighter">Ranking</span>
                      <span className="text-2xl font-black text-white font-orbitron leading-none">{currentUserRank}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-[0.2em] flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" /> Personal Intel
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3 h-3 text-red-500" />
                        <span className="text-sm font-black text-white">{filter === 'br' ? (currentPlayer?.br_kills || 0) : filter === 'mp' ? (currentPlayer?.mp_kills || 0) : (currentPlayer?.total_kills || 0)} <span className="text-[10px] text-gray-500">KILLS</span></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-sm font-black text-white">TOP {Math.max(1, Math.ceil((currentUserRank / (leaderboardData?.length || 1)) * 100))}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Button 
                  size="sm" 
                  className="bg-primary hover:bg-black hover:text-primary hover:border-primary border border-transparent font-orbitron font-black text-[10px] h-10 px-5 shadow-[0_0_20px_rgba(218,11,29,0.2)] transition-all uppercase tracking-widest italic"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  Return
                </Button>
              </CardContent>
            </Card>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Statistics;
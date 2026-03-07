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
import html2canvas from 'html2canvas';
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
  const { data: leaderboardData, isLoading, refetch } = useLeaderboard();
  const leaderboardRef = useRef<HTMLDivElement>(null);
  
  const [comparePlayer, setComparePlayer] = useState<any>(null);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [currentUserRank, setCurrentUserRank] = useState<number | null>(null);
  
  const TOP_RANKS_TO_SHOW_PODIUM = 3;
  const MAX_LEADERBOARD_ROWS = 50; // Adjust as needed for pagination/display limit

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
      const seed = player.id?.charCodeAt(0) || 0; // Use first char code of ID as seed
      const score = filter === 'br' ? (player.br_kills || 0) : filter === 'mp' ? (player.mp_kills || 0) : (player.total_kills || 0);
      
      // Mocked stats for UI fidelity
      const matches = Math.floor(score * 0.8) + (seed % 50) + 50; // Ensure minimum matches
      const winRate = 45 + (seed % 25);
      const kdRatio = (1.5 + (seed % 35) / 10).toFixed(2) as unknown as number;
      const trend = seed % 3 === 0 ? 'up' : seed % 3 === 1 ? 'down' : 'neutral';
      
      return {
        ...player,
        matches_played: matches,
        win_rate: Math.min(winRate, 95), // Cap win rate
        kd_ratio: kdRatio,
        trend: trend,
        score: score
      };
    }).filter(p => 
      // Apply search query filter
      p.ign?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.status === 'beta' ? 'beta' : 'main').includes(searchQuery.toLowerCase()) ||
      (p.tier?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.grade?.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [leaderboardData, filter, searchQuery]);

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
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        // This will refetch leaderboard data when profiles change
        () => {
          console.log('Profile data updated, refreshing leaderboard...');
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
      const canvas = await html2canvas(leaderboardRef.current, {
        backgroundColor: MODAL_BACKGROUND_COLOR,
        scale: 2,
        useCORS: true, // Important for background images
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
          // Fallback to download if sharing is not supported or fails
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
        return <Crown className="w-6 h-6 text-yellow-500 drop-shadow-lg" fill="currentColor" />;
      case 2:
        return <Trophy className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-700" />;
      default:
        return <span className="text-base font-bold text-muted-foreground">{position}</span>;
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

  const getKillsForFilter = (player: EnhancedPlayer) => {
    switch (filter) {
      case 'br':
        return player.br_kills || 0;
      case 'mp':
        return player.mp_kills || 0;
      default:
        return player.total_kills || 0;
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
        transition={{ duration: 0.5 }}
        className="mb-12"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold font-orbitron flex items-center gap-2 text-primary uppercase tracking-wide">
            <Activity className="w-5 h-5 text-primary" />
            Player Intel Comparison
          </h2>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => {
              setSearchParams({}); // Clear compareId from URL
              setComparePlayer(null);
            }}
            className="text-muted-foreground hover:text-primary transition-colors"
          >
            Clear Comparison
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ComparisonPlayerCard player={currentPlayer} title="Current Asset" />
          <ComparisonPlayerCard player={comparePlayer} title="Target Intel" isTarget />
        </div>

        <Card className="mt-8 bg-black/40 border-primary/20 shadow-xl backdrop-blur-lg">
          <CardContent className="p-4 sm:p-6 space-y-6">
            {stats.map((stat) => {
              const val1 = (stat.key === 'kills' ? (currentPlayer.score || currentPlayer.total_kills) : currentPlayer[stat.key]) || 0;
              const val2 = (stat.key === 'kills' ? (comparePlayer.score || comparePlayer.total_kills) : comparePlayer[stat.key]) || 0;
              
              return (
                <div key={stat.key} className="space-y-2">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-500">
                    <span>{stat.label}</span>
                    <div className="flex gap-4 font-mono">
                      <span className={cn(val1 >= val2 ? "text-primary" : "text-white")}>
                        {val1}{(stat as any).suffix || ''}
                      </span>
                      <span className="text-gray-700">VS</span>
                      <span className={cn(val2 >= val1 ? "text-primary" : "text-white")}>
                        {val2}{(stat as any).suffix || ''}
                      </span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                    <motion.div
                      className={`h-full ${val1 >= val2 ? "bg-primary/70" : "bg-blue-500/70"} transition-all duration-700`}
                      style={{ width: `${(val1 / (val1 + val2 || 1)) * 100}%` }}
                    />
                    <motion.div
                      className={`h-full ${val2 >= val1 ? "bg-primary/70" : "bg-blue-500/70"} transition-all duration-700`}
                      style={{ width: `${(val2 / (val1 + val2 || 1)) * 100}%` }}
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
      <header className="relative w-full h-[250px] md:h-[350px] lg:h-[400px] overflow-hidden mb-12 group">
        <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/60 to-background z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40 group-hover:opacity-50 transition-opacity duration-1000" />
        
        <div className="relative z-20 container mx-auto px-4 h-full flex flex-col justify-end pb-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <motion.div 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                className="flex items-center gap-2 flex-wrap"
              >
                <Badge variant="outline" className="bg-primary/20 text-primary border-primary/50 backdrop-blur-md px-3 py-1 text-xs uppercase tracking-widest shadow-md">
                  Season 5: Phantom War
                </Badge>
                <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30 backdrop-blur-md px-3 py-1 text-xs uppercase tracking-widest flex items-center gap-1 shadow-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live Sync
                </Badge>
              </motion.div>
              <motion.h1 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="text-3xl sm:text-5xl lg:text-6xl font-black text-white font-orbitron uppercase tracking-tight"
              >
                Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-yellow-500">Leaderboard</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="text-lg text-gray-300 font-rajdhani max-w-lg"
              >
                Top operators dominating the arena. Compete, climb the ranks, and prove your elite status.
              </motion.p>
            </div>

            <motion.div 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
              className="flex items-center gap-2"
            >
              <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="flex-shrink-0">
                <TabsList className="bg-secondary/50 border border-white/5 shadow-inner">
                  <TabsTrigger value="overall" className="px-5 py-2 font-orbitron text-base uppercase tracking-wide">
                    <Globe className="w-4 h-4 mr-2" /> Global
                  </TabsTrigger>
                  <TabsTrigger value="mp" className="px-5 py-2 font-orbitron text-base uppercase tracking-wide opacity-50 cursor-not-allowed">
                    <Swords className="w-4 h-4 mr-2" /> MP
                  </TabsTrigger>
                  <TabsTrigger value="br" className="px-5 py-2 font-orbitron text-base uppercase tracking-wide opacity-50 cursor-not-allowed">
                    <Target className="w-4 h-4 mr-2" /> BR
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </motion.div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4">
        
        <AnimatePresence>
          {compareId && <ComparisonSection />}
        </AnimatePresence>

        {/* 4. Filters & Controls */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-12">
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            {/* Time Range Filter */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[140px] bg-secondary/50 border-primary/20 font-orbitron text-sm shadow-inner">
                <Timer className="w-4 h-4 mr-2 text-primary" />
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily" className="font-orbitron">Daily</SelectItem>
                <SelectItem value="weekly" className="font-orbitron">Weekly</SelectItem>
                <SelectItem value="season" className="font-orbitron">All Season</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search operator..." 
                className="pl-9 bg-secondary/50 border-primary/20 font-rajdhani shadow-inner focus-visible:ring-primary/30"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleExport} title="Download Intel" className="border-primary/20 shadow-inner">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="default" size="icon" onClick={handleShare} title="Share Intel" className="shadow-md shadow-primary/20">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 2. Top 3 Podium Section */}
        {topThree.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 items-end justify-center max-w-5xl mx-auto">
            {/* Rank 2 (Silver) */}
            {topThree[1] && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.6 }}
                className="order-2 md:order-1"
              >
                <PodiumCard player={topThree[1]} rank={2} color="silver" />
              </motion.div>
            )}
            
            {/* Rank 1 (Gold) */}
            {topThree[0] && (
              <motion.div 
                initial={{ opacity: 0, y: 50, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.7 }}
                className="order-1 md:order-2 z-10 -mb-4 md:-mb-12" 
              >
                <PodiumCard player={topThree[0]} rank={1} color="gold" isMvp />
              </motion.div>
            )}

            {/* Rank 3 (Bronze) */}
            {topThree[2] && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.6 }}
                className="order-3 md:order-3"
              >
                <PodiumCard player={topThree[2]} rank={3} color="bronze" />
              </motion.div>
            )}
          </div>
        )}

        {/* 3. Main Leaderboard Table */}
        <Card className="bg-black/40 border-primary/10 shadow-xl backdrop-blur-xl overflow-hidden mb-24">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <motion.thead 
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.6 }}
                className="bg-secondary/50 text-muted-foreground text-xs uppercase font-bold tracking-wider font-orbitron sticky top-0 z-30"
              >
                <tr>
                  <th className="p-3 sm:p-4 text-center w-12 sm:w-16">Rank</th>
                  <th className="p-3 sm:p-4 min-w-[140px] sm:min-w-[200px]">Operator</th>
                  <th className="p-3 sm:p-4 text-center min-w-[80px] sm:min-w-[100px] hidden md:table-cell">Matches</th>
                  <th className="p-3 sm:p-4 text-center min-w-[100px] sm:min-w-[120px] hidden md:table-cell">Win Rate</th>
                  <th className="p-3 sm:p-4 text-center min-w-[80px] sm:min-w-[100px] hidden sm:table-cell">K/D</th>
                  <th className="p-3 sm:p-4 text-right min-w-[100px] sm:min-w-[120px]">Score</th>
                  <th className="p-3 sm:p-4 text-center w-12 sm:w-16">Trend</th>
                </tr>
              </motion.thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      Initializing uplink...
                    </td>
                  </tr>
                ) : restOfPlayers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No operators found in this sector.
                    </td>
                  </tr>
                ) : (
                  restOfPlayers.map((player, index) => {
                    const position = index + 4; // Start rank from 4
                    
                    return (
                      <motion.tr 
                        key={player.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 + index * 0.02, duration: 0.5 }}
                        className={cn(
                          "group hover:bg-white/5 border-b border-primary/10 transition-colors",
                          player.id === user?.id && "bg-primary/5 shadow-inner shadow-primary/10 border-l-2 border-primary"
                        )}
                      >
                        <td className="p-3 sm:p-4 text-center font-bold text-gray-400 w-12 sm:w-16">
                          {getMedalIcon(position)}
                        </td>
                        <td className="p-3 sm:p-4 min-w-[140px] sm:min-w-[200px]">
                          <div className="flex items-center gap-2 sm:gap-3">
                            <div className="relative flex-shrink-0">
                              <img 
                                src={player.avatar_url || "/placeholder.svg"} 
                                alt={player.ign}
                                className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg object-cover border-2 border-primary/30 group-hover:border-primary/50 transition-colors"
                              />
                              {player.id === user?.id && (
                                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-black shadow-md animate-pulse" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                                {player.ign}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground font-bold uppercase tracking-widest">
                                <Shield className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                                {player.tier} • {player.grade}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 text-center text-gray-300 hidden md:table-cell min-w-[80px] sm:min-w-[100px]">
                          {player.matches_played}
                        </td>
                        <td className="p-3 sm:p-4 text-center hidden md:table-cell min-w-[100px] sm:min-w-[120px]">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 sm:w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                              <motion.div 
                                className="h-full bg-primary" 
                                style={{ width: `${player.win_rate}%` }}
                                initial={{ width: 0 }}
                                animate={{ width: `${player.win_rate}%` }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                            <span className="text-xs font-bold text-primary">{player.win_rate}%</span>
                          </div>
                        </td>
                        <td className="p-3 sm:p-4 text-center font-mono text-yellow-500/80 hidden sm:table-cell min-w-[80px] sm:min-w-[100px]">
                          {player.kd_ratio}
                        </td>
                        <td className="p-3 sm:p-4 text-right font-black text-lg sm:text-xl text-primary font-orbitron min-w-[100px] sm:min-w-[120px]">
                          {player.score.toLocaleString()}
                        </td>
                        <td className="p-3 sm:p-4 text-center w-12 sm:w-16">
                          {getTrendIcon(player.trend)}
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

      {/* 5. Player Rank Summary (Fixed Bottom on Mobile, Card on Desktop) */}
      {user && currentUserRank !== null && (
        <motion.div 
          initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 z-40"
        >
          <Card className="bg-black/70 border-primary/20 shadow-2xl shadow-primary/20 backdrop-blur-xl">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-primary/20 rounded-lg border border-primary/30 shadow-inner">
                  <span className="text-[10px] text-primary uppercase font-bold">Rank</span>
                  <span className="text-xl font-black text-white font-orbitron">{currentUserRank}</span>
                </div>
                <div>
                  <div className="text-sm text-gray-400 font-bold uppercase tracking-wider mb-1">Your Intel</div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span className="flex items-center gap-1 text-yellow-500">
                      <Target className="w-3 h-3" />
                      {filter === 'br' ? (currentPlayer?.br_kills || 0) : filter === 'mp' ? (currentPlayer?.mp_kills || 0) : (currentPlayer?.total_kills || 0)} Kills
                    </span>
                    <span className="flex items-center gap-1 text-green-500">
                      <TrendingUp className="w-3 h-3" />
                      Top {Math.ceil((currentUserRank / (enhancedData.length || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
              <Button size="sm" className="font-orbitron font-bold shadow-md" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                Top
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default Statistics;
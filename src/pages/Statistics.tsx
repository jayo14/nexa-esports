import { FC, useState, useEffect, useRef, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { supabase } from '@/integrations/supabase/client';
import { Award, Trophy, Target, Share2, Link2, Download, ArrowRightLeft, User, TrendingUp, Shield, Activity } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from "@/lib/utils";

const ComparisonPlayerCard = ({ player, title, isTarget }: { player: any; title: string; isTarget?: boolean }) => (
  <Card className={cn(
    "bg-black/40 border-white/5 relative overflow-hidden group",
    isTarget ? "border-primary/30" : "border-blue-500/30"
  )}>
    <div className={cn(
      "absolute top-0 left-0 w-full h-1",
      isTarget ? "bg-primary" : "bg-blue-500"
    )} />
    <CardContent className="p-6">
      <div className="flex items-center gap-4">
        <div className="relative">
          <img 
            src={player.avatar_url || "/placeholder.svg"} 
            alt={player.ign}
            className="w-16 h-16 rounded-lg object-cover border-2 border-white/10"
          />
          <div className={cn(
            "absolute -bottom-2 -right-2 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
            isTarget ? "bg-primary text-white" : "bg-blue-500 text-white"
          )}>
            {isTarget ? "TARGET" : "ASSET"}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">{title}</div>
          <h3 className="text-xl font-black text-white font-orbitron italic">
            {player.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{player.ign}
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

const Statistics: FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const compareId = searchParams.get('compare');
  
  const [filter, setFilter] = useState<'overall' | 'br' | 'mp'>('overall');
  const [limit] = useState(10);
  const { data: leaderboardData, isLoading, refetch } = useLeaderboard();
  const leaderboardRef = useRef<HTMLDivElement>(null);
  
  const [comparePlayer, setComparePlayer] = useState<any>(null);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [isComparing, setIsComparing] = useState(!!compareId);

  useEffect(() => {
    const fetchCompareData = async () => {
      if (!compareId) return;
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', compareId)
          .single();
        
        if (profile) setComparePlayer(profile);
      } catch (err) {
        console.error("Error fetching comparison player:", err);
      }
    };

    const fetchCurrentPlayerData = async () => {
      if (!user?.id) return;
      
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profile) setCurrentPlayer(profile);
      } catch (err) {
        console.error("Error fetching current player:", err);
      }
    };

    fetchCompareData();
    fetchCurrentPlayerData();
  }, [compareId, user?.id]);

  // Real-time updates for attendance changes
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
        () => {
          console.log('Profiles updated, refreshing leaderboard');
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profilesChannel);
    };
  }, [refetch]);

  const filteredData = useMemo(() => {
    if (!leaderboardData) return [];
    
    let sortedData = [...leaderboardData];
    
    switch (filter) {
      case 'br':
        sortedData.sort((a, b) => (b.br_kills || 0) - (a.br_kills || 0));
        break;
      case 'mp':
        sortedData.sort((a, b) => (b.mp_kills || 0) - (a.mp_kills || 0));
        break;
      default:
        sortedData.sort((a, b) => (b.total_kills || 0) - (a.total_kills || 0));
    }
    
    return sortedData.slice(0, limit);
  }, [leaderboardData, filter, limit]);

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="bg-card/50 backdrop-blur border-primary/20">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">Please log in to view statistics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const handleExportImage = async () => {
    if (!leaderboardRef.current) return;
    
    try {
      toast.info('Generating image...');
      const canvas = await html2canvas(leaderboardRef.current, {
        backgroundColor: '#0a0a0f',
        scale: 2,
      });
      
      canvas.toBlob((blob) => {
        if (!blob) return;
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `nexa-leaderboard-${filter}-${new Date().toISOString().split('T')[0]}.png`;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('Leaderboard image downloaded!');
      });
    } catch (error) {
      toast.error('Failed to export image');
      console.error('Export error:', error);
    }
  };

  const handleShare = async () => {
    if (!leaderboardRef.current) return;
    
    try {
      const canvas = await html2canvas(leaderboardRef.current, {
        backgroundColor: '#0a0a0f',
        scale: 2,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], `nexa-leaderboard-${filter}.png`, { type: 'image/png' });
        
        if (navigator.share && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'NeXa Esports Leaderboard',
            text: `Check out the top ${limit} players in ${filter === 'overall' ? 'overall' : filter.toUpperCase()} kills!`,
            files: [file]
          });
          toast.success('Shared successfully!');
        } else {
          // Fallback to download
          handleExportImage();
        }
      });
    } catch (error) {
      toast.error('Failed to share');
      console.error('Share error:', error);
    }
  };

  const getMedalIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Award className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{position}</span>;
    }
  };

  const getKillsForFilter = (player: any) => {
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
      { label: 'Total Eliminations', key: 'kills' },
      { label: 'BR Eliminations', key: 'br_kills' },
      { label: 'MP Eliminations', key: 'mp_kills' },
      { label: 'Attendance', key: 'attendance', suffix: '%' },
    ];

    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold font-orbitron flex items-center gap-2 text-primary">
            <ArrowRightLeft className="w-5 h-5" />
            Operational Comparison
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              setSearchParams({});
              setComparePlayer(null);
            }}
            className="text-muted-foreground hover:text-white"
          >
            Clear Comparison
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player Cards */}
          <ComparisonPlayerCard player={currentPlayer} title="You (Current Asset)" />
          <ComparisonPlayerCard player={comparePlayer} title="Target Objective" isTarget />
        </div>

        <Card className="mt-6 bg-black/40 border-primary/20 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="space-y-6">
              {stats.map((stat) => {
                const val1 = currentPlayer[stat.key] || 0;
                const val2 = comparePlayer[stat.key] || 0;
                const max = Math.max(val1, val2, 1);
                
                return (
                  <div key={stat.key} className="space-y-2">
                    <div className="flex justify-between text-xs font-black uppercase tracking-widest text-gray-500">
                      <span>{stat.label}</span>
                      <div className="flex gap-4 font-mono">
                        <span className={cn(val1 >= val2 ? "text-primary" : "text-white")}>
                          {val1}{stat.suffix}
                        </span>
                        <span className="text-gray-700">VS</span>
                        <span className={cn(val2 >= val1 ? "text-primary" : "text-white")}>
                          {val2}{stat.suffix}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
                      <div 
                        className="h-full bg-blue-500/50 transition-all duration-1000"
                        style={{ width: `${(val1 / (val1 + val2 || 1)) * 100}%` }}
                      />
                      <div 
                        className="h-full bg-primary/50 transition-all duration-1000"
                        style={{ width: `${(val2 / (val1 + val2 || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="container mx-auto px-2 py-2 sm:px-4 sm:py-4">
      <div className="mb-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-orbitron mb-1 uppercase tracking-tight">
          System Intelligence
        </h1>
        <p className="text-muted-foreground font-rajdhani text-sm uppercase tracking-widest">
          Performance rankings & Behavioral Analysis
        </p>
      </div>

      <AnimatePresence>
        {comparePlayer && <ComparisonSection />}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row justify-end gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={handleCopyLink}>
          <Link2 className="w-4 h-4 mr-2" />
          Copy Link
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportImage}>
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>
        <Button variant="default" size="sm" onClick={handleShare}>
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-3">
          <TabsTrigger value="mp" className="flex items-center gap-2">
            <Award className="w-4 h-4" />
            Multiplayer
          </TabsTrigger>
          <TabsTrigger value="br" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Battle Royale
          </TabsTrigger>
          <TabsTrigger value="overall" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            Overall
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          <Card ref={leaderboardRef} className="bg-card/50 backdrop-blur border-primary/20">
            <CardHeader className="pb-2 pt-3">
              <CardTitle className="font-orbitron flex items-center gap-2 text-base sm:text-lg">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                Top {limit} - {filter === 'overall' ? 'Overall' : filter.toUpperCase()} Kills
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-1 pb-3">
              {isLoading ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">Loading leaderboard...</p>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No data available yet.</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredData.map((player, index) => {
                    const kills = getKillsForFilter(player);
                    const position = index + 1;
                    
                    return (
                      <div
                        key={player.id}
                        className={`
                          flex items-center gap-2 p-2 sm:p-2.5 rounded-lg transition-all
                          ${position === 1 ? 'bg-gradient-to-r from-yellow-500/10 to-transparent border border-yellow-500/30' :
                            position === 2 ? 'bg-gradient-to-r from-gray-400/10 to-transparent border border-gray-400/30' :
                            position === 3 ? 'bg-gradient-to-r from-amber-600/10 to-transparent border border-amber-600/30' :
                            'bg-secondary/30 border border-border/50'}
                        `}
                      >
                        <div className="flex items-center justify-center w-8 sm:w-10">
                          {getMedalIcon(position)}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {player.avatar_url ? (
                            <img 
                              src={player.avatar_url} 
                              alt={player.ign}
                              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-primary/30 flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                              <span className="text-primary font-bold text-sm">{player.ign?.[0] || '?'}</span>
                            </div>
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground text-sm sm:text-base truncate">
                              {(player as any).is_banned && <span className="text-red-500 mr-1">[BANNED]</span>}
                              {(player as any).status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{player.ign}
                            </p>
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">
                              {player.tier} • {player.grade}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0">
                          <p className="text-xl sm:text-2xl font-bold text-primary">{kills}</p>
                          <p className="text-xs text-muted-foreground">kills</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Statistics;
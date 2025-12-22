import { FC, useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { supabase } from '@/integrations/supabase/client';
import { Award, Trophy, Target, Share2, Link2, Download } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';

const Statistics: FC = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState<'overall' | 'br' | 'mp'>('overall');
  const [limit] = useState(10);
  const { data: leaderboardData, isLoading, refetch } = useLeaderboard();
  const leaderboardRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="container mx-auto px-2 py-2 sm:px-4 sm:py-4">
      <div className="mb-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-orbitron mb-1">
          Player Statistics & Leaderboard
        </h1>
        <p className="text-muted-foreground font-rajdhani text-sm">
          Performance rankings - Updated in real-time
        </p>
      </div>

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
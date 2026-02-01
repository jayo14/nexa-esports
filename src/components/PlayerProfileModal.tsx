import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  X, Crosshair, Trophy, Smartphone, Activity, 
  Shield, Zap, User, Target, BarChart3, 
  Calendar, Lock, Unlock, Share2, AlertCircle,
  ChevronRight, ArrowUpRight, ShieldCheck, Cpu,
  ArrowRightLeft, Edit
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlayerProfileModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    player: any | null;
    rank?: number | null;
    onEdit?: (player: any) => void;
}

// Simplified Stat Bar Component (CSS-based animation)
const StatBar = ({ label, value, max, color = "primary" }: { label: string; value: number; max: number; color?: "primary" | "cyan" | "purple" }) => {
  const percent = Math.min(100, (value / max) * 100);
  
  const colors = {
    primary: "bg-primary",
    cyan: "bg-cyan-500",
    purple: "bg-purple-500",
  };

  return (
    <div className="mb-4">
      <div className="flex justify-between text-[10px] uppercase tracking-[0.2em] text-gray-500 mb-1.5 font-bold">
        <span>{label}</span>
        <span className="text-white font-mono">{value.toLocaleString()}</span>
      </div>
      <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
        <div
          style={{ width: `${percent}%` }}
          className={cn(
            "h-full rounded-full transition-all duration-1000 ease-out",
            colors[color]
          )}
        />
      </div>
    </div>
  );
};

const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({open, onOpenChange, player: initialPlayer, rank: initialRank, onEdit}) => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [fullPlayer, setFullPlayer] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [rank, setRank] = useState<number | null>(initialRank || null);
    const [activeTab, setActiveTab] = useState<"BR" | "MP">("BR");
    const [revealContact, setRevealContact] = useState(false);
    const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

    // Deep linking logic
    useEffect(() => {
      if (open && initialPlayer?.id) {
        const currentPath = window.location.pathname;
        navigate(`${currentPath}?playerId=${initialPlayer.id}`, { replace: true });
      }
    }, [open, initialPlayer?.id, navigate]);

    // Fetch current user profile for permissions
    useEffect(() => {
      const fetchCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();
          if (profile) {
            setCurrentUserProfile(profile);
          }
        }
      };
      fetchCurrentUser();
    }, []);

    // Optimized data fetching - single query with rank calculation
    useEffect(() => {
      const fetchData = async (id: string) => {
        setIsLoading(true);
        try {
          // Single query with rank calculation
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();
          
          if (profileData) {
            setFullPlayer(profileData);
            
            // Only fetch rank if not provided - use COUNT instead of full leaderboard
            if (!initialRank) {
              const playerKills = profileData.kills || 0;
              const { count } = await supabase
                .from('leaderboard')
                .select('id', { count: 'exact', head: true })
                .gt('total_kills', playerKills);
              
              if (count !== null) {
                setRank(count + 1);
              }
            }
          }
        } catch (error) {
          console.error("Error fetching player data:", error);
        } finally {
          setIsLoading(false);
        }
      };

      const idFromUrl = searchParams.get('playerId');
      if (open) {
        if (initialPlayer?.id) {
          fetchData(initialPlayer.id);
        }
      } else if (idFromUrl) {
        onOpenChange(true);
        fetchData(idFromUrl);
      }
    }, [open, initialPlayer?.id, searchParams, initialRank]);

    // Simplified insights (removed useMemo for simple operations)
    const getAnalysis = () => {
      if (!fullPlayer) return [];
      const insights = [];
      const totalKills = fullPlayer.kills || 0;
      const brKills = fullPlayer.br_kills || 0;
      const mpKills = fullPlayer.mp_kills || 0;
      
      if (fullPlayer.attendance < 20) {
        insights.push("Low mission activity detected");
      } else if (fullPlayer.attendance > 80) {
        insights.push("High operational consistency");
      }

      if (Math.abs(brKills - mpKills) < totalKills * 0.2) {
        insights.push("Balanced BR/MP participation");
      } else if (brKills > mpKills) {
        insights.push("Battle Royale specialist");
      } else {
        insights.push("Multiplayer combat specialist");
      }

      if (totalKills > 1000 || fullPlayer.grade === 'Legendary' || fullPlayer.grade === 'Master') {
        insights.push("Elite combat performance");
      }

      return insights;
    };

    if (!open) return null;

    const p = fullPlayer || initialPlayer;
    if (!p) return null;

    const playerPrefix = p.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂';
    const isActive = !p.is_banned;

    return (
        <Dialog open={open} onOpenChange={(val) => {
          if (!val) {
            const currentPath = window.location.pathname;
            navigate(currentPath, { replace: true });
          }
          onOpenChange(val);
        }}>
      <DialogContent className={cn(
        "p-0 gap-0 bg-black/95 backdrop-blur-2xl border-white/10 overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.9)]",
        "max-w-full sm:max-w-[95vw] md:max-w-5xl h-[100dvh] sm:h-[85vh]",
        "sm:rounded-xl"
      )}>
        {/* Sci-fi Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[80px] rounded-full" />
        </div>

        <button 
          onClick={() => onOpenChange(false)}
          className="absolute top-4 right-4 z-50 p-2 text-gray-500 hover:text-primary transition-colors rounded-full"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="h-full flex flex-col relative z-10 overflow-y-auto">
            
            {/* Header Section */}
            <div className="p-6 md:p-10 flex flex-col md:flex-row gap-8 items-center md:items-start border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
              
              {/* Avatar Card */}
              <div className="relative shrink-0">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-lg overflow-hidden border-2 border-primary/40 p-1 bg-black/40">
                  <div className="w-full h-full rounded-[4px] overflow-hidden relative">
                    <img 
                      src={p.avatar_url || "/placeholder.svg"} 
                      alt={p.ign}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                </div>
                
                {/* Neon Corners */}
                <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-sm" />
                <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-sm" />

                {/* Rank Badge */}
                {(rank || p.kills) && (
                  <div className="absolute -bottom-4 -right-4 bg-black border border-primary/50 text-white px-3 py-1.5 rounded text-xs font-black shadow-2xl flex flex-col items-center min-w-[60px]">
                    <span className="text-[8px] text-primary uppercase tracking-tighter">Combat Rank</span>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-3 h-3 text-yellow-500" />
                      <span className="font-mono text-lg">#{rank || '??'}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Identity Info */}
              <div className="flex-1 text-center md:text-left pt-2">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-3">
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter uppercase">
                    {p.ign}
                  </h1>
                  <div className={cn(
                    "px-3 py-1 rounded text-[10px] font-black tracking-[0.2em] border",
                    isActive 
                      ? "border-green-500/50 text-green-400 bg-green-500/10" 
                      : "border-red-500/50 text-red-400 bg-red-500/10"
                  )}>
                    {isActive ? "● ACTIVE" : "● OFFLINE"}
                  </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-3 md:gap-6 text-sm font-mono text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="text-primary font-black text-lg">{playerPrefix}</span>
                    <span className="text-white font-bold text-lg font-mono">{p.ign}</span>
                  </div>
                  <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-white/10" />
                  <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded border border-white/5">
                    <User className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-gray-300">@{p.username || p.ign?.toLowerCase() || ''}</span>
                  </div>
                  <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-white/10" />
                  <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded border border-primary/20">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span className="text-primary font-black uppercase text-[10px] tracking-widest">{p.role || 'Player'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Overview Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 border-b border-white/5 bg-black/20">
              <StatQuickCard icon={<Trophy className="text-yellow-500" />} label="Rank" value={rank ? `#${rank}` : 'Unranked'} />
              <StatQuickCard icon={<Shield className="text-purple-500" />} label="Tier" value={p.tier || p.grade || "N/A"} />
              <StatQuickCard icon={<Crosshair className="text-primary" />} label="Specialty" value={p.preferred_mode || "BOTH"} />
              <StatQuickCard icon={<Activity className="text-green-500" />} label="Attendance" value={`${p.attendance || 0}%`} />
              <StatQuickCard icon={<Smartphone className="text-blue-500" />} label="Device" value={p.device || "Mobile"} className="col-span-2 md:col-span-1" />
            </div>

            <div className="p-6 md:p-10 space-y-10">
              {/* Performance & Combat Analysis */}
              <div className="grid md:grid-cols-2 gap-8">
                
                {/* Left: Combat Stats */}
                <div className="bg-white/[0.02] rounded-xl border border-white/5 p-6 relative overflow-hidden">
                  <div className="flex items-center justify-between mb-8">
                    <h3 className="text-sm font-black text-white flex items-center gap-3 uppercase tracking-[0.2em]">
                      <Target className="w-5 h-5 text-primary" />
                      Combat Dossier
                    </h3>
                    <div className="text-[10px] text-primary/50 font-mono font-bold tracking-widest">ENCRYPTED</div>
                  </div>
                  
                  <div className="space-y-6">
                    <StatBar label="Total Eliminations" value={p.kills || 0} max={10000} color="primary" />
                    <StatBar label="BR Deployments" value={p.br_kills || 0} max={5000} color="cyan" />
                    <StatBar label="MP Engagements" value={p.mp_kills || 0} max={5000} color="purple" />
                    
                    <div className="grid grid-cols-2 gap-6 mt-8 pt-6 border-t border-white/10">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Efficiency</div>
                        <div className="text-3xl font-mono text-white font-bold tracking-tighter">
                          {((p.kills || 0) / (p.attendance || 1)).toFixed(2)} <span className="text-xs text-gray-600">Avg</span>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Grade</div>
                        <div className="text-3xl font-mono text-primary font-bold tracking-tighter uppercase">{p.grade || 'R'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: AI Analysis */}
                <div className="relative rounded-xl border border-primary/20 p-1 overflow-hidden h-full">
                  <div className="bg-[#0a0a0a] rounded-lg p-6 relative h-full">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-primary" />
                        <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">System Intelligence</h3>
                      </div>
                      <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[8px] text-primary font-black uppercase">AI Analysis</div>
                    </div>

                    <div className="space-y-4 font-mono text-xs leading-relaxed">
                      {getAnalysis().length > 0 ? getAnalysis().map((insight, idx) => (
                        <div 
                          key={idx}
                          className="flex gap-3 text-gray-400"
                        >
                          <span className="text-primary font-black">{`>`}</span>
                          <span>{insight}</span>
                        </div>
                      )) : (
                        <div className="text-gray-600 italic">Insufficient data...</div>
                      )}
                      
                      <div className="pt-6 flex items-center gap-3 text-[10px] text-green-400 font-black tracking-widest border-t border-white/5">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        STATUS: OPTIMIZED
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Breakdown (Tabs) */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 border-b border-white/5">
                  {["BR", "MP"].map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setActiveTab(mode as "BR" | "MP")}
                      className={cn(
                        "px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] transition-colors relative",
                        activeTab === mode 
                          ? "text-white" 
                          : "text-gray-600 hover:text-gray-400"
                      )}
                    >
                      {mode} OPS
                      {activeTab === mode && (
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ModeDetailCard 
                    title="Engagements" 
                    value={activeTab === "BR" ? (p.br_kills || 0) : (p.mp_kills || 0)} 
                    subtext="Confirmed Kills"
                    color={activeTab === "BR" ? "cyan" : "purple"}
                  />
                  <ModeDetailCard 
                    title="Avg Score" 
                    value={activeTab === "BR" ? "1,240" : "3,400"} 
                    subtext="Operational Output"
                    color={activeTab === "BR" ? "cyan" : "purple"}
                  />
                  <ModeDetailCard 
                    title="Mission Success" 
                    value={activeTab === "BR" ? "12.5%" : "45.0%"} 
                    subtext="Win Probability"
                    color={activeTab === "BR" ? "cyan" : "purple"}
                  />
                </div>
              </div>

              {/* 7. Activity & History */}
              <div className="border-t border-white/5 pt-10">
                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.4em] mb-8 flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-primary" /> Operational Timeline
                </h4>
                <div className="relative pl-8 border-l-2 border-primary/20 space-y-10 ml-2">
                  <TimelineEvent 
                    date="CURRENT" 
                    title="Last Known Location" 
                    desc={`Connected via ${p.device || "Classified Hardware"}`} 
                    active 
                  />
                  <TimelineEvent 
                    date={p.date_joined ? new Date(p.date_joined).getFullYear().toString() : "2024"} 
                    title="System Recruitment" 
                    desc="Identity verified and added to Nexa Elite database." 
                  />
                </div>
              </div>

              {/* 8. Contact & Account Info */}
              <div className="bg-primary/5 rounded-xl p-6 border border-primary/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-lg bg-black border transition-all duration-500",
                    revealContact ? "text-green-400 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "text-gray-600 border-white/10"
                  )}>
                    {revealContact ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1">Classified Intel</div>
                    <div className="text-sm text-white font-mono tracking-tighter">
                      {revealContact ? (p.email || "No Email Provided") : "••••••••••••@••••.com"}
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => setRevealContact(!revealContact)}
                  className="w-full sm:w-auto h-10 border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/5"
                >
                  {revealContact ? "Mask Intel" : "Decrypt Contact"}
                </Button>
              </div>

            </div>

          {/* Action Buttons (Footer) */}
          <div className="p-6 border-t border-white/10 bg-black/60 backdrop-blur-xl flex flex-col sm:flex-row justify-end gap-4">
            {currentUserProfile && (currentUserProfile.role === 'admin' || currentUserProfile.role === 'clan_master') && onEdit && (
              <Button 
                variant="outline"
                onClick={() => {
                  onEdit(p);
                  onOpenChange(false);
                }}
                className="h-14 px-8 border border-primary/50 text-primary font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary/10"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Player
              </Button>
            )}
            <Button 
              variant="ghost"
              onClick={() => {
                navigate(`/statistics?compare=${p.id}`);
                onOpenChange(false);
                toast.success(`Loading comparison for ${p.ign}`);
              }}
              className="h-14 px-8 border border-white/5 text-gray-400 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-white/5 hover:text-white"
            >
              <ArrowRightLeft className="w-4 h-4 mr-2 text-primary" />
              Compare Ops
            </Button>
            <Button 
              onClick={() => {
                navigate(`/public-profile/${p.id}`);
                onOpenChange(false);
              }}
              className="h-14 px-10 bg-primary/10 border-2 border-primary/50 text-primary font-black uppercase tracking-[0.2em] text-[10px] hover:bg-primary hover:text-white transition-colors group"
            >
              <ArrowUpRight className="w-4 h-4 mr-2" />
              Detailed Analytics
            </Button>
          </div>

        </div>
      </DialogContent>
    </Dialog>
)};

// --- Helper Components ---

const StatQuickCard = ({ icon, label, value, className }: { icon: React.ReactNode; label: string; value: string; className?: string }) => (
  <div className={cn(
    "p-4 flex flex-col items-center justify-center text-center hover:bg-white/5 transition-colors border-r border-white/5 last:border-r-0",
    className
  )}>
    <div className="mb-2 opacity-50">{icon}</div>
    <div className="text-[8px] text-gray-500 uppercase font-black tracking-[0.3em] mb-1">{label}</div>
    <div className="text-sm font-mono font-black text-white tracking-tighter">{value}</div>
  </div>
);

const ModeDetailCard = ({ title, value, subtext, color }: { title: string; value: string | number; subtext: string; color: "cyan" | "purple" }) => {
  const accentColor = color === "cyan" ? "text-cyan-400" : "text-purple-400";
  const borderColor = color === "cyan" ? "border-cyan-500/20" : "border-purple-500/20";

  return (
    <div className={cn(
      "bg-black/40 p-6 rounded-xl border transition-colors", 
      borderColor
    )}>
      <div className="text-[10px] text-gray-500 uppercase font-black tracking-widest">{title}</div>
      <div className={cn("text-3xl font-mono font-black my-2 tracking-tighter", accentColor)}>
        {value.toLocaleString()}
      </div>
      <div className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">{subtext}</div>
    </div>
  );
};

const TimelineEvent = ({ date, title, desc, active }: { date: string; title: string; desc: string; active?: boolean }) => (
  <div className="relative">
    <div className={cn(
      "absolute -left-[41px] top-1.5 w-4 h-4 rounded-sm border-2 rotate-45 transition-colors",
      active ? "bg-primary border-primary" : "bg-black border-primary/30"
    )} />
    <div className="text-[10px] text-primary/60 font-black font-mono mb-1 tracking-widest">{date}</div>
    <div className={cn("font-black text-xs uppercase tracking-[0.2em] mb-1.5", active ? "text-white" : "text-gray-400")}>{title}</div>
    <div className="text-[11px] text-gray-600 font-medium leading-relaxed max-w-sm">{desc}</div>
  </div>
);

export default PlayerProfileModal;
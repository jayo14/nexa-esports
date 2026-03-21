import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Shield,
  Target,
  Calendar,
  Award,
  ArrowLeft,
  Copy,
  Share2,
  Smartphone,
  MessageSquare,
  Crown,
  ShieldCheck,
  UserCog,
  User,
  Settings,
  Plus,
} from 'lucide-react';
import { FaTiktok, FaYoutube, FaDiscord, FaInstagram } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/* ─────────────── Design Tokens ─────────────── */
const C = {
  primary: '#ec1313',
  bgDark: '#0a0a0b',
  card: '#1a0b0d',
  accent: '#ea2a33',
};

const glassPanel: React.CSSProperties = {
  background: 'rgba(26, 11, 13, 0.8)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(236, 19, 19, 0.15)',
};

export const PublicProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { profile: loggedInProfile } = useAuth();
  const { getOrCreateDirectConversation } = useChat();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const handleMessage = async () => {
    if (!userId) return;
    if (userId === loggedInProfile?.id) {
      toast({ title: "Note", description: "This is your own profile" });
      return;
    }
    try {
      const conversationId = await getOrCreateDirectConversation({ otherUserId: userId });
      navigate(`/chat/${conversationId}`);
    } catch (err: any) {
      toast({
        title: "Communication Failure",
        description: err.message || "Could not establish secure channel.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Intercepted", description: "Profile intel copied to clipboard" });
  };

  const getGradeColor = (grade: string) => {
    const colors = {
      'S': 'text-yellow-400 border-yellow-400/50 bg-yellow-400/20',
      'A': 'text-green-400 border-green-400/50 bg-green-400/20',
      'B': 'text-blue-400 border-blue-400/50 bg-blue-400/20',
      'C': 'text-orange-400 border-orange-400/50 bg-orange-400/20',
      'D': 'text-red-400 border-red-400/50 bg-red-400/20',
    };
    return colors[grade as keyof typeof colors] || 'text-gray-400 border-gray-400/50 bg-gray-400/20';
  };

  const canSeePrivateInfo =
    loggedInProfile?.role === 'admin' ||
    loggedInProfile?.role === 'clan_master' ||
    loggedInProfile?.id === userId;

  const RoleBadge = ({ role }: { role: string }) => {
    const iconMap = {
      'clan_master': <Crown className="w-3.5 h-3.5" />,
      'admin': <ShieldCheck className="w-3.5 h-3.5" />,
      'moderator': <UserCog className="w-3.5 h-3.5" />,
      'player': <User className="w-3.5 h-3.5" />,
    };
    const labels = {
      'clan_master': 'Clan Master',
      'admin': 'Admin',
      'moderator': 'Moderator',
      'player': 'Operative',
    };
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-400">
        {iconMap[role as keyof typeof iconMap] || iconMap['player']}
        {labels[role as keyof typeof labels] || labels['player']}
      </div>
    );
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: C.bgDark }}>
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2" style={{ borderColor: C.primary }}></div>
    </div>
  );

  if (error || !user) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-white gap-4" style={{ background: C.bgDark }}>
      <p className="text-slate-400 font-bold uppercase tracking-widest">Operative Data Not Found</p>
      <Button onClick={() => navigate('/dashboard')} variant="outline" className="border-white/10">Abort Mission</Button>
    </div>
  );

  return (
    <div className="min-h-screen text-white p-4 md:p-8 lg:p-12 font-sans" style={{ background: `radial-gradient(circle at top right, ${C.card}, ${C.bgDark} 70%)` }}>
      <div className="max-w-5xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <Link to="/players" className="flex items-center text-slate-500 hover:text-white transition-all text-xs font-black uppercase tracking-widest">
            <ArrowLeft className="w-4 h-4 mr-2" /> All Operatives
          </Link>
          {loggedInProfile?.role === 'admin' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/admin/players')}
              className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors"
            >
              <Settings className="w-4 h-4 mr-2" /> Admin Console
            </Button>
          )}
        </div>

        {/* ── Header Card ── */}
        <section
          className="rounded-[2.5rem] overflow-hidden shadow-2xl relative"
          style={glassPanel}
        >
          <div className="absolute top-0 left-0 w-full h-32 opacity-20" style={{ background: `linear-gradient(to bottom, ${C.primary}, transparent)` }} />
          
          <div className="p-8 md:p-12 relative flex flex-col md:flex-row items-center gap-10">
            {/* Avatar */}
            <div className="relative group">
              <div className="w-40 h-40 rounded-[2.5rem] overflow-hidden border-4 rotate-3 group-hover:rotate-0 transition-transform duration-500 bg-slate-800" style={{ borderColor: `${C.primary}4d` }}>
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl font-black">{user.ign?.[0] || user.username?.[0]}</div>
                )}
              </div>
              <div className="absolute -bottom-2 -right-2 w-12 h-12 rounded-2xl flex items-center justify-center border-4 shadow-lg rotate-12 group-hover:rotate-0 transition-transform duration-500" style={{ background: C.primary, borderColor: C.bgDark }}>
                <Award className="text-white w-6 h-6" />
              </div>
            </div>

            {/* Identity */}
            <div className="flex-1 text-center md:text-left space-y-6">
              <div className="space-y-2">
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-3">
                  <h1 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase">
                    <span className="text-slate-500 opacity-50 mr-1">{user.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}</span>
                    {user.ign || user.username}
                  </h1>
                  <Badge className={cn("px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-widest border border-white/10", getGradeColor(user.grade || 'D'))}>
                    Grade {user.grade || 'D'}
                  </Badge>
                </div>
                <div className="flex justify-center md:justify-start">
                   <RoleBadge role={user.role} />
                </div>
              </div>

              <div className="flex flex-wrap justify-center md:justify-start gap-6 text-[11px] font-black uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-2">
                  <Shield className="w-4 h-4" /> 
                  {canSeePrivateInfo ? (user.player_uid || 'UID PENDING') : 'UID REDACTED'}
                </span>
                <span className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> {user.device || 'TACTICAL MOBILE'}</span>
                <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> DEPLOYED {user.date_joined ? format(new Date(user.date_joined), 'MMM yyyy') : 'N/A'}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 shrink-0">
              <Button
                onClick={handleMessage}
                disabled={user.id === loggedInProfile?.id}
                className="rounded-2xl px-8 h-12 font-black uppercase tracking-widest text-xs transition-all hover:scale-105"
                style={{ background: C.primary, boxShadow: `0 8px 20px ${C.primary}4d` }}
              >
                <MessageSquare className="w-4 h-4 mr-2" /> Transmit Intel
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyToClipboard} className="flex-1 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-slate-400">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" className="flex-1 rounded-xl bg-white/5 border-white/10 hover:bg-white/10 text-slate-400">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Combat Metrics ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { label: 'Total Eliminations', value: user.kills?.toLocaleString() || '0', color: 'text-white' },
            { label: 'Operational Presence', value: `${user.attendance || 0}%`, color: 'text-green-500' },
            { label: 'BR Kills', value: user.br_kills?.toLocaleString() || '0', color: 'text-orange-500' },
            { label: 'MP Kills', value: user.mp_kills?.toLocaleString() || '0', color: 'text-purple-500' },
          ].map((stat, i) => (
            <div key={i} className="p-8 rounded-[2rem] border relative overflow-hidden group" style={glassPanel}>
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Target className="w-12 h-12" />
              </div>
              <div className={cn("text-3xl font-black italic mb-1", stat.color)}>{stat.value}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Detailed Intel ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="rounded-[2.5rem] border-none overflow-hidden" style={glassPanel}>
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-tighter text-slate-100 flex items-center gap-3">
                <Target className="w-5 h-5" style={{ color: C.primary }} /> Tactical Profiles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-4">
              {[
                { label: 'Combat Type', value: user.player_type || 'Hybrid Unit' },
                { label: 'BR Specialization', value: user.br_class || 'Not Assigned' },
                { label: 'MP Configuration', value: user.mp_class || 'Not Assigned' },
                { label: 'Engagement Tier', value: user.tier || 'Rookie' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between items-center p-5 rounded-2xl bg-black/40 border border-white/5">
                  <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                  <span className="text-xs font-black uppercase text-slate-200">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-[2.5rem] border-none overflow-hidden" style={glassPanel}>
            <CardHeader className="p-8 pb-4">
              <CardTitle className="text-xl font-black uppercase tracking-tighter text-slate-100 flex items-center gap-3">
                <Award className="w-5 h-5" style={{ color: C.primary }} /> Network Links
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-4 flex flex-col justify-center gap-4">
              {user.tiktok_handle ? (
                <div className="flex items-center justify-between p-5 bg-black/40 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <FaTiktok className="text-xl text-white opacity-80" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-300">{user.tiktok_handle}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs font-black uppercase tracking-widest transition-colors" style={{ color: C.primary }}>View Hub</Button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-30">
                  <div className="w-12 h-12 rounded-full border border-dashed border-white/20 flex items-center justify-center mb-3">
                    <Plus className="w-4 h-4" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest">No External Comms Linked</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

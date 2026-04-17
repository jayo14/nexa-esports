import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Helmet } from 'react-helmet-async';
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
} from 'react-share';
import {
  Calendar, Clock, Users, Link as LinkIcon, Lock, Copy,
  MapPin, ShieldAlert, Video, Loader2,
  BarChart2, ShoppingBag,
  ChevronRight, ExternalLink,
  Shield, Settings, ArrowRight, Flame,
  Trophy, User as UserIcon, Upload, Play, Trash2, Send, CheckCircle2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@/types/events';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/hooks/useNotifications';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/* ─────────────── Design tokens ─────────────── */
const C = {
  primary:  '#ec131e',
  bgDark:   '#1a0b0d',
  burgundy: '#411d21',
  panel:    '#2d1619',
};

const glass: React.CSSProperties = {
  background: 'rgba(45,22,25,0.6)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.1)',
};

/* ─────────────── BriefingCard ─────────────── */
const BriefingCard: React.FC<{ iconNode: React.ReactNode; value: string; label: string }> = ({
  iconNode, value, label,
}) => (
  <div
    className="p-4 sm:p-6 shadow-xl relative group overflow-hidden cursor-default rounded-[24px] sm:rounded-[32px]"
    style={{
      ...glass,
      border: '1px solid rgba(255,255,255,0.05)',
      transform: 'perspective(1000px) rotateY(-5deg) rotateX(2deg)',
      transition: 'transform 0.3s ease',
    }}
    onMouseEnter={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform =
        'perspective(1000px) rotateY(0deg) rotateX(0deg)';
    }}
    onMouseLeave={(e) => {
      (e.currentTarget as HTMLDivElement).style.transform =
        'perspective(1000px) rotateY(-5deg) rotateX(2deg)';
    }}
  >
    <div
      className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center mb-6 sm:mb-12 transition-transform group-hover:scale-110"
      style={{ background: `${C.primary}33`, color: C.primary }}
    >
      {iconNode}
    </div>
    <h4 className="text-lg sm:text-2xl font-bold mb-1 sm:mb-2 text-white">{value}</h4>
    <p className="text-[8px] sm:text-[10px] text-slate-400 font-medium uppercase tracking-widest">{label}</p>
  </div>
);

/* ─────────────── EventDetails ─────────────── */
export const EventDetails: React.FC = () => {
  const { eventId } = useParams();
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const { user, profile }    = useAuth();
  const queryClient = useQueryClient();
  const shareUrl    = window.location.href;

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event-details', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required');
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          host:host_id (id, username, ign, avatar_url),
          mvp:mvp_player_id (id, ign, avatar_url),
          event_participants (
            id,
            verified,
            player_id,
            profiles:player_id (id, ign, avatar_url, status)
          )
        `)
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return data as (Event & {
        event_participants?: Array<{
          id: string;
          verified: boolean | null;
          player_id: string | null;
          profiles?: {
            id: string;
            ign: string;
            avatar_url: string | null;
            status: string | null;
          } | null;
        }>;
        host?: {
          id?: string;
          username?: string;
          ign?: string;
          avatar_url?: string;
        };
        mvp?: {
          id: string;
          ign: string;
          avatar_url: string | null;
        } | null;
        post_event_recap?: string | null;
        mvp_player_id?: string | null;
      });
    },
  });

  /* ── Post-Event Management ── */
  const { sendNotification } = useNotifications();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'clan_master';
  const isCompleted = event?.status === 'completed' || (event && new Date(`${event.date}T${event.time}`) < new Date());

  const { data: clips = [], refetch: refetchClips } = useQuery({
    queryKey: ['event-clips', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_clips')
        .select(`
          *,
          uploader:uploaded_by (ign, avatar_url),
          reactions:event_clip_reactions (emoji, user_id)
        `)
        .eq('event_id', eventId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!eventId && isCompleted,
  });

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [clipData, setClipData] = useState({ type: 'file', url: '', caption: '', file: null as File | null });
  const [isUploading, setIsUploading] = useState(false);

  const handleUploadClip = async () => {
    if (!user || !eventId) return;
    setIsUploading(true);
    try {
      let finalUrl = clipData.url;

      if (clipData.type === 'file' && clipData.file) {
        const fileExt = clipData.file.name.split('.').pop();
        const fileName = `${eventId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('event-clips')
          .upload(fileName, clipData.file);
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('event-clips')
          .getPublicUrl(fileName);
        finalUrl = publicUrl;
      }

      const { error } = await supabase.from('event_clips').insert({
        event_id: eventId,
        uploaded_by: user.id,
        clip_url: finalUrl,
        caption: clipData.caption,
        clip_type: clipData.type,
      });

      if (error) throw error;
      toast({ title: 'Clip Shared', description: 'Your clip has been uploaded to the gallery.' });
      setUploadDialogOpen(false);
      setClipData({ type: 'file', url: '', caption: '', file: null });
      refetchClips();
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const [mvpDialogOpen, setMvpDialogOpen] = useState(false);
  const [selectedMvpId, setSelectedMvpId] = useState('');
  const [recapText, setRecapText] = useState('');

  // Sync internal state with event data when dialog opens
  const openMvpDialog = () => {
    setSelectedMvpId(event?.mvp_player_id || '');
    setRecapText(event?.post_event_recap || '');
    setMvpDialogOpen(true);
  };

  const handleSavePostEvent = async () => {
    if (!eventId) return;
    try {
      const { error } = await supabase
        .from('events')
        .update({
          mvp_player_id: selectedMvpId || null,
          post_event_recap: recapText,
        })
        .eq('id', eventId);

      if (error) throw error;

      if (selectedMvpId && selectedMvpId !== event?.mvp_player_id) {
        sendNotification({
          user_id: selectedMvpId,
          title: '🏆 MVP Nominations',
          message: `You were named MVP of ${event?.name}! Check out the recap.`,
          type: 'event_mvp',
          data: { eventId },
        });
      }

      toast({ title: 'Post-Event Updated', description: 'Recap and MVP have been saved.' });
      setMvpDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['event-details', eventId] });
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.message, variant: 'destructive' });
    }
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: `linear-gradient(135deg, ${C.burgundy} 0%, ${C.bgDark} 100%)` }}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 animate-spin" style={{ borderColor: `${C.primary} transparent transparent transparent` }} />
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Loading briefing…</p>
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (error || !event) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center p-6" style={{ background: `linear-gradient(135deg, ${C.burgundy} 0%, ${C.bgDark} 100%)` }}>
        <Shield className="w-16 h-16 mb-4" style={{ color: `${C.primary}66` }} />
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Mission Not Found</h2>
        <p className="text-slate-400 mb-6">This event does not exist or has been decommissioned.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 rounded-2xl text-white font-black uppercase tracking-widest text-sm" style={{ background: C.primary }}>Return to Base</button>
      </div>
    );
  }

  const copyToClipboard = (text = shareUrl, label = 'Link') => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied`, description: `${label} copied to clipboard.` });
  };

  const formatDateString = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const [titleMain, ...titleRest] = (event?.name || '').split(':');
  const titleSub = titleRest.join(':').trim();

  const handleTrackParticipation = async () => {
    if (!user?.id || !eventId) return;
    try {
      const { data: existing } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', eventId)
        .eq('player_id', user.id)
        .maybeSingle();

      if (!existing) {
        await supabase.from('event_participants').insert({ event_id: eventId, player_id: user.id, verified: true });
        queryClient.invalidateQueries({ queryKey: ['event-details', eventId] });
      }
    } catch (err) { console.error(err); }
  };

  const participantRecords = event.event_participants || [];
  const confirmedCount = participantRecords.filter(p => p.verified).length;
  const maxParticipants = Math.max(50, (event.lobbies || 1) * 50);
  const participationRate = Math.round((confirmedCount / maxParticipants) * 100);

  const activeWarriors = participantRecords
    .filter(p => p.profiles?.ign)
    .slice(0, 3)
    .map(p => ({
      name: p.profiles?.ign || 'Unknown',
      status: p.verified ? 'Confirmed' : 'Pending',
      dot: p.verified ? '#22c55e' : '#64748b',
      img: p.profiles?.avatar_url || null,
    }));

  if (activeWarriors.length === 0) {
    activeWarriors.push({
      name: event.host?.ign || event.host?.username || 'Host',
      status: 'Commanding',
      dot: '#22c55e',
      img: event.host?.avatar_url || null,
    });
  }

  return (
    <div className="flex flex-col gap-6 min-w-0 font-rajdhani">
      <Helmet>
        <title>{event.name} | Nexa eSports</title>
        <meta name="description" content={event.description} />
      </Helmet>

      <Tabs defaultValue="briefing" className="w-full">
         <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-8">
            <TabsList className="bg-transparent h-auto p-0 gap-8">
              <TabsTrigger value="briefing" className="data-[state=active]:text-red-500 data-[state=active]:border-b-2 border-red-500 rounded-none bg-transparent px-0 py-2 font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-white transition-all">
                Briefing
              </TabsTrigger>
              <TabsTrigger value="intel" className="data-[state=active]:text-red-500 data-[state=active]:border-b-2 border-red-500 rounded-none bg-transparent px-0 py-2 font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-white transition-all">
                Intel
              </TabsTrigger>
              {isCompleted && (
                <TabsTrigger value="post-event" className="data-[state=active]:text-red-500 data-[state=active]:border-b-2 border-red-500 rounded-none bg-transparent px-0 py-2 font-black uppercase tracking-widest text-[10px] text-slate-500 hover:text-white transition-all">
                  Post-Event
                </TabsTrigger>
              )}
            </TabsList>

            {isAdmin && isCompleted && (
               <Button variant="outline" size="sm" onClick={openMvpDialog} className="h-8 border-white/10 text-[10px] font-black uppercase tracking-widest bg-white/5 hover:bg-white/10">
                  Command Controls
               </Button>
            )}
         </div>

         {/* BRIEFING TAB */}
         <TabsContent value="briefing" className="mt-0 outline-none">
            <div className="flex flex-col xl:flex-row gap-8">
               <div className="flex-1 space-y-10">
                  <section className="relative h-[300px] sm:h-[400px] overflow-hidden rounded-[32px] group shadow-2xl">
                     {event.thumbnail_url ? (
                        <img src={event.thumbnail_url} alt={event.name} className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:scale-105 transition-transform duration-1000" />
                     ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-red-950 to-black" />
                     )}
                     <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0b] via-transparent to-transparent" />
                     <div className="absolute inset-0 p-8 sm:p-12 flex flex-col justify-end max-w-3xl">
                        <div className="flex items-center gap-3 mb-4">
                           <Badge variant="secondary" className="bg-red-600 text-white font-black uppercase text-[10px] tracking-widest px-4 py-1 rounded-full border-none">{event.type}</Badge>
                           {event.season && <span className="text-white/60 font-black text-[10px] uppercase tracking-widest">{event.season}</span>}
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-black font-orbitron text-white leading-none tracking-tighter uppercase mb-4">
                           {titleMain}{titleSub && <span className="text-red-600 block">{titleSub}</span>}
                        </h1>
                        <p className="text-slate-400 text-sm max-w-xl line-clamp-2">{event.description}</p>
                     </div>
                  </section>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                     <BriefingCard iconNode={<Calendar className="w-5 h-5" />} value={formatDateString(event.date)} label="Deployment" />
                     <BriefingCard iconNode={<Clock className="w-5 h-5" />} value={event.time} label="Zero Hour" />
                     <BriefingCard iconNode={<Users className="w-5 h-5" />} value={event.host?.ign || 'Nexa Command'} label="Commander" />
                     <BriefingCard iconNode={<MapPin className="w-5 h-5" />} value={`${event.lobbies || 1} Sector`} label="Strategic Lobbies" />
                  </div>

                  <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="p-8 rounded-[32px]" style={glass}>
                        <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3"><Shield className="w-4 h-4 text-red-500" /> Tactical Access</h3>
                        <div className="space-y-4">
                           {event.room_code && (
                              <div className="flex justify-between items-center bg-white/5 p-4 rounded-2xl border border-white/5">
                                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Room Code</span>
                                 <code className="text-white font-bold tracking-widest">{event.room_code}</code>
                              </div>
                           )}
                           <Button onClick={() => event.room_link ? window.open(event.room_link, '_blank') : copyToClipboard()} className="w-full h-12 bg-red-600 hover:bg-red-500 font-black uppercase tracking-widest text-xs rounded-2xl">
                              {event.room_link ? "Connect to Server" : "Copy Event Intel"}
                           </Button>
                        </div>
                     </div>
                     <div className="p-8 rounded-[32px] bg-red-600/5 border border-red-500/10 relative overflow-hidden">
                        <div className="relative z-10">
                           <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-3"><ShieldAlert className="w-4 h-4 text-red-500" /> Mission Protocol</h3>
                           <p className="text-slate-400 text-sm leading-relaxed">{event.compulsory ? "PROTOCOL ALPHA-X: This deployment is mandatory. Absence will result in immediate squad de-ranking." : "High priority mission. Synchronize with your squad to ensure maximal impact."}</p>
                        </div>
                        <Flame className="absolute -right-8 -bottom-8 w-32 h-32 text-red-600 opacity-5" />
                     </div>
                  </section>
               </div>

               <div className="w-full xl:w-80 space-y-8 flex-shrink-0">
                  <section className="p-8 rounded-[32px] text-center" style={glass}>
                     <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Confirmed Force</h3>
                     <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                           <circle cx="50" cy="50" r="45" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                           <circle cx="50" cy="50" r="45" fill="transparent" stroke={C.primary} strokeWidth="8" strokeDasharray={282} strokeDashoffset={282 - (282 * participationRate / 100)} strokeLinecap="round" />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <span className="text-4xl font-black text-white">{confirmedCount}</span>
                           <span className="text-[10px] font-bold text-slate-500">/{maxParticipants}</span>
                        </div>
                     </div>
                     <p className="mt-6 text-[10px] font-black text-green-500 uppercase tracking-widest">Active Ready Rate: {participationRate}%</p>
                  </section>

                  <section className="p-8 rounded-[32px]" style={glass}>
                     <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">Force Contacts</h3>
                     <div className="space-y-4">
                        {activeWarriors.map(w => (
                           <div key={w.name} className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/5 overflow-hidden flex-shrink-0">
                                 {w.img ? <img src={w.img} className="w-full h-full object-cover" alt="" /> : <UserIcon className="w-5 h-5 m-2.5 text-slate-600" />}
                              </div>
                              <div className="min-w-0">
                                 <p className="text-xs font-black text-white truncate">{w.name}</p>
                                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{w.status}</p>
                              </div>
                           </div>
                        ))}
                     </div>
                  </section>
               </div>
            </div>
         </TabsContent>

         {/* INTEL TAB */}
         <TabsContent value="intel" className="mt-0 outline-none">
            <section className="p-10 rounded-[40px] text-center" style={glass}>
               <h2 className="text-3xl font-black font-orbitron text-white uppercase tracking-tighter mb-12">Participant Roster</h2>
               <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-8">
                  {participantRecords.map(p => (
                     <div key={p.id} className="group flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-[24px] bg-white/5 border border-white/5 overflow-hidden group-hover:scale-110 group-hover:border-red-500/50 transition-all duration-500">
                           {p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : <UserIcon className="w-6 h-6 m-5 text-slate-800" />}
                        </div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate w-full px-2">{p.profiles?.ign || 'Operator'}</span>
                     </div>
                  ))}
               </div>
            </section>
         </TabsContent>

         {/* POST-EVENT TAB */}
         <TabsContent value="post-event" className="mt-0 outline-none">
            <div className="space-y-12 pb-20">
               <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                  <div className="lg:col-span-4 p-10 rounded-[40px] text-center relative overflow-hidden shadow-2xl" style={{ ...glass, border: `1px solid ${C.primary}33`, background: `radial-gradient(circle at top, ${C.primary}1a, transparent)` }}>
                     <Trophy className="w-16 h-16 text-red-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(234,19,30,0.5)]" />
                     <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-red-500 mb-10">Operation MVP</h3>
                     {event.mvp ? (
                        <div className="space-y-6">
                           <div className="w-32 h-32 rounded-[40px] bg-red-600/20 border-2 border-red-500/30 mx-auto overflow-hidden shadow-[0_0_40px_rgba(234,19,30,0.3)]">
                              {event.mvp.avatar_url ? <img src={event.mvp.avatar_url} className="w-full h-full object-cover" alt="" /> : <UserIcon className="w-12 h-12 text-red-500/50 mt-10 mx-auto" />}
                           </div>
                           <div className="space-y-1">
                              <p className="text-3xl font-black font-orbitron text-white uppercase tracking-tighter">{event.mvp.ign}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Peak Force Efficiency</p>
                           </div>
                        </div>
                     ) : (
                        <div className="py-12 text-slate-600 font-bold uppercase text-[10px]">Awaiting Intel Confirmation</div>
                     )}
                  </div>

                  <div className="lg:col-span-8 p-10 rounded-[40px]" style={glass}>
                     <div className="flex items-center gap-4 mb-8">
                        <div className="w-1.5 h-6 bg-red-600 rounded-full" />
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter font-orbitron">Force Recap</h3>
                     </div>
                     <p className="text-slate-300 leading-relaxed text-lg font-medium italic">
                        {event.post_event_recap || "The final briefing for this operation is currently being synthesized. Awaiting command breakdown."}
                     </p>
                     <div className="mt-12 flex items-center gap-4 border-t border-white/5 pt-8">
                        <div className="w-12 h-12 rounded-2xl bg-red-600/10 flex items-center justify-center border border-red-500/10">
                           {event.host?.avatar_url ? <img src={event.host.avatar_url} className="w-full h-full rounded-2xl object-cover" alt="" /> : <UserIcon className="w-5 h-5 text-red-500" />}
                        </div>
                        <div>
                           <p className="text-xs font-black text-white uppercase tracking-widest">{event.host?.ign || 'Command'}</p>
                           <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authored Review</p>
                        </div>
                     </div>
                  </div>
               </section>

               <section className="space-y-10">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                     <div className="space-y-1">
                        <div className="flex items-center gap-3">
                           <Video className="w-6 h-6 text-red-500" />
                           <h3 className="text-2xl font-black text-white uppercase tracking-tight font-orbitron text-center sm:text-left">Strike Highlights</h3>
                        </div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.3em] text-center sm:text-left">Intelligence Grid Feed</p>
                     </div>
                     {isAdmin && (
                        <Button onClick={() => setUploadDialogOpen(true)} className="bg-red-600 hover:bg-red-500 font-black uppercase text-[11px] tracking-widest h-12 px-8 rounded-2xl">
                           <Upload className="w-4 h-4 mr-2" /> Upload Intel
                        </Button>
                     )}
                  </div>

                  {clips.length === 0 ? (
                    <div className="p-32 text-center rounded-[50px] bg-white/[0.01] border border-dashed border-white/5">
                       <Video className="w-10 h-10 text-slate-800 mx-auto mb-4 opacity-20" />
                       <p className="text-xs font-black text-slate-600 uppercase tracking-widest">No footage captured during this mission</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                       {clips.map((clip: any) => {
                          const reactions = clip.reactions || [];
                          const emojiSummary = Array.from(new Set(reactions.map((r:any) => r.emoji))).map(emoji => ({
                            emoji,
                            count: reactions.filter((r:any) => r.emoji === emoji).length,
                            isMe: reactions.some((r:any) => r.emoji === emoji && r.user_id === user?.id)
                          }));

                          const handleReact = async (emoji: string) => {
                            if (!user) return;
                            try {
                              const existing = reactions.find((r:any) => r.emoji === emoji && r.user_id === user.id);
                              if (existing) {
                                await supabase.from('event_clip_reactions').delete().eq('clip_id', clip.id).eq('user_id', user.id).eq('emoji', emoji);
                              } else {
                                await supabase.from('event_clip_reactions').insert({ clip_id: clip.id, user_id: user.id, emoji });
                              }
                              refetchClips();
                            } catch (e) {
                              console.error(e);
                            }
                          };

                          return (
                             <motion.div key={clip.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="group rounded-[40px] overflow-hidden bg-[#0a0a0b] border border-white/5 hover:border-red-500/30 transition-all duration-500 shadow-2xl">
                                <div className="aspect-video relative bg-slate-900 border-b border-white/5 overflow-hidden">
                                   {clip.clip_type === 'file' ? (
                                      <video src={clip.clip_url} className="w-full h-full object-cover" controls />
                                   ) : (
                                      <iframe src={clip.clip_url.replace('watch?v=', 'embed/')} className="w-full h-full" allowFullScreen />
                                   )}
                                </div>
                                <div className="p-8 space-y-6">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-[15px] bg-red-600/10 flex items-center justify-center border border-red-500/10">
                                         {clip.uploader?.avatar_url ? <img src={clip.uploader.avatar_url} className="w-full h-full rounded-[15px] object-cover" alt="" /> : <UserIcon className="w-4 h-4 text-red-500" />}
                                      </div>
                                      <div>
                                         <p className="text-xs font-black text-white uppercase truncate">{clip.uploader?.ign || 'Unknown'}</p>
                                         <p className="text-[10px] font-bold text-slate-600 uppercase mt-0.5">{format(new Date(clip.created_at), 'MMM dd')}</p>
                                      </div>
                                   </div>
                                   {clip.caption && <p className="text-sm text-slate-400 font-medium italic">“{clip.caption}”</p>}
                                   <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-white/5">
                                      {emojiSummary.map((s: any) => (
                                         <button key={s.emoji} onClick={() => handleReact(s.emoji)} className={cn("px-3.5 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-2 border", s.isMe ? "bg-red-600/20 border-red-500 text-red-500" : "bg-white/5 border-white/10 text-slate-500 hover:text-white")}>
                                            <span>{s.emoji}</span><span>{s.count}</span>
                                         </button>
                                      ))}
                                      
                                      <DropdownMenu>
                                         <DropdownMenuTrigger asChild><button className="h-9 px-3 rounded-full bg-white/5 border border-white/10 text-slate-500 hover:text-white transition-all">+</button></DropdownMenuTrigger>
                                         <DropdownMenuContent className="bg-[#1a0b0d] border-white/10 p-3 flex gap-2 rounded-2xl">
                                            {['🔥', '👑', '🎯', '💀', '🍿'].map(e => (
                                               <button key={e} onClick={() => handleReact(e)} className="w-10 h-10 flex items-center justify-center text-2xl hover:scale-125 transition-transform">{e}</button>
                                            ))}
                                         </DropdownMenuContent>
                                      </DropdownMenu>

                                      {isAdmin && (
                                         <button onClick={async () => { if(confirm('Delete intel?')) { await supabase.from('event_clips').delete().eq('id', clip.id); refetchClips(); } }} className="h-9 w-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 hover:text-red-500 ml-auto"><Trash2 className="w-4 h-4" /></button>
                                      )}
                                   </div>
                                </div>
                             </motion.div>
                          );
                       })}
                    </div>
                  )}
               </section>
            </div>
         </TabsContent>
      </Tabs>

      {/* ADMIN DIALOGS */}
      <Dialog open={mvpDialogOpen} onOpenChange={setMvpDialogOpen}>
         <DialogContent className="bg-[#1a0b0d] border-white/10 text-white font-rajdhani">
            <DialogHeader>
               <DialogTitle className="font-orbitron text-red-500 uppercase tracking-widest">Post-Event Ops</DialogTitle>
               <DialogDescription className="text-slate-400">Nominate the mission MVP and synthesize the operational recap.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Nominate MVP</Label>
                  <select className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm focus:outline-none focus:ring-1 focus:ring-red-500" value={selectedMvpId} onChange={(e) => setSelectedMvpId(e.target.value)}>
                     <option value="">No MVP Assigned</option>
                     {participantRecords.map(p => <option key={p.player_id} value={p.player_id || ''}>{p.profiles?.ign || 'Unknown Operator'}</option>)}
                  </select>
               </div>
               <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Operational Summary (500 chars)</Label>
                  <Textarea placeholder="Describe the deployment outcome..." className="bg-white/5 border-white/10 h-32 rounded-xl resize-none" maxLength={500} value={recapText} onChange={(e) => setRecapText(e.target.value)} />
               </div>
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => setMvpDialogOpen(false)}>Abort</Button>
               <Button onClick={handleSavePostEvent} className="bg-red-600 hover:bg-red-500 font-black uppercase tracking-widest h-11 px-8 rounded-xl">Save Intelligence</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
         <DialogContent className="bg-[#1a0b0d] border-white/10 text-white font-rajdhani">
            <DialogHeader>
               <DialogTitle className="font-orbitron text-red-500 uppercase tracking-widest">Transmit Intel</DialogTitle>
               <DialogDescription className="text-slate-400">Deploy gameplay evidence or provide a secured external data link.</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
                <div className="flex bg-white/5 p-1 rounded-2xl">
                    <button onClick={() => setClipData({...clipData, type: 'file'})} className={cn("flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all", clipData.type === 'file' ? "bg-red-600 text-white" : "text-slate-500")}>File</button>
                    <button onClick={() => setClipData({...clipData, type: 'link'})} className={cn("flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all", clipData.type === 'link' ? "bg-red-600 text-white" : "text-slate-500")}>Link</button>
                </div>
                {clipData.type === 'file' ? (
                    <div className="space-y-4">
                        <Input type="file" onChange={(e) => setClipData({...clipData, file: e.target.files?.[0] || null})} className="bg-white/5 border-white/10 h-12" />
                    </div>
                ) : (
                    <Input placeholder="URL (YouTube/Streamable)" className="bg-white/5 border-white/10 h-12" value={clipData.url} onChange={(e) => setClipData({...clipData, url: e.target.value})} />
                )}
                <Input placeholder="Caption..." className="bg-white/5 border-white/10 h-12" value={clipData.caption} onChange={(e) => setClipData({...clipData, caption: e.target.value})} />
            </div>
            <DialogFooter>
               <Button variant="ghost" onClick={() => setUploadDialogOpen(false)}>Cancel</Button>
               <Button onClick={handleUploadClip} disabled={isUploading} className="bg-red-600 hover:bg-red-500 h-11 px-8 rounded-xl uppercase font-black tracking-widest">{isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initiate Transmit"}</Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
    </div>
  );
};
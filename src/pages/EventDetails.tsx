import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  MapPin, ShieldAlert, Video, Loader2, Home, Package,
  BarChart2, ShoppingBag, MessageSquare, Gamepad2, Tv,
  ChevronRight, Download, Play, X, Plus, Bell, Search,
  Shield, Settings, ArrowRight, Flame,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Event } from '@/types/events';

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

/* ─────────────── SideNavIcon ─────────────── */
const SideNavIcon: React.FC<{
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon, active, onClick }) => (
  <button
    onClick={onClick}
    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all"
    style={
      active
        ? { background: `${C.primary}26`, color: C.primary, boxShadow: `0 0 15px ${C.primary}33` }
        : { color: '#64748b' }
    }
    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
  >
    {icon}
  </button>
);

/* ─────────────── BriefingCard ─────────────── */
const BriefingCard: React.FC<{ iconNode: React.ReactNode; value: string; label: string }> = ({
  iconNode, value, label,
}) => (
  <div
    className="p-6 shadow-xl relative group overflow-hidden cursor-default"
    style={{
      ...glass,
      border: '1px solid rgba(255,255,255,0.05)',
      borderRadius: '32px',
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
      className="w-12 h-12 rounded-2xl flex items-center justify-center mb-12 transition-transform group-hover:scale-110"
      style={{ background: `${C.primary}33`, color: C.primary }}
    >
      {iconNode}
    </div>
    <h4 className="text-2xl font-bold mb-2 text-white">{value}</h4>
    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{label}</p>
  </div>
);

/* ─────────────── EventDetails ─────────────── */
export const EventDetails: React.FC = () => {
  const { eventId } = useParams();
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const shareUrl    = window.location.href;

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['event-details', eventId],
    queryFn: async () => {
      if (!eventId) throw new Error('Event ID is required');
      const { data, error } = await supabase
        .from('events')
        .select('*, host:host_id (username, avatar_url)')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return data as Event;
    },
  });

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ background: `linear-gradient(135deg, ${C.burgundy} 0%, ${C.bgDark} 100%)`, fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 animate-spin"
            style={{ borderColor: `${C.primary} transparent transparent transparent` }} />
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Loading briefing…</p>
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (error || !event) {
    return (
      <div
        className="flex flex-col items-center justify-center h-screen text-center p-6"
        style={{ background: `linear-gradient(135deg, ${C.burgundy} 0%, ${C.bgDark} 100%)`, fontFamily: "'Space Grotesk', sans-serif" }}
      >
        <Shield className="w-16 h-16 mb-4" style={{ color: `${C.primary}66` }} />
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Mission Not Found</h2>
        <p className="text-slate-400 mb-6">This event does not exist or has been decommissioned.</p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-2xl text-white font-black uppercase tracking-widest text-sm"
          style={{ background: C.primary, boxShadow: `0 8px 24px ${C.primary}4d` }}
        >
          Return to Base
        </button>
      </div>
    );
  }

  /* ── Helpers ── */
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.name,
    startDate: `${event.date}T${event.time}`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OnlineEventAttendanceMode',
    url: shareUrl,
    organizer: { '@type': 'Person', name: event.host?.username || 'Nexa Host' },
    image: event.thumbnail_url || 'https://nexaesports.com/default-event.png',
    description: event.description || `Join ${event.name} hosted by ${event.host?.username || 'Nexa eSports'}.`,
  };

  const copyToClipboard = (text = shareUrl, label = 'Link') => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} Copied`, description: `${label} copied to clipboard.` });
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const [titleMain, ...titleRest] = event.name.split(':');
  const titleSub = titleRest.join(':').trim();

  return (
    <div
      className="flex h-screen p-4 lg:p-6 gap-6 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${C.burgundy} 0%, ${C.bgDark} 100%)`,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      <Helmet>
        <title>{event.name} | Nexa eSports</title>
        <meta name="description" content={event.description || `Join ${event.name} – ${event.type} event.`} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:title" content={`${event.name} | Nexa eSports`} />
        <meta property="og:description" content={event.description || `Join ${event.name} on ${formatDate(event.date)}.`} />
        {event.thumbnail_url && <meta property="og:image" content={event.thumbnail_url} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={event.name} />
        <meta name="twitter:description" content={event.description || `Join ${event.name} now!`} />
        {event.thumbnail_url && <meta name="twitter:image" content={event.thumbnail_url} />}
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </Helmet>

      {/* ══════════ LEFT SIDEBAR ══════════ */}
      <aside
        className="w-20 rounded-[32px] flex flex-col items-center py-8 shrink-0"
        style={{ background: `${C.bgDark}66`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="mb-12 w-10 h-10 flex items-center justify-center">
          <svg className="w-8 h-8 fill-white" viewBox="0 0 100 100">
            <path d="M20 20 L20 80 L35 80 L65 35 L65 80 L80 80 L80 20 L65 20 L35 65 L35 20 Z" />
          </svg>
        </div>

        <nav className="flex-1 flex flex-col gap-6">
          <SideNavIcon icon={<Home className="w-5 h-5" />}        onClick={() => navigate('/')} />
          <SideNavIcon icon={<Gamepad2 className="w-5 h-5" />}    active />
          <SideNavIcon icon={<Package className="w-5 h-5" />}     onClick={() => navigate('/marketplace')} />
          <SideNavIcon icon={<Tv className="w-5 h-5" />} />
          <SideNavIcon icon={<BarChart2 className="w-5 h-5" />} />
          <SideNavIcon icon={<ShoppingBag className="w-5 h-5" />} onClick={() => navigate('/marketplace')} />
          <SideNavIcon icon={<MessageSquare className="w-5 h-5" />} onClick={() => navigate('/chat')} />
        </nav>

        <button
          className="mt-auto w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: `${C.primary}33`, border: `1px solid ${C.primary}66`, color: C.primary }}
        >
          <Plus className="w-4 h-4" />
        </button>
      </aside>

      {/* ══════════ MAIN ══════════ */}
      <main className="flex-1 flex flex-col gap-6 min-w-0">

        {/* Header */}
        <header className="flex items-center justify-between px-2 flex-shrink-0">
          <h2 className="text-2xl font-semibold text-slate-100">
            Good evening, <span className="font-bold text-white">NIKITIN</span>
          </h2>
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                className="rounded-full py-2.5 pl-12 pr-6 w-64 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                style={{ background: `${C.bgDark}80`, border: 'none' }}
                placeholder="Search"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all"
                style={{ background: `${C.bgDark}80` }}>
                <ShoppingBag className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-white relative"
                style={{ background: `${C.bgDark}80` }}>
                <Bell className="w-5 h-5" />
                <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full"
                  style={{ background: C.primary, border: `2px solid ${C.burgundy}` }} />
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable body */}
        <div className="flex-1 flex gap-6 min-h-0 overflow-y-auto pr-2" style={{ scrollbarWidth: 'none' }}>

          {/* Left column */}
          <div className="flex-1 space-y-8 pb-8 min-w-0">

            {/* ── Hero ── */}
            <section className="relative h-[320px] overflow-hidden shadow-2xl group flex-shrink-0" style={{ borderRadius: '32px' }}>
              {event.thumbnail_url ? (
                <img
                  src={event.thumbnail_url}
                  alt={event.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-60 mix-blend-luminosity group-hover:scale-105 transition-transform duration-700"
                />
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, #3d1a1e, ${C.bgDark})` }} />
              )}
              <div className="absolute inset-0" style={{ background: `linear-gradient(to right, ${C.bgDark}, rgba(26,11,13,0.4), transparent)` }} />

              <div className="relative h-full p-10 flex flex-col justify-center max-w-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <span className="bg-white text-black px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                    <Flame className="w-3 h-3 text-red-500" />
                    {event.type || 'Popular'}
                  </span>
                  {event.season && (
                    <span className="text-white/60 font-bold text-xs uppercase">{event.season}</span>
                  )}
                </div>

                <h1 className="text-5xl md:text-6xl font-black tracking-tight mb-4 leading-none text-white">
                  {titleSub ? (
                    <>{titleMain}:{' '}<br /><span style={{ color: C.primary }}>{titleSub}</span></>
                  ) : (
                    event.name
                  )}
                </h1>

                {event.description && (
                  <p className="text-slate-300 text-sm max-w-md mb-6 leading-relaxed line-clamp-2">
                    {event.description}
                  </p>
                )}

                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="w-8 h-8 rounded-full bg-slate-700" style={{ border: `2px solid ${C.bgDark}` }} />
                    ))}
                  </div>
                  <span className="px-4 py-1.5 rounded-full text-xs font-bold"
                    style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    +120 Participants
                  </span>
                </div>
              </div>

              {/* Priority badge */}
              <div className="absolute top-8 right-8 px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"
                style={{ background: `${C.primary}33`, border: `1px solid ${C.primary}66`, color: C.primary, backdropFilter: 'blur(8px)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: C.primary }} />
                {event.compulsory ? 'Mandatory Directive' : 'Priority Mission'}
              </div>
            </section>

            {/* ── Briefing cards ── */}
            <section>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Event Briefing</h3>
                <button className="text-xs font-bold text-slate-400 hover:text-white transition-colors">See More</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <BriefingCard iconNode={<Calendar className="w-5 h-5" />} value={formatDate(event.date)} label="Deployment Date" />
                <BriefingCard iconNode={<Clock className="w-5 h-5" />} value={event.time} label="Zero Hour" />
                <BriefingCard
                  iconNode={
                    event.host?.avatar_url
                      ? <img src={event.host.avatar_url} alt={event.host.username} className="w-12 h-12 rounded-2xl object-cover" />
                      : <Users className="w-5 h-5" />
                  }
                  value={event.host?.username || 'Nexa eSports'}
                  label="Commanding Officer"
                />
                <BriefingCard iconNode={<MapPin className="w-5 h-5" />} value={`${event.lobbies || 1} Active`} label="Tactical Lobbies" />
              </div>
            </section>

            {/* ── Access + Directive ── */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
              {/* Room link */}
              <div className="p-8 flex flex-col justify-between" style={{ ...glass, borderRadius: '32px' }}>
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <Shield className="w-5 h-5" style={{ color: C.primary }} />
                    <h3 className="font-bold uppercase tracking-wider text-sm text-white">Tactical Room Link</h3>
                  </div>
                  <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                    Access the secure encrypted training environment for deployment protocols.
                  </p>

                  {(event.room_code || event.password) && (
                    <div className="space-y-3 mb-6 p-4 rounded-2xl"
                      style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {event.room_code && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-xs uppercase font-bold tracking-widest">Room Code</span>
                          <div className="flex items-center gap-2">
                            <code className="px-2 py-1 rounded text-white text-xs font-mono" style={{ background: 'rgba(0,0,0,0.5)' }}>
                              {event.room_code}
                            </code>
                            <button onClick={() => copyToClipboard(event.room_code!, 'Room code')}
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-colors"
                              style={{ background: 'rgba(255,255,255,0.05)' }}>
                              <Copy className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                      {event.password && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 text-xs uppercase font-bold tracking-widest flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Password
                          </span>
                          <code className="px-2 py-1 rounded text-white text-xs font-mono" style={{ background: 'rgba(0,0,0,0.5)' }}>
                            {event.password}
                          </code>
                        </div>
                      )}
                    </div>
                  )}

                  {event.highlight_reel && (
                    <a href={event.highlight_reel} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 text-sm font-bold mb-6 transition-colors hover:text-white"
                      style={{ color: C.primary }}>
                      <Video className="w-4 h-4" /> Watch Highlight Reel
                    </a>
                  )}
                </div>

                {event.room_link ? (
                  <a href={event.room_link} target="_blank" rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all"
                    style={{ background: `${C.primary}1a`, border: `1px solid ${C.primary}4d`, color: C.primary }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = `${C.primary}33`)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = `${C.primary}1a`)}>
                    REVEAL LINK <ArrowRight className="w-4 h-4" />
                  </a>
                ) : (
                  <button onClick={() => copyToClipboard()}
                    className="flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm transition-all w-full"
                    style={{ background: `${C.primary}1a`, border: `1px solid ${C.primary}4d`, color: C.primary }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = `${C.primary}33`)}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = `${C.primary}1a`)}>
                    <Copy className="w-4 h-4" /> COPY EVENT LINK
                  </button>
                )}
              </div>

              {/* Directive */}
              <div className="p-8 flex flex-col justify-between relative overflow-hidden"
                style={{ background: `${C.primary}1a`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${C.primary}33`, borderRadius: '32px' }}>
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full" style={{ background: `${C.primary}33`, filter: 'blur(40px)' }} />
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <ShieldAlert className="w-5 h-5" style={{ color: C.primary }} />
                    <h3 className="font-bold uppercase tracking-wider text-sm text-white">
                      {event.compulsory ? 'Mandatory Directive' : 'Mission Details'}
                    </h3>
                  </div>
                  <p className="text-slate-300 text-sm font-medium leading-relaxed">
                    {event.compulsory
                      ? 'Failure to attend this session will result in immediate squad de-ranking. Participation is compulsory for all Tier-1 members.'
                      : event.description || 'Join this tactical event and demonstrate your elite capabilities.'}
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-2 text-xs font-bold relative z-10" style={{ color: C.primary }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.primary }} />
                  {event.compulsory ? 'PROTOCOL ALPHA-X' : 'NEXA ESPORTS EVENT'}
                </div>
              </div>
            </section>

            {/* ── Social share ── */}
            <section className="p-8 rounded-[32px]" style={glass}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Share Mission</h3>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => copyToClipboard()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8' }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'; }}>
                  <Copy className="w-4 h-4" /> Copy Link
                </button>

                <WhatsappShareButton url={shareUrl} title={event.name}>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold cursor-pointer"
                    style={{ background: 'rgba(37,211,102,0.1)', border: '1px solid rgba(37,211,102,0.2)', color: '#25D366' }}>
                    <WhatsappIcon size={18} round /> WhatsApp
                  </div>
                </WhatsappShareButton>

                <TwitterShareButton url={shareUrl} title={event.name}>
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold cursor-pointer"
                    style={{ background: 'rgba(29,161,242,0.1)', border: '1px solid rgba(29,161,242,0.2)', color: '#1DA1F2' }}>
                    <TwitterIcon size={18} round /> Twitter
                  </div>
                </TwitterShareButton>

                <FacebookShareButton url={shareUrl} hashtag="#NexaEsports">
                  <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold cursor-pointer"
                    style={{ background: 'rgba(24,119,242,0.1)', border: '1px solid rgba(24,119,242,0.2)', color: '#1877F2' }}>
                    <FacebookIcon size={18} round /> Facebook
                  </div>
                </FacebookShareButton>

                <button onClick={() => copyToClipboard()}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all"
                  style={{ background: 'rgba(88,101,242,0.1)', border: '1px solid rgba(88,101,242,0.2)', color: '#5865F2' }}>
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 127.14 96.36">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.82,105.82,0,0,0,126.6,80.22c1.24-21.45-8.49-47.57-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
                  </svg>
                  Discord
                </button>
              </div>
            </section>
          </div>

          {/* ── Right panel ── */}
          <div className="w-80 space-y-6 flex-shrink-0">

            {/* Mission Intel donut */}
            <section className="rounded-[32px] p-8 relative overflow-hidden flex flex-col"
              style={{ ...glass, border: '1px solid rgba(255,255,255,0.05)', height: '450px' }}>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 opacity-50 pointer-events-none"
                style={{ background: `radial-gradient(circle, ${C.primary}99 0%, transparent 70%)`, filter: 'blur(40px)' }} />

              <div className="flex items-center justify-between mb-12 relative z-10">
                <h3 className="text-lg font-bold text-white">Mission Intel</h3>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>

              <div className="flex-1 flex flex-col items-center justify-center relative z-10">
                <div className="relative w-48 h-48 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" fill="transparent" r="70" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
                    <circle cx="100" cy="100" fill="transparent" r="70" stroke={C.primary}
                      strokeDasharray="440" strokeDashoffset="70" strokeLinecap="round" strokeWidth="12" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Confirmed</span>
                    <span className="text-4xl font-black text-white">42<span className="text-xl text-slate-500">/50</span></span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-auto relative z-10">
                {[
                  { icon: <Users className="w-4 h-4" />, label: '84%' },
                  { icon: <Shield className="w-4 h-4" />, label: 'Gold' },
                  { icon: <BarChart2 className="w-4 h-4" />, label: 'Ready' },
                ].map(({ icon, label }) => (
                  <div key={label} className="rounded-2xl p-3 flex flex-col items-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <span style={{ color: C.primary }}>{icon}</span>
                    <span className="text-[10px] font-bold text-white mt-1">{label}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Active Warriors */}
            <section className="rounded-[32px] p-6" style={{ ...glass, border: '1px solid rgba(255,255,255,0.05)' }}>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Warriors</h4>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>
                  12 ONLINE
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {[
                  { name: 'Ghost_One', status: 'In Training', dot: '#22c55e', img: null as string | null },
                  { name: 'Viper_Nex', status: 'Ready Up',    dot: '#22c55e', img: null as string | null },
                  { name: event.host?.username || 'TeeMhor', status: 'Commanding', dot: '#22c55e', img: event.host?.avatar_url || null },
                ].map(({ name, status, dot, img }) => (
                  <div key={name} className="flex items-center gap-3 p-2 rounded-2xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="relative">
                      {img ? (
                        <img src={img} alt={name} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-slate-300"
                          style={{ background: 'rgba(255,255,255,0.08)' }}>
                          {name[0]}
                        </div>
                      )}
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full"
                        style={{ background: dot, border: `2px solid ${C.bgDark}` }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">{name}</p>
                      <p className="text-[10px] text-slate-500">{status}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        {/* ── Footer download bar ── */}
        <footer className="flex-shrink-0">
          <div className="p-6 rounded-[32px] flex items-center gap-8"
            style={{ ...glass, border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${C.primary}33`, color: C.primary }}>
              <Download className="w-6 h-6" />
            </div>
            <div className="flex-1 space-y-2 min-w-0">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">Mission_Briefing_v4.pdf</h4>
                  <p className="text-[10px] text-slate-500">Tactical Strategy Guide</p>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap flex-shrink-0">
                  1 hour 23 min. remaining
                </p>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="h-full w-[45%]" style={{ background: C.primary }} />
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>265Mb of 1.23Gb</span>
                <span>45% Complete</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <Play className="w-3.5 h-3.5 text-white" />
              </button>
              <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: C.primary }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </footer>
      </main>

      {/* ══════════ RIGHT MINI SIDEBAR ══════════ */}
      <aside
        className="w-16 flex flex-col items-center py-6 gap-6 rounded-[32px] shrink-0"
        style={{ background: `${C.bgDark}66`, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="w-10 h-10 rounded-full overflow-hidden mb-4 flex-shrink-0"
          style={{ border: `2px solid ${C.primary}66` }}>
          <div className="w-full h-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-sm">N</div>
        </div>

        <div className="flex flex-col gap-4">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Users className="w-5 h-5" />
          </button>
          {[
            { initial: 'G', dot: '#22c55e' },
            { initial: 'V', dot: '#f97316' },
            { initial: 'T', dot: '#22c55e' },
          ].map(({ initial, dot }, i) => (
            <div key={i} className="relative">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-slate-300"
                style={{ background: 'rgba(255,255,255,0.08)', border: `2px solid ${C.bgDark}` }}>
                {initial}
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full"
                style={{ background: dot, border: `2px solid ${C.bgDark}` }} />
            </div>
          ))}
        </div>

        <div className="mt-auto flex flex-col gap-4">
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}
            onClick={() => navigate('/chat')}>
            <MessageSquare className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)' }}>
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </aside>
    </div>
  );
};
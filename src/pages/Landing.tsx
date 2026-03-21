import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sword, Rocket, Users, TrendingUp, Award, Target,
  Gift, Trophy, Mail, MessageCircle, ArrowRight,
  Globe, AtSign, Video, CheckCircle, Swords,
  ChevronDown, ChevronLeft, ChevronRight, Menu, X, Pause, Play, Loader2,
  Copy, Check, ShoppingBag,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

/* ─────────────── Design Tokens ─────────────── */
const C = {
  primary: '#da0b1d',
  bgDark: '#221011',
  bgLight: '#f8f5f6',
};

const glassCard: React.CSSProperties = {
  background: 'rgba(218,11,29,0.05)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(218,11,29,0.2)',
};

/* ─────────────── Inline Input ─────────────── */
const ContactInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
  <input
    style={{
      width: '100%',
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '14px',
      color: '#f1f5f9',
      outline: 'none',
    }}
    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = C.primary; }}
    onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
    {...props}
  />
);

/* ─────────────── Stat Card ─────────────── */
const StatCard: React.FC<{
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  glowColor?: string;
  valueColor?: string;
}> = ({ label, value, sub, icon, glowColor = C.primary, valueColor = '#fff' }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-10 border-t border-white/10 transition-all duration-300"
      style={{ ...glassCard, transform: hovered ? 'translateY(-8px)' : 'translateY(0)' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Glow blob */}
      <div
        className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full blur-3xl transition-all duration-300"
        style={{ background: `${glowColor}${hovered ? '33' : '1a'}` }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.2em]">{label}</p>
          <div style={{ color: hovered ? glowColor : `${glowColor}66`, transition: 'color 0.3s' }}>
            {icon}
          </div>
        </div>
        <h3
          className="text-5xl font-black tracking-tighter relative inline-block"
          style={{ color: valueColor }}
        >
          {value}
          <span
            className="absolute inset-0 rounded-full blur-xl -z-10"
            style={{ background: `${glowColor}33` }}
          />
        </h3>
        <p className="text-slate-400 text-sm mt-2 font-medium">{sub}</p>
      </div>
    </div>
  );
};

/* ─────────────── Offer Card ─────────────── */
const OfferCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  desc: string;
}> = ({ icon, title, desc }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="p-10 rounded-2xl flex flex-col items-start relative overflow-hidden transition-all duration-500"
      style={{
        ...glassCard,
        borderColor: hovered ? `${C.primary}80` : 'rgba(218,11,29,0.2)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          opacity: hovered ? 0.07 : 0.03,
        }}
      />
      {/* Icon */}
      <div className="mb-8 relative">
        <div
          className="transition-transform duration-500 relative z-10"
          style={{ color: C.primary, transform: hovered ? 'scale(1.1)' : 'scale(1)' }}
        >
          {icon}
        </div>
        <div
          className="absolute inset-0 rounded-full blur-2xl transition-opacity duration-300"
          style={{
            background: `${C.primary}66`,
            transform: 'scale(1.5)',
            opacity: hovered ? 1 : 0,
          }}
        />
      </div>
      <h4 className="text-2xl font-black uppercase tracking-tight mb-3 text-white">{title}</h4>
      <p
        className="text-slate-400 text-sm leading-relaxed pl-4 py-1"
        style={{ borderLeft: `2px solid ${C.primary}33` }}
      >
        {desc}
      </p>
    </div>
  );
};

/* ─────────────── Gallery Item ─────────────── */
const GalleryItem: React.FC<{
  tag: string;
  title: string;
  bgImage?: string;
  bgColor?: string;
  className?: string;
  style?: React.CSSProperties;
}> = ({ tag, title, bgImage, bgColor, className = '', style }) => {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className={`relative group overflow-hidden rounded-2xl border border-white/10 ${className}`}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {bgImage ? (
        <img
          src={bgImage}
          alt={title}
          className="w-full h-full object-cover"
          style={{
            transition: 'transform 0.5s ease',
            transform: hovered ? 'scale(1.1)' : 'scale(1)',
          }}
        />
      ) : (
        <div
          className="w-full h-full"
          style={{
            background: bgColor || `linear-gradient(135deg, ${C.primary}33, ${C.bgDark})`,
          }}
        />
      )}
      <div
        className="absolute inset-0 flex flex-col justify-end p-8"
        style={{ background: 'linear-gradient(to top, rgba(34,16,17,0.9), transparent)' }}
      >
        <span
          className="font-black text-[10px] uppercase mb-2 tracking-widest"
          style={{ color: C.primary }}
        >
          {tag}
        </span>
        <h4 className="text-2xl font-bold text-white">{title}</h4>
      </div>
    </div>
  );
};

/* ─────────────── Loadout Data (fallback) ─────────────── */
const FALLBACK_LOADOUTS = [
  {
    name: 'M13',
    subtitle: 'The Phantom',
    weapon_type: 'Assault',
    mode: 'BR',
    description:
      'Zero-recoil accuracy machine. Dominates mid-to-long range engagements across every zone.',
    accent: '#ec131e',
    image_url:
      'https://static.wikia.nocookie.net/codmobile/images/a/ac/M13_menu.png/revision/latest/scale-to-width-down/512',
  },
  {
    name: 'CBR4',
    subtitle: 'Velocity',
    weapon_type: 'SMG',
    mode: 'MP',
    description:
      'Bar none the fastest TTK in CQC. Built for hyper-aggressive plays and room-clearing.',
    accent: '#38bdf8',
    image_url:
      'https://static.wikia.nocookie.net/codmobile/images/4/4f/CBR4_menu.png/revision/latest/scale-to-width-down/512',
  },
  {
    name: 'DL Q33',
    subtitle: 'Ghost Shot',
    weapon_type: 'Sniper',
    mode: 'BR',
    description:
      'One shot. One kill. The undisputed long-range executioner of CODM ranked lobbies.',
    accent: '#22c55e',
    image_url:
      'https://static.wikia.nocookie.net/codmobile/images/0/0e/DL_Q33_menu.png/revision/latest/scale-to-width-down/512',
  },
];

type CommunityLoadout = {
  id: string;
  weapon_name: string;
  weapon_type: string;
  mode: string;
  image_url: string | null;
  view_count: number | null;
  profiles: {
    ign: string | null;
    username: string | null;
  } | null;
};

/* ═══════════════════════════════════════════════
   MAIN LANDING PAGE
═══════════════════════════════════════════════ */
const LandingPage: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [formData, setFormData] = useState({ uid: '', rank: '', discord: '', whatsapp: '', why: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeLoadout, setActiveLoadout] = useState(0);
  const [isSliding, setIsSliding] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sliderTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [itemsToShow, setItemsToShow] = useState(3);
  const [communityLoadouts, setCommunityLoadouts] = useState<CommunityLoadout[]>([]);
  const [copiedLayoutId, setCopiedLayoutId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCommunityLoadouts = async () => {
      try {
        const { data, error } = await supabase
          .from('weapon_layouts')
          .select(`
            id,
            weapon_name,
            weapon_type,
            mode,
            image_url,
            view_count,
            profiles (
              ign,
              username
            )
          `)
          .order('view_count', { ascending: false })
          .limit(10);

        if (error) {
          console.error('Error fetching community loadouts for landing slider:', error);
          return;
        }

        if (data && data.length > 0) {
          setCommunityLoadouts(data as CommunityLoadout[]);
        }
      } catch (err) {
        console.error('Unexpected error fetching community loadouts:', err);
      }
    };

    fetchCommunityLoadouts();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) setItemsToShow(1);
      else if (window.innerWidth < 1024) setItemsToShow(2);
      else setItemsToShow(3);
    };
    handleResize(); // initial
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const sourceLoadouts = communityLoadouts.length > 0 ? communityLoadouts : null;
  const maxIndex = Math.max(
    0,
    (sourceLoadouts ? sourceLoadouts.length : FALLBACK_LOADOUTS.length) - itemsToShow
  );

  const goToLoadout = useCallback((idx: number) => {
    const nextIdx = Math.max(0, Math.min(idx, maxIndex));
    setActiveLoadout(nextIdx);
  }, [maxIndex]);


  const resetSliderTimer = useCallback(() => {
    if (sliderTimerRef.current) clearInterval(sliderTimerRef.current);
    sliderTimerRef.current = setInterval(() => {
      setActiveLoadout((prev) => (prev >= maxIndex ? 0 : prev + 1));
    }, 6000);
  }, [maxIndex]);

  const toggleVideo = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Auto-advance loadout slider
  useEffect(() => {
    resetSliderTimer();
    return () => { if (sliderTimerRef.current) clearInterval(sliderTimerRef.current); };
  }, [resetSliderTimer]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);


  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || submitted) return;

    const { uid, rank, discord, whatsapp, why } = formData;
    if (!uid.trim() && !discord.trim() && !whatsapp.trim()) return; // basic guard

    setSubmitting(true);
    try {
      // 1. Send ONE broadcast notification (user_id: null)
      // This avoids spamming the database with individual notifications per admin
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          type: 'contact_form_submission',
          title: '🎮 New Application Intel',
          message: `Sector: Recruitment. Identity: ${discord || whatsapp || 'Unknown'}. Message: ${why.substring(0, 50)}...`,
          user_id: null, // BROADCAST: accessible to all admins
          read: false,
          data: {
            uid: uid.trim(),
            rank: rank.trim(),
            discord: discord.trim(),
            whatsapp: whatsapp.trim(),
            why: why.trim(),
            submittedAt: new Date().toISOString(),
          },
          action_data: { action: 'view_access_request' },
        });

      if (insertError) throw insertError;

      // 2. Trigger automated email to all admins
      await supabase.functions.invoke('send-contact-email', {
        body: {
          name: discord || whatsapp || 'New Recruit',
          email: 'recruitment@nexa.gg', // Internal placeholder since form lacks email field
          message: `New Clan Application Received:\n\nUID: ${uid}\nRank: ${rank}\nDiscord: ${discord}\nWhatsApp: ${whatsapp}\n\nMotivation:\n${why}`
        }
      });

      setSubmitted(true);
      setFormData({ uid: '', rank: '', discord: '', whatsapp: '', why: '' });
      setTimeout(() => setSubmitted(false), 5000);
    } catch (err) {
      console.error('Failed to submit application:', err);
      // Still show receipt to user
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="relative min-h-screen w-full flex flex-col overflow-x-hidden"
      style={{ background: C.bgDark, color: '#f1f5f9' }}
    >
      {/* ══════════ NAVBAR ══════════ */}
      <header
        className="fixed top-0 w-full z-50 px-6 py-4 transition-all duration-300"
        style={{ paddingTop: scrolled ? '8px' : '16px' }}
      >
        <nav
          className="max-w-7xl mx-auto rounded-2xl px-6 py-3 flex items-center justify-between"
          style={glassCard}
        >
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div
              className="p-1.5 w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden"
            >
              <img src="/nexa-logo-ramadan.jpg" alt="Nexa Ramadan logo" className="w-full h-full object-cover rounded-xl" />
            </div>
            <h2 className="text-xl font-black tracking-tight">NeXa Esports</h2>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {[
              { name: 'Warriors', href: '#warriors' },
              { name: 'Tactics', href: '#tactics' },
              { name: 'Loadouts', href: '#loadouts' },
              { name: 'Gallery', href: '#gallery' },
              { name: 'Marketplace', href: '/marketplace-info' },
              { name: 'Blog', href: '/blog' },
            ].map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm font-medium transition-colors"
                style={{ color: '#94a3b8' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.primary)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8')}
              >
                {link.name}
              </a>
            ))}
          </div>

          {/* CTA + Mobile toggle */}
          <div className="flex items-center gap-3">
            <a
              href="/auth/login"
              className="hidden md:block px-6 py-2.5 rounded-xl font-black text-sm text-white transition-all"
              style={{ background: C.primary, boxShadow: `0 4px 14px ${C.primary}4d` }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.filter = 'brightness(1.1)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.filter = 'brightness(1)')}
            >
              Login
            </a>
            <button
              className="md:hidden p-2 rounded-xl"
              style={{ color: '#94a3b8' }}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>

        {/* Mobile menu */}
        {menuOpen && (
          <div
            className="md:hidden max-w-7xl mx-auto mt-2 rounded-2xl p-6"
            style={glassCard}
          >
            {[
              { name: 'Warriors', href: '#warriors' },
              { name: 'Tactics', href: '#tactics' },
              { name: 'Loadouts', href: '#loadouts' },
              { name: 'Gallery', href: '#gallery' },
              { name: 'Marketplace', href: '/marketplace-info' },
              { name: 'Blog', href: '/blog' },
            ].map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="block py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link.name}
              </a>
            ))}
            <a
              href="/auth/login"
              className="block mt-4 text-center py-3 rounded-xl font-black text-sm text-white"
              style={{ background: C.primary }}
              onClick={() => setMenuOpen(false)}
            >
              Login
            </a>
          </div>
        )}
      </header>

      {/* ══════════ HERO ══════════ */}
      <main className="flex-1 flex flex-col">
        <section
          ref={heroRef}
          className="relative w-full overflow-hidden"
          style={{ minHeight: '100vh' }}
        >
          {/* ── Full-cover background video ── */}
          <video
            ref={videoRef}
            src="/video/codm-cinematic-trailer.mp4"
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
            style={{ zIndex: 0 }}
          />

          {/* ── Dark gradient overlays for readability ── */}
          <div
            className="absolute inset-0"
            style={{
              zIndex: 1,
              background: 'linear-gradient(to right, rgba(14,5,5,0.88) 0%, rgba(14,5,5,0.55) 55%, rgba(14,5,5,0.25) 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              zIndex: 1,
              background: 'linear-gradient(to top, rgba(34,16,17,0.9) 0%, transparent 40%)',
            }}
          />

          {/* ── Hero content ── */}
          <div
            className="relative flex flex-col justify-center min-h-screen px-6 pt-32 pb-28"
            style={{ zIndex: 2 }}
          >
            <div className="max-w-7xl mx-auto w-full">
              <div className="max-w-2xl space-y-8">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
                  style={{
                    background: `${C.primary}1a`,
                    border: `1px solid ${C.primary}33`,
                    color: C.primary,
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <CheckCircle className="w-4 h-4" />
                  Season 10 Champions
                </div>

                <h1
                  className="font-black leading-[0.9] tracking-tighter uppercase"
                  style={{ fontSize: 'clamp(3.5rem, 8vw, 7rem)', textShadow: '0 4px 32px rgba(0,0,0,0.6)' }}
                >
                  Dominate
                  <br />
                  <span style={{ color: C.primary }}>The Game</span>
                </h1>

                <p className="text-lg text-slate-300 max-w-lg leading-relaxed" style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}>
                  Experience the pinnacle of CODM competitive play with Nexa Esports. Join the ranks
                  of elite warriors and conquer the global leaderboard.
                </p>

                <div className="flex flex-wrap gap-4 pt-4">
                  <a
                    href="/auth/signup"
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white transition-all"
                    style={{ background: C.primary, boxShadow: `0 8px 24px ${C.primary}4d` }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.05)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)')}
                  >
                    <Rocket className="w-5 h-5" />
                    Join the Elite
                  </a>
                  <a
                    href="/marketplace-info"
                    className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white transition-colors"
                    style={{ ...glassCard, border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)' }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(218,11,29,0.05)')}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    Marketplace
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* ── Pause / Play button — bottom-right ── */}
          <button
            onClick={toggleVideo}
            aria-label={isPlaying ? 'Pause video' : 'Play video'}
            className="absolute bottom-8 right-8 flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 group"
            style={{
              zIndex: 10,
              background: 'rgba(255,255,255,0.12)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = `${C.primary}cc`; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
          >
            {isPlaying
              ? <Pause className="w-5 h-5 text-white" />
              : <Play className="w-5 h-5 text-white" />}
          </button>

          {/* ── Scroll cue ── */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{ zIndex: 10 }}>
            <ChevronDown
              className="w-6 h-6 text-white/40 animate-bounce"
              style={{ animationDuration: '2s' }}
            />
          </div>
        </section>

        {/* ══════════ STATS ══════════ */}
        <section id="warriors" className="px-6 py-12">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard
              label="Active Roster"
              value="70+"
              sub="Elite Warriors"
              icon={<Users className="w-6 h-6" />}
              glowColor={C.primary}
            />
            <StatCard
              label="Combat Success"
              value="95%"
              sub="Global Win Rate"
              icon={<TrendingUp className="w-6 h-6" />}
              glowColor="#0bda92"
              valueColor="#0bda92"
            />
            <StatCard
              label="Competitive Standing"
              value="#1"
              sub="Regional Ranking"
              icon={<Award className="w-6 h-6" />}
              glowColor={C.primary}
            />
          </div>
        </section>

        {/* ══════════ WHAT WE OFFER ══════════ */}
        <section
          id="tactics"
          className="px-6 py-20"
          style={{ background: 'rgba(34,16,17,0.5)' }}
        >
          <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className="text-4xl font-black uppercase tracking-tight text-white">
              What We <span style={{ color: C.primary }}>Offer</span>
            </h2>
            <p className="text-slate-400 mt-4 max-w-2xl mx-auto">
              Beyond the gameplay, we build legends. Join a community designed for competitive excellence.
            </p>
          </div>
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <OfferCard
              icon={<Target className="w-12 h-12" />}
              title="Tactical Mastery"
              desc="Dominate every map with surgical precision and pro-level stratagems developed by veteran analysts."
            />
            <OfferCard
              icon={<Users className="w-12 h-12" />}
              title="Elite Community"
              desc="Forge unbreakable bonds in a network of legends committed to absolute competitive superiority."
            />
            <OfferCard
              icon={<Trophy className="w-12 h-12" />}
              title="Championships"
              desc="Claim your throne on the global stage with priority seeding in tier-1 tournaments worldwide."
            />
            <OfferCard
              icon={<Gift className="w-12 h-12" />}
              title="Prime Assets"
              desc="Unlock professional sponsorship deals, high-tier tactical gear, and custom clan armaments."
            />
          </div>
        </section>

        {/* ══════════ LOADOUTS SLIDER ══════════ */}
        <section id="loadouts" className="py-24 relative overflow-hidden" style={{ background: '#080202' }}>
          <div className="max-w-[1400px] mx-auto px-6 relative" style={{ zIndex: 1 }}>
            {/* Section header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 px-4">
              <div className="mb-6 md:mb-0">
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4"
                  style={{ background: `${C.primary}18`, border: `1px solid ${C.primary}33`, color: C.primary }}
                >
                  <Sword className="w-3 h-3" /> NeXa Arsenal
                </div>
                <h2 className="text-5xl font-black uppercase tracking-tight text-white leading-tight">
                  Elite <span style={{ color: C.primary }}>Loadouts</span>
                </h2>
                <p className="text-slate-500 mt-4 text-base max-w-xl">
                  Dominating weapon builds optimized by clan masters for maximum combat efficiency in high-performance lobbies.
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => { goToLoadout(activeLoadout - 1); resetSliderTimer(); }}
                  disabled={activeLoadout === 0}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed group"
                >
                  <ChevronLeft className="w-5 h-5 text-white group-hover:-translate-x-0.5 transition-transform" />
                </button>
                <div className="flex gap-1.5 px-4">
                  {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-1 rounded-full transition-all duration-300"
                      style={{
                        width: i === activeLoadout ? '32px' : '8px',
                        background: i === activeLoadout ? C.primary : 'rgba(255,255,255,0.1)'
                      }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => { goToLoadout(activeLoadout + 1); resetSliderTimer(); }}
                  disabled={activeLoadout >= maxIndex}
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
                  style={{ background: C.primary, boxShadow: `0 4px 20px ${C.primary}4d` }}
                >
                  <ChevronRight className="w-5 h-5 text-white group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>

            {/* Slider Container */}
            <div className="overflow-hidden px-4">
              <div
                className="flex transition-transform duration-700 ease-[cubic-bezier(0.25,1,0.5,1)]"
                style={{ transform: `translateX(-${activeLoadout * (100 / itemsToShow)}%)` }}
              >
                {(sourceLoadouts || FALLBACK_LOADOUTS).map((rawItem, idx) => {
                  const item: any = rawItem;
                  const isCommunity = !!sourceLoadouts;
                  const name = isCommunity ? item.weapon_name : item.name;
                  const subtitle = isCommunity
                    ? (item.profiles?.ign || item.profiles?.username || 'Community Loadout')
                    : item.subtitle;
                  const weaponType = item.weapon_type || 'Assault';
                  const mode = item.mode;
                  const accent =
                    !isCommunity && 'accent' in item
                      ? (item as any).accent
                      : weaponType === 'SMG'
                        ? '#38bdf8'
                        : weaponType === 'Sniper'
                          ? '#22c55e'
                          : '#ec131e';
                  const imageUrl = isCommunity ? item.image_url : (item as any).image_url;
                  const views = isCommunity ? item.view_count || 0 : 0;
                  const layoutId: string =
                    (isCommunity && item.id) || `${name}-${weaponType}-${mode}-${idx}`;

                  const categoryShortMap: Record<string, string> = {
                    Assault: 'AR',
                    'Assault Rifle': 'AR',
                    SMG: 'SMG',
                    Sniper: 'SNP',
                    LMG: 'LMG',
                    Shotgun: 'SG',
                    Pistol: 'PST',
                    Marksman: 'MRK',
                  };
                  const categoryShort = categoryShortMap[weaponType] || 'AR';

                  const handleCopyLink = async () => {
                    try {
                      const baseUrl = window.location.origin;
                      const link = isCommunity
                        ? `${baseUrl}/weapon-layouts?layoutId=${layoutId}`
                        : `${baseUrl}/weapon-layouts`;

                      if (navigator.clipboard && navigator.clipboard.writeText) {
                        await navigator.clipboard.writeText(link);
                      } else {
                        const textarea = document.createElement('textarea');
                        textarea.value = link;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand('copy');
                        document.body.removeChild(textarea);
                      }

                      setCopiedLayoutId(layoutId);
                      setTimeout(() => {
                        setCopiedLayoutId((current) =>
                          current === layoutId ? null : current
                        );
                      }, 2000);
                    } catch (err) {
                      console.error('Failed to copy loadout link:', err);
                    }
                  };

                  const isCopied = copiedLayoutId === layoutId;

                  return (
                    <div
                      key={idx}
                      className="flex-shrink-0 px-3"
                      style={{ width: `${100 / itemsToShow}%` }}
                    >
                      <div
                        className="group relative h-[480px] rounded-[28px] overflow-hidden border border-white/5 transition-all duration-500 hover:border-white/20 hover:-translate-y-1.5"
                        style={{
                          background: 'linear-gradient(145deg, #150607, #070103)',
                          boxShadow:
                            '20px 20px 40px rgba(0,0,0,0.75), -16px -16px 32px rgba(255,255,255,0.03)',
                        }}
                      >
                        {/* Accent Glow */}
                        <div
                          className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] opacity-0 group-hover:opacity-20 transition-opacity duration-700"
                          style={{ background: accent }}
                        />

                        {/* Content */}
                        <div className="relative p-8 h-full flex flex-col">
                          {/* Header */}
                          <div className="flex items-start justify-between mb-8">
                            <div>
                              <span className="text-[10px] font-black tracking-widest text-slate-500 uppercase block mb-1">
                                {weaponType.toUpperCase()}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">
                                {mode === 'BR'
                                  ? 'Battle Royale'
                                  : mode === 'MP'
                                    ? 'Multiplayer'
                                    : mode || 'Mode'}
                              </span>
                            </div>
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs"
                              style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}33` }}
                            >
                              {categoryShort}
                            </div>
                          </div>

                          {/* Weapon Title */}
                          <div className="mb-6">
                            <h3
                              className="text-4xl font-black text-white uppercase italic group-hover:text-primary transition-colors duration-300"
                              style={{ color: accent }}
                            >
                              {name}
                            </h3>
                            <p className="text-slate-500 font-bold tracking-wide mt-1">"{subtitle}"</p>
                          </div>

                          {/* Image */}
                          <div className="relative h-44 my-4 flex items-center justify-center">
                            {imageUrl ? (
                              <img
                                src={imageUrl}
                                alt={name}
                                className="w-full h-full object-contain filter drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover:scale-110"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-bold uppercase tracking-widest">
                                Loadout preview
                              </div>
                            )}
                          </div>

                          {/* Community meta + actions */}
                          <div className="mt-auto mb-4 space-y-3">
                            <div className="flex items-center justify-between gap-3">
                              <div className="space-y-1">
                                <p className="text-xs text-slate-400 font-medium">
                                  Created by{' '}
                                  <span className="text-slate-200 font-semibold">
                                    {subtitle}
                                  </span>
                                </p>
                                {isCommunity && (
                                  <p className="text-[11px] text-slate-500">
                                    Views{' '}
                                    <span className="text-slate-200 font-semibold">
                                      {views}
                                    </span>
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={handleCopyLink}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wide border border-white/10 bg-white/5 hover:bg-white/10 text-slate-100 transition-colors"
                              >
                                {isCopied ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 text-slate-300" />
                                )}
                                <span>{isCopied ? 'Copied' : 'Copy link'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ CLAN GALLERY ══════════ */}
        <section id="gallery" className="px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-end justify-between mb-12">
              <div>
                <h2 className="text-4xl font-black uppercase tracking-tight text-white">
                  Clan <span style={{ color: C.primary }}>Gallery</span>
                </h2>
                <p className="text-slate-400 mt-2">Moments of glory captured on the battlefield.</p>
              </div>
              <button
                className="flex items-center gap-2 text-sm font-black uppercase tracking-widest group transition-colors"
                style={{ color: C.primary }}
              >
                View All
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            {/* Gallery grid */}
            <div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Large left cell spans 2 rows on desktop */}
              <div
                className="relative group overflow-hidden rounded-2xl border border-white/10 md:row-span-2 min-h-[400px] md:min-h-0"
              >
                <div
                  className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(160deg, ${C.primary}66 0%, #3a0a0f 40%, ${C.bgDark} 100%)`,
                  }}
                >
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{
                      backgroundImage: 'radial-gradient(circle, rgba(218,11,29,0.15) 1px, transparent 1px)',
                      backgroundSize: '30px 30px',
                    }}
                  >
                    <img src="/nexa-logo-ramadan.jpg" alt="Nexa Logo" className="w-24 h-24 opacity-20 object-cover rounded-full" style={{ filter: 'grayscale(1) brightness(1.5)' }} />
                  </div>
                </div>
                <div
                  className="absolute inset-0 flex flex-col justify-end p-8"
                  style={{ background: 'linear-gradient(to top, rgba(34,16,17,0.9), transparent)' }}
                >
                  <span className="font-black text-[10px] uppercase mb-2 tracking-widest" style={{ color: C.primary }}>
                    Clan War
                  </span>
                  <h4 className="text-2xl font-bold text-white">Midnight Operation</h4>
                </div>
              </div>

              {[
                { tag: 'Training Day', title: 'Strategy Briefing', col: '#1a4030' },
                { tag: 'Tournament Win', title: 'Regional Cup #1', col: '#1a1530' },
              ].map(({ tag, title, col }) => (
                <div
                  key={title}
                  className="relative group overflow-hidden rounded-2xl border border-white/10 min-h-[290px]"
                >
                  <div
                    className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                    style={{ background: `linear-gradient(135deg, ${col}, ${C.bgDark})` }}
                  >
                    <div
                      className="w-full h-full flex items-center justify-center"
                      style={{
                        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                      }}
                    />
                  </div>
                  <div
                    className="absolute inset-0 flex flex-col justify-end p-6"
                    style={{ background: 'linear-gradient(to top, rgba(34,16,17,0.9), transparent)' }}
                  >
                    <span className="font-black text-[10px] uppercase mb-1 tracking-widest" style={{ color: C.primary }}>
                      {tag}
                    </span>
                    <h4 className="text-xl font-bold text-white">{title}</h4>
                  </div>
                </div>
              ))}

              {/* Wide bottom cell spans 2 cols on desktop */}
              <div
                className="relative group overflow-hidden rounded-2xl border border-white/10 md:col-span-2 min-h-[290px]"
              >
                <div
                  className="w-full h-full transition-transform duration-500 group-hover:scale-110"
                  style={{
                    background: `linear-gradient(135deg, #0f1a30, ${C.bgDark}, #2a0a10)`,
                  }}
                >
                  <div
                    className="w-full h-full flex items-center justify-center gap-6"
                    style={{
                      backgroundImage: 'radial-gradient(circle, rgba(218,11,29,0.08) 1px, transparent 1px)',
                      backgroundSize: '28px 28px',
                    }}
                  >
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-12 h-12 rounded-full flex items-center justify-center font-black text-sm"
                        style={{
                          background: `${C.primary}${i === 2 ? '33' : '1a'}`,
                          border: `2px solid ${C.primary}${i === 2 ? '80' : '33'}`,
                          color: C.primary,
                          transform: i === 2 ? 'scale(1.3)' : 'scale(1)',
                        }}
                      >
                        {['G', 'R', 'N', 'V', 'S'][i]}
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  className="absolute inset-0 flex flex-col justify-end p-8"
                  style={{ background: 'linear-gradient(to top, rgba(34,16,17,0.9), transparent)' }}
                >
                  <span className="font-black text-[10px] uppercase mb-2 tracking-widest" style={{ color: C.primary }}>
                    The Squad
                  </span>
                  <h4 className="text-2xl font-bold text-white">Unity is Strength</h4>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════ CONTACT / JOIN ══════════ */}
        <section
          id="contact"
          className="px-6 py-20"
          style={{ background: 'rgba(34,16,17,0.3)' }}
        >
          <div
            className="max-w-5xl mx-auto p-12 relative overflow-hidden"
            style={{ ...glassCard, borderRadius: '32px' }}
          >
            {/* Glow */}
            <div
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-3xl pointer-events-none"
              style={{ background: `${C.primary}33` }}
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 relative z-10">
              {/* Left info */}
              <div>
                <h2 className="text-4xl font-black uppercase mb-6 text-white">
                  Ready to <span style={{ color: C.primary }}>Rise?</span>
                </h2>
                <p className="text-slate-400 mb-8 leading-relaxed">
                  Fill out the application form to begin your journey. Our recruitment officers
                  will review your stats and contact you for a trial.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: `${C.primary}1a`, color: C.primary }}
                    >
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Recruitment</p>
                      <a
                        href="mailto:nexaesportmail@gmail.com"
                        className="text-sm text-slate-200 hover:underline"
                      >
                        nexaesportmail@gmail.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div
                      className="p-3 rounded-xl"
                      style={{ background: `${C.primary}1a`, color: C.primary }}
                    >
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Discord</p>
                      <p className="text-sm text-slate-200">discord.gg/nexa_elite</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right form */}
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 block">
                      CODM UID
                    </label>
                    <ContactInput
                      placeholder="UID: 12345…"
                      value={formData.uid}
                      onChange={(e) => setFormData({ ...formData, uid: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 block">
                      Rank
                    </label>
                    <ContactInput
                      placeholder="Legendary"
                      value={formData.rank}
                      onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 block">
                      Discord Tag
                    </label>
                    <ContactInput
                      placeholder="User#0000"
                      value={formData.discord}
                      onChange={(e) => setFormData({ ...formData, discord: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 block">
                      WhatsApp Number
                    </label>
                    <ContactInput
                      placeholder="+1 234…"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-1 block">
                    Why NeXa?
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us why you want to join…"
                    value={formData.why}
                    onChange={(e) => setFormData({ ...formData, why: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#f1f5f9',
                      outline: 'none',
                      resize: 'vertical',
                    }}
                    onFocus={(e) => ((e.target as HTMLTextAreaElement).style.borderColor = C.primary)}
                    onBlur={(e) => ((e.target as HTMLTextAreaElement).style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || submitted}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-white transition-all"
                  style={{
                    background: submitted ? '#22c55e' : C.primary,
                    boxShadow: `0 4px 20px ${submitted ? '#22c55e4d' : `${C.primary}4d`}`,
                    transition: 'background 0.3s ease, box-shadow 0.3s ease',
                    opacity: submitting ? 0.8 : 1,
                  }}
                  onMouseEnter={(e) => { if (!submitted && !submitting) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'; }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending Request…
                    </>
                  ) : submitted ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Request Received — We'll reach out!
                    </>
                  ) : (
                    <>
                      <ArrowRight className="w-4 h-4" />
                      Submit Application
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* ══════════ FOOTER ══════════ */}
      <footer
        className="px-6 py-12"
        style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
      >
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3 opacity-60">
            <div
              className="p-1.5 w-14 h-14 rounded-xl flex items-center justify-center overflow-hidden"
            >
              <img src="/nexa-logo-ramadan.jpg" alt="Nexa Ramadan logo" className="w-full h-full object-cover rounded-xl" />
            </div>
            <h2 className="text-lg font-black tracking-tight">NeXa Esports</h2>
          </div>

          <div className="flex flex-col items-center md:items-start gap-1 text-center md:text-left">
            <p className="text-sm text-slate-500">
              © 2024 Nexa Esports Clan. All Rights Reserved. Not affiliated with Activision or TiMi Studios.
            </p>
            <a
              href="mailto:nexaesportmail@gmail.com"
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Contact: nexaesportmail@gmail.com
            </a>
          </div>

          {/* Social icons */}
          <div className="flex gap-6">
            {[
              { icon: <Globe className="w-5 h-5" />, href: '#' },
              { icon: <AtSign className="w-5 h-5" />, href: '#' },
              { icon: <Video className="w-5 h-5" />, href: '#' },
            ].map(({ icon, href }, i) => (
              <a
                key={i}
                href={href}
                className="transition-colors text-slate-500"
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.primary)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#64748b')}
              >
                {icon}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export const Landing = LandingPage;
export default LandingPage;

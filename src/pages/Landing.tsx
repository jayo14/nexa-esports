import React, { useState, useEffect, useRef } from 'react';
import {
  Sword, Rocket, Users, TrendingUp, Award, Target,
  Gift, Trophy, Mail, MessageCircle, ArrowRight,
  Globe, AtSign, Video, CheckCircle, Swords,
  ChevronDown, Menu, X,
} from 'lucide-react';

/* ─────────────── Design Tokens ─────────────── */
const C = {
  primary:  '#da0b1d',
  bgDark:   '#221011',
  bgLight:  '#f8f5f6',
};

const glassCard: React.CSSProperties = {
  background:  'rgba(218,11,29,0.05)',
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
      fontFamily: "'Space Grotesk', sans-serif",
    }}
    onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = C.primary; }}
    onBlur={(e)  => { (e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.1)'; }}
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

/* ═══════════════════════════════════════════════
   MAIN LANDING PAGE
═══════════════════════════════════════════════ */
const LandingPage: React.FC = () => {
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [scrolled,     setScrolled]     = useState(false);
  const [formData,     setFormData]     = useState({ uid: '', rank: '', discord: '', why: '' });
  const [submitted,    setSubmitted]    = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    setFormData({ uid: '', rank: '', discord: '', why: '' });
  };

  return (
    <div
      className="relative min-h-screen w-full flex flex-col overflow-x-hidden"
      style={{ background: C.bgDark, fontFamily: "'Space Grotesk', sans-serif", color: '#f1f5f9' }}
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
              className="p-1.5 rounded-lg flex items-center justify-center"
              style={{ background: C.primary, boxShadow: `0 0 20px ${C.primary}66` }}
            >
              <Swords className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-black tracking-tight">NeXa_Esports</h2>
          </div>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {['Warriors', 'Tactics', 'Gallery', 'Rankings'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="text-sm font-medium transition-colors"
                style={{ color: '#94a3b8' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = C.primary)}
                onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#94a3b8')}
              >
                {link}
              </a>
            ))}
          </div>

          {/* CTA + Mobile toggle */}
          <div className="flex items-center gap-3">
            <a
              href="#contact"
              className="hidden md:block px-6 py-2.5 rounded-xl font-black text-sm text-white transition-all"
              style={{ background: C.primary, boxShadow: `0 4px 14px ${C.primary}4d` }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.filter = 'brightness(1.1)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.filter = 'brightness(1)')}
            >
              Join the Elite
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
            {['Warriors', 'Tactics', 'Gallery', 'Rankings'].map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="block py-3 text-sm font-medium text-slate-400 hover:text-white transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                {link}
              </a>
            ))}
            <a
              href="#contact"
              className="block mt-4 text-center py-3 rounded-xl font-black text-sm text-white"
              style={{ background: C.primary }}
              onClick={() => setMenuOpen(false)}
            >
              Join the Elite
            </a>
          </div>
        )}
      </header>

      {/* ══════════ HERO ══════════ */}
      <main className="flex-1 flex flex-col">
        <section
          ref={heroRef}
          className="relative pt-32 pb-20 px-6"
          style={{
            background: `radial-gradient(circle at center, rgba(218,11,29,0.15) 0%, ${C.bgDark} 100%)`,
          }}
        >
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text */}
            <div className="space-y-8">
              <div
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest"
                style={{
                  background: `${C.primary}1a`,
                  border: `1px solid ${C.primary}33`,
                  color: C.primary,
                }}
              >
                <CheckCircle className="w-4 h-4" />
                Season 10 Champions
              </div>

              <h1
                className="font-black leading-[0.9] tracking-tighter uppercase"
                style={{ fontSize: 'clamp(3.5rem, 8vw, 7rem)' }}
              >
                Dominate
                <br />
                <span style={{ color: C.primary }}>The Game</span>
              </h1>

              <p className="text-lg text-slate-400 max-w-lg leading-relaxed">
                Experience the pinnacle of CODM competitive play with NeXa_Esports. Join the ranks
                of elite warriors and conquer the global leaderboard.
              </p>

              <div className="flex flex-wrap gap-4 pt-4">
                <a
                  href="#contact"
                  className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white transition-all"
                  style={{ background: C.primary, boxShadow: `0 8px 24px ${C.primary}4d` }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.transform = 'scale(1)')}
                >
                  <Rocket className="w-5 h-5" />
                  Join the Elite
                </a>
                <a
                  href="#warriors"
                  className="px-8 py-4 rounded-2xl font-black text-lg text-white transition-colors"
                  style={{ ...glassCard, border: '1px solid rgba(255,255,255,0.1)' }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(218,11,29,0.05)')}
                >
                  Explore Clan
                </a>
              </div>
            </div>

            {/* Right: Hero image */}
            <div className="relative group">
              <div
                className="absolute -inset-4 rounded-full blur-3xl transition-opacity duration-300"
                style={{ background: `${C.primary}33`, opacity: 0.5 }}
              />
              <div
                className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl"
                style={{ aspectRatio: '1/1' }}
              >
                <div
                  className="w-full h-full flex items-center justify-center"
                  style={{
                    background: `linear-gradient(135deg, ${C.primary}33 0%, ${C.bgDark} 60%, #3a0a0f 100%)`,
                  }}
                >
                  {/* Decorative tactical grid */}
                  <div className="relative w-full h-full flex items-center justify-center">
                    <div
                      className="absolute inset-0"
                      style={{
                        backgroundImage: `
                          linear-gradient(rgba(218,11,29,0.08) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(218,11,29,0.08) 1px, transparent 1px)
                        `,
                        backgroundSize: '40px 40px',
                      }}
                    />
                    <div
                      className="relative z-10 text-center"
                      style={{ filter: `drop-shadow(0 0 40px ${C.primary}80)` }}
                    >
                      <Swords
                        className="w-40 h-40 mx-auto mb-4"
                        style={{ color: C.primary, opacity: 0.9 }}
                      />
                      <p
                        className="text-xs font-black uppercase tracking-[0.4em]"
                        style={{ color: `${C.primary}cc` }}
                      >
                        NeXa_Esports
                      </p>
                    </div>
                    {/* Animated pulse rings */}
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="absolute rounded-full border animate-ping"
                        style={{
                          width:  `${i * 120}px`,
                          height: `${i * 120}px`,
                          borderColor: `${C.primary}${['33', '22', '11'][i - 1]}`,
                          animationDuration: `${2 + i}s`,
                          animationDelay: `${i * 0.4}s`,
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(to top, ${C.bgDark} 0%, transparent 50%)` }}
                />
              </div>
            </div>
          </div>

          {/* Scroll cue */}
          <div className="flex justify-center mt-16">
            <ChevronDown
              className="w-6 h-6 text-slate-600 animate-bounce"
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
              className="grid gap-6"
              style={{
                gridTemplateColumns: 'repeat(3, 1fr)',
                gridTemplateRows: 'repeat(2, 290px)',
              }}
            >
              {/* Large left cell spans 2 rows */}
              <div
                className="relative group overflow-hidden rounded-2xl border border-white/10"
                style={{ gridRow: '1 / 3' }}
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
                    <Swords className="w-24 h-24 opacity-20" style={{ color: C.primary }} />
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
                { tag: 'Training Day',  title: 'Strategy Briefing',  col: '#1a4030' },
                { tag: 'Tournament Win', title: 'Regional Cup #1', col: '#1a1530' },
              ].map(({ tag, title, col }) => (
                <div
                  key={title}
                  className="relative group overflow-hidden rounded-2xl border border-white/10"
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

              {/* Wide bottom cell spans 2 cols */}
              <div
                className="relative group overflow-hidden rounded-2xl border border-white/10"
                style={{ gridColumn: '2 / 4' }}
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
                  {[
                    { icon: <Mail className="w-5 h-5" />, label: 'Recruitment', value: 'join@nexa_esports.com' },
                    { icon: <MessageCircle className="w-5 h-5" />, label: 'Discord', value: 'discord.gg/nexa_elite' },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex items-center gap-4">
                      <div
                        className="p-3 rounded-xl"
                        style={{ background: `${C.primary}1a`, color: C.primary }}
                      >
                        {icon}
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                        <p className="text-sm text-slate-200">{value}</p>
                      </div>
                    </div>
                  ))}
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
                      fontFamily: "'Space Grotesk', sans-serif",
                    }}
                    onFocus={(e) => ((e.target as HTMLTextAreaElement).style.borderColor = C.primary)}
                    onBlur={(e)  => ((e.target as HTMLTextAreaElement).style.borderColor = 'rgba(255,255,255,0.1)')}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-black text-white transition-all"
                  style={{
                    background: submitted ? '#22c55e' : C.primary,
                    boxShadow: `0 4px 20px ${submitted ? '#22c55e4d' : `${C.primary}4d`}`,
                    transition: 'background 0.3s ease, box-shadow 0.3s ease',
                  }}
                  onMouseEnter={(e) => { if (!submitted) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'; }}
                >
                  {submitted ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Application Submitted!
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
              className="p-1.5 rounded-lg flex items-center justify-center"
              style={{ background: `${C.primary}80` }}
            >
              <Swords className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-black tracking-tight">NeXa_Esports</h2>
          </div>

          <p className="text-sm text-slate-500 text-center">
            © 2024 NeXa_Esports Clan. All Rights Reserved. Not affiliated with Activision or TiMi Studios.
          </p>

          {/* Social icons */}
          <div className="flex gap-6">
            {[
              { icon: <Globe className="w-5 h-5" />, href: '#' },
              { icon: <AtSign className="w-5 h-5" />, href: '#' },
              { icon: <Video  className="w-5 h-5" />, href: '#' },
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

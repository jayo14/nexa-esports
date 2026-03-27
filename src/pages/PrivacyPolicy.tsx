import React from 'react';
import { Shield, Lock, Eye, FileText, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0e0707] text-slate-200 font-sans selection:bg-rose-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] bg-rose-900/10" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] bg-rose-900/10" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-20">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-12 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="font-black uppercase tracking-widest text-[10px]">Back to HQ</span>
        </button>

        <header className="mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-rose-500/10 border border-rose-500/20 text-rose-500 mb-6">
            <Lock className="w-3 h-3" /> Data Protection Protocol
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase mb-4 leading-[0.9]">
            Privacy <span className="text-rose-500">Policy</span>
          </h1>
          <p className="text-slate-500 font-medium">Last Updated: March 2024 • Version 2.1.0-Tactical</p>
        </header>

        <div className="space-y-12">
          <section className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <h2 className="flex items-center gap-3 text-2xl font-black text-white uppercase tracking-tight mb-6">
              <Eye className="w-6 h-6 text-rose-500" /> Executive Summary
            </h2>
            <p className="leading-relaxed text-slate-400">
              At NeXa Esports, we treat your digital presence with the same tactical respect we bring to the battlefield. This policy outlines how we collect, deploy, and safeguard your data within the NeXa ecosystem. We don't sell your data to third-party hostiles — period.
            </p>
          </section>

          <div className="grid gap-8">
            <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">1. Intelligence Gathering</h3>
              <p className="leading-relaxed text-slate-400 mb-4">
                We collect essential operative data to ensure optimal performance of the platform:
              </p>
              <ul className="space-y-3 list-disc pl-5 text-slate-400">
                <li>Identity markers (IGN, Discord ID, TikTok Handle) to manage your clan profile.</li>
                <li>Combat metrics (Kills, Wins, Tournament performance) for ranking protocols.</li>
                <li>Device metadata to optimize the platform's mobile-first experience.</li>
                <li>Communication logs within our secure tactical chat for security purposes.</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">2. Strategic Data Deployment</h3>
              <p className="leading-relaxed text-slate-400">
                Your data is strictly used to:
              </p>
              <ul className="space-y-3 list-disc pl-5 text-slate-400 mt-4">
                <li>Optimize tournament matchmaking and clan balancing.</li>
                <li>Process rewards and marketplace transactions securely.</li>
                <li>Send critical mission alerts and server maintenance notifications.</li>
                <li>Prevent unauthorized incursions and hostile behavior (anti-cheat).</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4">3. Operative Boundaries</h3>
              <p className="leading-relaxed text-slate-400">
                You maintain absolute command over your data. You can request a "wipe protocol" (account deletion) at any time. We retain certain logs only as required by regional digital laws.
              </p>
            </section>
          </div>

          <footer className="pt-20 border-t border-white/10 text-center">
            <div className="p-10 rounded-3xl" style={glassCard}>
              <h4 className="text-white font-black uppercase tracking-tighter text-2xl mb-4">Need Clarification?</h4>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                If you have questions regarding our data protection protocols, contact the HQ Data Officer.
              </p>
              <a
                href="mailto:legal@nexa.gg"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-white bg-rose-500 hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20"
              >
                <FileText className="w-5 h-5" /> Intelligence Request
              </a>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

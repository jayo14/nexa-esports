import React from 'react';
import { Gavel, Scale, AlertOctagon, CheckSquare, ChevronLeft, ShieldCheck } from 'lucide-react';
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

export const TermsOfService: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0e0707] text-slate-200 font-sans selection:bg-rose-500/30">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] bg-rose-900/10" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] bg-rose-900/10" />
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
            <ShieldCheck className="w-3 h-3" /> Rules of Engagement
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase mb-4 leading-[0.9]">
            Terms of <span className="text-rose-500">Service</span>
          </h1>
          <p className="text-slate-500 font-medium">Agreement Updated: March 2024</p>
        </header>

        <div className="space-y-12">
          <section className="p-8 rounded-3xl border border-white/5 bg-white/[0.02] backdrop-blur-sm">
            <h2 className="flex items-center gap-3 text-2xl font-black text-white uppercase tracking-tight mb-6">
              <Gavel className="w-6 h-6 text-rose-500" /> Operative Conduct
            </h2>
            <p className="leading-relaxed text-slate-400">
              By deploying with the NeXa Esports platform, you agree to follow the ROE (Rules of Engagement). These terms govern your access to the clan management tools, marketplace, and competitive tiers. Violation leads to immediate dishonorable discharge (account suspension).
            </p>
          </section>

          <div className="grid gap-8">
            <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <Scale className="w-5 h-5 text-rose-500" /> 1. Operational Security (Account)
              </h3>
              <p className="leading-relaxed text-slate-400 mb-4">
                You are solely responsible for your account's operational security. Compromised accounts should be reported immediately. Account sharing with non-operatives is strictly forbidden for security reasons.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-rose-500" /> 2. Fair Play Protocols
              </h3>
              <p className="leading-relaxed text-slate-400">
                NeXa Esports maintains a zero-tolerance policy towards hostile tactical shifts (cheating, hacking, exploiting). Any behavior that undermines the competitive integrity of the clan or our partners will lead to a permanent blackout of your operative status.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                <AlertOctagon className="w-5 h-5 text-rose-500" /> 3. Marketplace & Transactions
              </h3>
              <p className="leading-relaxed text-slate-400">
                All transactions in the NeXa Marketplace are final. Any attempt at unauthorized credit maneuvers (chargebacks) will result in an immediate asset seizure (account lock) and permanent ban from the ecosystem.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                 4. Intellectual Property
              </h3>
              <p className="leading-relaxed text-slate-400">
                The NeXa Esports brand, tactics, and unique tactical gear designs are the property of NeXa HQ. No unauthorized redistribution of clan-confidential data is permitted.
              </p>
            </section>
          </div>

          <footer className="pt-20 border-t border-white/10 text-center">
            <div className="p-10 rounded-3xl" style={glassCard}>
              <h4 className="text-white font-black uppercase tracking-tighter text-2xl mb-4">Agreement Notice</h4>
              <p className="text-slate-400 mb-8 max-w-md mx-auto">
                By clicking "Agree" or continuing to use the platform, you verify that you have read and understood these tactical protocols.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <div className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-black uppercase tracking-widest text-slate-300">
                  <ShieldCheck className="w-4 h-4 text-rose-500" /> Authorized
                </div>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
};

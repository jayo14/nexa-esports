import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { AlertCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export const CompleteProfileAlert: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Only show for clan members (not generic buyers) who haven't completed onboarding
  // We use player_uid as the completion marker
  const isClanMember = profile?.role === 'player' || profile?.role === 'moderator' || profile?.role === 'admin' || profile?.role === 'clan_master';
  const hasCompletedOnboarding = !!profile?.player_uid;

  if (!isClanMember || hasCompletedOnboarding) {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-2 xs:mx-3 sm:mx-4 md:mx-6 mb-6"
    >
      <div className="relative overflow-hidden rounded-2xl xs:rounded-[2rem] border border-primary/20 bg-gradient-to-r from-wine-dark/90 to-black/80 p-1">
        {/* Animated background accent */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-primary/10 blur-[80px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 p-4 xs:p-6 sm:p-8 backdrop-blur-xl">
          <div className="flex items-center gap-4 xs:gap-6">
            <div className="hidden xs:flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-primary/20 border border-primary/30 shadow-[0_0_20px_rgba(234,42,51,0.2)] shrink-0">
              <Zap className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
            </div>
            <div className="text-center xs:text-left">
              <div className="flex items-center justify-center xs:justify-start gap-2 mb-1">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Incomplete Intel</span>
              </div>
              <h3 className="text-lg sm:text-2xl font-black text-white font-orbitron uppercase tracking-tight">
                Complete Your <span className="text-primary">Operative Profile</span>
              </h3>
              <p className="mt-2 text-sm text-slate-400 font-rajdhani max-w-md leading-relaxed">
                Your tactical data is missing. Complete onboarding to access elite features, Mark Attendance, and track your combat performance.
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => navigate('/auth/onboarding')}
            className="w-full md:w-auto h-12 xs:h-14 px-8 sm:px-10 rounded-xl xs:rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-xs xs:text-sm shadow-[0_8px_24px_rgba(234,42,51,0.3)] transition-all group shrink-0"
          >
            Start Onboarding
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};


import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Flame,
  Smartphone,
  Tablet,
  ThumbsUp,
  ChevronRight,
  Play,
  ArrowRight,
  Trophy,
  Star,
  Target,
  Wallet,
  CalendarCheck,
  Users
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const canManagePlayers = profile?.role === 'admin' || profile?.role === 'clan_master';

  // Fetch all recent events
  const { data: allEvents = [] } = useQuery({
    queryKey: ["all-recent-events-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true })
        .limit(10);

      if (error) {
        console.error("Error fetching all events:", error);
        return [];
      }
      return data || [];
    },
  });

  // Fetch recent announcements
  const { data: announcements = [] } = useQuery({
    queryKey: ["recent-announcements-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(2);

      if (error) {
        console.error("Error fetching announcements:", error);
        return [];
      }
      return data || [];
    },
  });

  return (
    <>
      {/* Main Content Grid - Responsive */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-12 gap-2 xs:gap-4 md:gap-6 px-2 xs:px-3 sm:px-4 md:px-6">
        {/* Hero Section */}
        <section className="col-span-1 xs:col-span-2 md:col-span-8 relative h-[160px] xs:h-[220px] sm:h-[320px] md:h-[420px] rounded-xl xs:rounded-2xl md:rounded-[3rem] overflow-hidden group mb-3 xs:mb-4 md:mb-0">
          <img
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDTrbZ0jBYUuhYsF0KsULEkZN4O3NpDQtXkwGJVLffgtEiJY8-DRVG6VDIDbsz69zWfthJuYOr_dQll3b1DjgfXCtTv37ulohGI71WkSamNc9c1Er3-yZpehESDP877Jeq5RiwouWgib0IvdWIIsBtTk9Wr0y-btUMhQiu5XyLFHfWtXa8hrEAPh190YvrP0amn4RWmlkt9EXVqeOdzORGpgT1AwZtPIYpiiO0kP4ReOijDrUvwrvM5reRhB-XbLY2QvzjqEtGoBpY"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-wine-dark via-wine-dark/60 to-transparent"></div>
          <div className="relative h-full flex flex-col justify-center p-2 xs:p-4 sm:p-8 md:p-12 max-w-xs xs:max-w-xl gap-2 xs:gap-4 sm:gap-6">
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="bg-white text-wine-dark px-3 sm:px-4 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-2 font-sans">
                <Flame className="w-4 h-4 fill-accent-red text-accent-red" /> Popular
              </span>
              <div className="flex gap-1 sm:gap-2">
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
                  <Smartphone className="w-4 h-4" />
                </span>
                <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
                  <Tablet className="w-4 h-4" />
                </span>
              </div>
            </div>
            <h2 className="text-xl xs:text-2xl sm:text-4xl md:text-6xl font-display font-bold text-white tracking-tight leading-none uppercase">
              Elite <br />Commando
            </h2>
            <p className="text-white/60 text-xs xs:text-sm leading-relaxed max-w-xs xs:max-w-sm font-sans">
              Dominate the frontlines with our specialized mobile tactical division. Join the top 1% of Global Clan Wars.
            </p>
            <div className="flex items-center gap-1 xs:gap-2 sm:gap-4">
              <div className="flex -space-x-2">
                <img alt="User" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-wine-dark" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBk5ULNyVxQ4Q60CUUdP6SbOlFqlYbJCvjHwey3_6U8Vn3GGHZo_NRv1iBeER9qi1jqYOBEzhBG9Euvu61QpIvh1s9d81lwRyfxmeLqwPHF1sWuIK0ThisGDkEDBxC7cqqnAaCvY2UVnNqDl_AAdJbjEtDcvPNl9qQchDlrSq74HYoL5NKwd5rZAnsqyeXyop5atudqwzMXom1vVkzbIZ-bQd2lnEHUFgABQ0RHCrokNxdx_sb8Je6H17QZ5maEHIFO2QpJGzfU1x8" />
                <img alt="User" className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 border-wine-dark" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9kkryAoDqFNMIwBionXxk-7SGBfBWinGRLoHtmla6zf1Pc_bvPR-NXzRFMvRe_3EGBCSt3qo3aTAcEkSFly8VTNrisuJ8063U_GHDU1QNPhOFpS5pQ4NcCiYZZJ6t7rfZAssM5VtqE9cqpkRawECM6w4Nse3ud7cPmdcbFHMlqCQWOWfHVEQyBM-kSODGquAPumBQM8gvsdaEnSc-qYKwXbN2p6nM4rUVB0mpYv8CI6xtp_v4D4Ss8rxMHxbtoD1FZol_V9FgVdw" />
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 flex items-center justify-center border-2 border-wine-dark text-[10px] font-bold text-white">BG</div>
              </div>
              <button className="bg-white/10 backdrop-blur-md border border-white/20 px-3 sm:px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 text-white font-sans">
                <ThumbsUp className="w-4 h-4 fill-accent-red text-accent-red" /> +53 Reviews
              </button>
            </div>
          </div>
        </section>

        {/* Quick Actions - Responsive Stack */}
        <div className="col-span-1 xs:col-span-2 md:col-span-4 flex flex-col gap-1 xs:gap-2 sm:gap-3 md:gap-4 mt-0">
          {/* Quick Actions */}
          <button
            className="bg-black/30 p-3 xs:p-4 sm:p-5 rounded-xl xs:rounded-3xl sm:rounded-[2.5rem] flex items-center justify-between border border-white/5 hover:bg-black/40 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent-red"
            onClick={() => navigate('/wallet')}
          >
            <div className="flex items-center gap-2 xs:gap-3 sm:gap-4">
              <span className="w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-xl xs:rounded-2xl bg-gradient-to-br from-accent-red/40 to-primary/30 flex items-center justify-center">
                <Wallet className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </span>
              <div>
                <h4 className="font-bold text-xs xs:text-sm text-white font-sans">Wallet</h4>
                <p className="text-white/40 text-[10px] xs:text-[11px] sm:text-xs mt-1 font-sans">Manage your funds</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
          </button>
          <button
            className="bg-black/30 p-4 sm:p-5 rounded-3xl sm:rounded-[2.5rem] flex items-center justify-between border border-white/5 hover:bg-black/40 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent-red"
            onClick={() => navigate('/marketplace')}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-xl xs:rounded-2xl bg-gradient-to-br from-indigo-500/40 to-primary/30 flex items-center justify-center">
                <ShoppingCart className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </span>
              <div>
                <h4 className="font-bold text-xs xs:text-sm text-white font-sans">Marketplace</h4>
                <p className="text-white/40 text-[10px] xs:text-[11px] sm:text-xs mt-1 font-sans">Buy and sell assets</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
          </button>
          <button
            className="bg-black/30 p-4 sm:p-5 rounded-3xl sm:rounded-[2.5rem] flex items-center justify-between border border-white/5 hover:bg-black/40 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent-red"
            onClick={() => navigate('/attendance')}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <span className="w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-xl xs:rounded-2xl bg-gradient-to-br from-amber-400/40 to-primary/30 flex items-center justify-center">
                <CalendarCheck className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
              </span>
              <div>
                <h4 className="font-bold text-xs xs:text-sm text-white font-sans">Attendance</h4>
                <p className="text-white/40 text-[10px] xs:text-[11px] sm:text-xs mt-1 font-sans">Mark your presence</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
          </button>

          {canManagePlayers && (
            <button
              className="bg-black/30 p-4 sm:p-5 rounded-3xl sm:rounded-[2.5rem] flex items-center justify-between border border-white/5 hover:bg-black/40 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent-red"
              onClick={() => navigate('/admin/players')}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <span className="w-10 h-10 xs:w-12 xs:h-12 sm:w-14 sm:h-14 rounded-xl xs:rounded-2xl bg-gradient-to-br from-emerald-500/40 to-primary/30 flex items-center justify-center">
                  <Users className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                </span>
                <div>
                  <h4 className="font-bold text-xs xs:text-sm text-white font-sans">Player Management</h4>
                  <p className="text-white/40 text-[10px] xs:text-[11px] sm:text-xs mt-1 font-sans">Admin and clan master only</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
            </button>
          )}
        </div>
      </div>

      {/* New Operations & Clan Victory - Responsive */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-12 gap-2 xs:gap-4 md:gap-8 items-start mb-4 px-2 xs:px-3 sm:px-4 md:px-6">
        {/* New Operations */}
        <div className="col-span-1 xs:col-span-2 md:col-span-8">
          <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between mb-3 xs:mb-4 sm:mb-6 gap-1 xs:gap-0">
            <h3 className="text-xl sm:text-2xl font-bold text-white font-display">New Operations</h3>
            <button className="text-white/40 text-xs sm:text-sm font-medium hover:text-white transition-colors font-sans">See More</button>
          </div>
          <div className="flex gap-2 xs:gap-4 sm:gap-6 overflow-x-auto pb-1 xs:pb-2 sm:pb-4 custom-scrollbar">
            {allEvents.length > 0 ? allEvents.map((event, i) => (
              <div key={event.id} className="min-w-[140px] xs:min-w-[180px] sm:min-w-[300px] h-[140px] xs:h-[180px] sm:h-[360px] glass-card rounded-lg xs:rounded-2xl sm:rounded-[3rem] p-2 xs:p-4 sm:p-6 flex flex-col justify-end relative group cursor-pointer shadow-xl overflow-hidden" onClick={() => navigate(`/events/${event.id}`)}>
                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 flex gap-2 z-10">
                  <span className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
                    <Play className="w-5 h-5 fill-current" />
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-wine-dark/90 to-transparent rounded-2xl sm:rounded-[3rem] z-[1]"></div>
                <div className="relative z-10">
                  <h4 className="text-base xs:text-lg sm:text-2xl font-bold mb-0.5 xs:mb-1 sm:mb-2 text-white font-display">{event.name}</h4>
                  <p className="text-white/60 text-[10px] xs:text-xs font-sans">{event.type} • {new Date(event.date).toLocaleDateString()}</p>
                </div>
              </div>
            )) : (
              <div className="text-white/40 font-sans italic">No new operations available.</div>
            )}
          </div>
        </div>

        {/* Clan Victory */}
        <div className="col-span-1 xs:col-span-2 md:col-span-4 mt-3 xs:mt-4 md:mt-0">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h3 className="text-xl sm:text-2xl font-bold text-white font-display">Clan Victory</h3>
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6 text-white/40" />
          </div>
          <div className="glass-card rounded-lg xs:rounded-2xl sm:rounded-[3rem] p-3 xs:p-6 sm:p-8 flex flex-col items-center gap-3 xs:gap-6 sm:gap-8 border border-white/10 shadow-2xl relative overflow-hidden h-[140px] xs:h-[180px] sm:h-[360px] justify-center">
            <div className="relative w-16 h-16 xs:w-24 xs:h-24 sm:w-44 sm:h-44 flex items-center justify-center">
              <div className="absolute inset-0 blur-3xl bg-accent-red/20 rounded-full"></div>
              <div className="donut-chart w-full h-full rounded-full"></div>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <p className="text-white/40 text-[8px] xs:text-[10px] uppercase font-bold tracking-widest font-sans">Total Wins</p>
                <span className="text-base xs:text-xl sm:text-3xl font-display font-bold text-white">12,340</span>
              </div>
            </div>
            <div className="grid grid-cols-3 w-full gap-0.5 xs:gap-1 sm:gap-2">
              {[
                { label: "2,340", icon: Trophy, color: "text-accent-red", bg: "bg-accent-red/20", border: "border-accent-red/30" },
                { label: "5,420", icon: Star, color: "text-indigo-400", bg: "bg-indigo-500/20", border: "border-indigo-500/30" },
                { label: "4,580", icon: Target, color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" }
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex flex-col items-center gap-0.5 xs:gap-1">
                    <div className={cn("w-5 h-5 xs:w-7 xs:h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border", item.bg, item.border)}>
                      <Icon className={cn("w-3 h-3 xs:w-4 xs:h-4 fill-current", item.color)} />
                    </div>
                    <span className="text-[8px] xs:text-[9px] sm:text-[10px] font-bold text-white font-sans">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

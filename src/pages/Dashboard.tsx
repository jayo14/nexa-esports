
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Search,
  ShoppingCart,
  Bell,
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
  CalendarCheck
} from "lucide-react";

export const Dashboard: React.FC = () => {
  const { profile, user } = useAuth();

  // Helper to get greeting based on current hour
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  // Helper to get display name
  function getDisplayName() {
    if (profile?.username) return profile.username;
    if (user?.email) return user.email.split("@")[0];
    return "Player";
  }
  const navigate = useNavigate();

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
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 px-2 md:px-6 py-4">
        <div>
          <h1 className="text-white/60 text-lg font-sans">{getGreeting()}, <span className="text-white font-bold">{getDisplayName()}</span></h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
            <input
              className="bg-black/20 border-none rounded-2xl py-3 pl-12 pr-6 w-80 text-sm focus:ring-1 focus:ring-accent-red/50 outline-none placeholder:text-white/20 font-sans"
              placeholder="Search operations..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              className="w-11 h-11 bg-black/20 rounded-full flex items-center justify-center hover:bg-black/40 transition-colors text-white/60"
              onClick={() => navigate('/marketplace')}>
              <ShoppingCart className="w-5 h-5" />
            </button>
            <button
              className="w-11 h-11 bg-black/20 rounded-full flex items-center justify-center hover:bg-black/40 transition-colors text-white/60"
              onClick={() => navigate('/notifications')}>
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-4 md:gap-6 px-2 md:px-6">
        <section className="col-span-12 md:col-span-8 relative h-[320px] md:h-[420px] rounded-[2rem] md:rounded-[3rem] overflow-hidden group">
          <img
            alt="Hero"
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuDTrbZ0jBYUuhYsF0KsULEkZN4O3NpDQtXkwGJVLffgtEiJY8-DRVG6VDIDbsz69zWfthJuYOr_dQll3b1DjgfXCtTv37ulohGI71WkSamNc9c1Er3-yZpehESDP877Jeq5RiwouWgib0IvdWIIsBtTk9Wr0y-btUMhQiu5XyLFHfWtXa8hrEAPh190YvrP0amn4RWmlkt9EXVqeOdzORGpgT1AwZtPIYpiiO0kP4ReOijDrUvwrvM5reRhB-XbLY2QvzjqEtGoBpY"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-wine-dark via-wine-dark/60 to-transparent"></div>
          <div className="relative h-full flex flex-col justify-center p-12 max-w-xl gap-6">
            <div className="flex items-center gap-4">
              <span className="bg-white text-wine-dark px-4 py-1.5 rounded-full text-xs font-bold uppercase flex items-center gap-2 font-sans">
                <Flame className="w-4 h-4 fill-accent-red text-accent-red" /> Popular
              </span>
              <div className="flex gap-2">
                <span className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
                  <Smartphone className="w-4 h-4" />
                </span>
                <span className="w-8 h-8 rounded-full bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/20 text-white">
                  <Tablet className="w-4 h-4" />
                </span>
              </div>
            </div>
            <h2 className="text-6xl font-display font-bold text-white tracking-tight leading-none uppercase">
              Elite <br/>Commando
            </h2>
            <p className="text-white/60 text-sm leading-relaxed max-w-sm font-sans">
              Dominate the frontlines with our specialized mobile tactical division. Join the top 1% of Global Clan Wars.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                <img alt="User" className="w-9 h-9 rounded-full border-2 border-wine-dark" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBk5ULNyVxQ4Q60CUUdP6SbOlFqlYbJCvjHwey3_6U8Vn3GGHZo_NRv1iBeER9qi1jqYOBEzhBG9Euvu61QpIvh1s9d81lwRyfxmeLqwPHF1sWuIK0ThisGDkEDBxC7cqqnAaCvY2UVnNqDl_AAdJbjEtDcvPNl9qQchDlrSq74HYoL5NKwd5rZAnsqyeXyop5atudqwzMXom1vVkzbIZ-bQd2lnEHUFgABQ0RHCrokNxdx_sb8Je6H17QZ5maEHIFO2QpJGzfU1x8"/>
                <img alt="User" className="w-9 h-9 rounded-full border-2 border-wine-dark" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9kkryAoDqFNMIwBionXxk-7SGBfBWinGRLoHtmla6zf1Pc_bvPR-NXzRFMvRe_3EGBCSt3qo3aTAcEkSFly8VTNrisuJ8063U_GHDU1QNPhOFpS5pQ4NcCiYZZJ6t7rfZAssM5VtqE9cqpkRawECM6w4Nse3ud7cPmdcbFHMlqCQWOWfHVEQyBM-kSODGquAPumBQM8gvsdaEnSc-qYKwXbN2p6nM4rUVB0mpYv8CI6xtp_v4D4Ss8rxMHxbtoD1FZol_V9FgVdw"/>
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center border-2 border-wine-dark text-[10px] font-bold text-white">BG</div>
              </div>
              <button className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 text-white font-sans">
                <ThumbsUp className="w-4 h-4 fill-accent-red text-accent-red" /> +53 Reviews
              </button>
            </div>
          </div>
        </section>

        <div className="col-span-12 md:col-span-4 flex flex-col gap-3 md:gap-4 mt-4 md:mt-0">
          {/* Quick Actions */}
          <button
            className="bg-black/30 p-5 rounded-[2.5rem] flex items-center justify-between border border-white/5 hover:bg-black/40 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent-red"
            onClick={() => navigate('/wallet')}
          >
            <div className="flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-red/40 to-primary/30 flex items-center justify-center">
                <Wallet className="w-8 h-8 text-white" />
              </span>
              <div>
                <h4 className="font-bold text-sm text-white font-sans">Wallet</h4>
                <p className="text-white/40 text-xs mt-1 font-sans">Manage your funds</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
          </button>
          <button
            className="bg-black/30 p-5 rounded-[2.5rem] flex items-center justify-between border border-white/5 hover:bg-black/40 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent-red"
            onClick={() => navigate('/marketplace')}
          >
            <div className="flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/40 to-primary/30 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-white" />
              </span>
              <div>
                <h4 className="font-bold text-sm text-white font-sans">Marketplace</h4>
                <p className="text-white/40 text-xs mt-1 font-sans">Buy and sell assets</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
          </button>
          <button
            className="bg-black/30 p-5 rounded-[2.5rem] flex items-center justify-between border border-white/5 hover:bg-black/40 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-accent-red"
            onClick={() => navigate('/attendance')}
          >
            <div className="flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/40 to-primary/30 flex items-center justify-center">
                <CalendarCheck className="w-8 h-8 text-white" />
              </span>
              <div>
                <h4 className="font-bold text-sm text-white font-sans">Attendance</h4>
                <p className="text-white/40 text-xs mt-1 font-sans">Mark your presence</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white transition-colors" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6 md:gap-8 items-start mb-4 px-2 md:px-6">
        <div className="col-span-12 md:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white font-display">New Operations</h3>
            <button className="text-white/40 text-sm font-medium hover:text-white transition-colors font-sans">See More</button>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
            {allEvents.length > 0 ? allEvents.map((event, i) => (
              <div key={event.id} className="min-w-[300px] h-[360px] glass-card rounded-[3rem] p-6 flex flex-col justify-end relative group cursor-pointer shadow-xl overflow-hidden" onClick={() => navigate(`/events/${event.id}`)}>
                <div className="absolute top-6 left-6 flex gap-2 z-10">
                  <span className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white">
                    <Play className="w-5 h-5 fill-current" />
                  </span>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-wine-dark/90 to-transparent rounded-[3rem] z-[1]"></div>
                <div className="relative z-10">
                  <h4 className="text-2xl font-bold mb-2 text-white font-display">{event.name}</h4>
                  <p className="text-white/60 text-xs font-sans">{event.type} • {new Date(event.date).toLocaleDateString()}</p>
                </div>
              </div>
            )) : (
              <div className="text-white/40 font-sans italic">No new operations available.</div>
            )}
          </div>
        </div>

        <div className="col-span-4">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white font-display">Clan Victory</h3>
            <ArrowRight className="w-6 h-6 text-white/40" />
          </div>
          <div className="glass-card rounded-[3rem] p-8 flex flex-col items-center gap-8 border border-white/10 shadow-2xl relative overflow-hidden h-[360px] justify-center">
            <div className="relative w-44 h-44 flex items-center justify-center">
              <div className="absolute inset-0 blur-3xl bg-accent-red/20 rounded-full"></div>
              <div className="donut-chart w-full h-full rounded-full"></div>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <p className="text-white/40 text-[10px] uppercase font-bold tracking-widest font-sans">Total Wins</p>
                <span className="text-3xl font-display font-bold text-white">12,340</span>
              </div>
            </div>
            <div className="grid grid-cols-3 w-full gap-2">
              {[
                { label: "2,340", icon: Trophy, color: "text-accent-red", bg: "bg-accent-red/20", border: "border-accent-red/30" },
                { label: "5,420", icon: Star, color: "text-indigo-400", bg: "bg-indigo-500/20", border: "border-indigo-500/30" },
                { label: "4,580", icon: Target, color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30" }
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className={cn("w-8 h-8 rounded-full flex items-center justify-center border", item.bg, item.border)}>
                      <Icon className={cn("w-4 h-4 fill-current", item.color)} />
                    </div>
                    <span className="text-[10px] font-bold text-white font-sans">{item.label}</span>
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

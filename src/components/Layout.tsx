
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { BottomNavigation } from "@/components/BottomNavigation";
import { MobileMenu } from "@/components/MobileMenu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, MessageSquare } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showSidebar = false,
}) => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);

  // Fetch other players for the right sidebar
  const { data: otherPlayers = [] } = useQuery({
    queryKey: ["other-players-sidebar"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, status")
        .neq("id", user?.id)
        .limit(5);

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1a0b0d]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-red mx-auto"></div>
          <p className="mt-2 text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth/login" replace />;
  }

  if (!showSidebar) {
    return <div className="min-h-screen bg-[#1a0b0d]">{children}</div>;
  }

  return (
    <div className="p-4 md:p-6 h-screen bg-[#1a0b0d] text-white/90 antialiased overflow-hidden font-sans">
      <div className="main-gradient w-full h-full rounded-[3.5rem] flex overflow-hidden border border-white/5 relative shadow-2xl">
        {/* Left Sidebar */}
        {!isMobile && <Sidebar />}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar p-8 pr-4 flex flex-col gap-8">
          {children}
        </main>

        {/* Right Sidebar */}
        {!isMobile && (
          <aside className="w-24 flex flex-col items-center py-8 gap-4 shrink-0 pr-6 pl-2 overflow-y-auto custom-scrollbar">
            <div
              className="w-14 h-14 rounded-full border-2 border-white/20 p-0.5 mb-2 cursor-pointer"
              onClick={() => navigate('/profile')}
            >
              <img
                alt="Me"
                className="w-full h-full rounded-full object-cover"
                src={profile?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuBk5ULNyVxQ4Q60CUUdP6SbOlFqlYbJCvjHwey3_6U8Vn3GGHZo_NRv1iBeER9qi1jqYOBEzhBG9Euvu61QpIvh1s9d81lwRyfxmeLqwPHF1sWuIK0ThisGDkEDBxC7cqqnAaCvY2UVnNqDl_AAdJbjEtDcvPNl9qQchDlrSq74HYoL5NKwd5rZAnsqyeXyop5atudqwzMXom1vVkzbIZ-bQd2lnEHUFgABQ0RHCrokNxdx_sb8Je6H17QZ5maEHIFO2QpJGzfU1x8"}
              />
            </div>

            <div className="floating-glass w-full rounded-[2rem] py-4 flex flex-col items-center gap-5">
              <div className="text-white/30">
                <Users className="w-5 h-5" />
              </div>

              {otherPlayers.map((player) => (
                <div
                  key={player.id}
                  className="relative group cursor-pointer"
                  onClick={() => navigate(`/profile/${player.id}`)}
                >
                  <div className="w-12 h-12 rounded-full border-2 border-white/10 overflow-hidden bg-white/10 flex items-center justify-center">
                    {player.avatar_url ? (
                      <img
                        alt={player.username}
                        className="w-full h-full object-cover"
                        src={player.avatar_url}
                      />
                    ) : (
                      <span className="text-white font-bold text-lg">
                        {player.username?.split(" ").map((n) => n[0]).join("").slice(0,2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  {player.status === 'in-game' && (
                    <div className="absolute -top-1 -right-4 bg-accent-red text-[7px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-tighter whitespace-nowrap shadow-lg">
                      In Game
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-sidebar-dark ${player.status === 'offline' ? 'bg-slate-500' : 'bg-green-500'}`}></div>
                </div>
              ))}
            </div>

            <div className="floating-glass w-full rounded-[2rem] py-4 flex flex-col items-center gap-5 mt-auto">
              <div className="text-white/30">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="relative cursor-pointer">
                <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center overflow-hidden">
                  <div className="flex -space-x-4">
                    <img className="w-7 h-7 rounded-full border border-black/40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBk5ULNyVxQ4Q60CUUdP6SbOlFqlYbJCvjHwey3_6U8Vn3GGHZo_NRv1iBeER9qi1jqYOBEzhBG9Euvu61QpIvh1s9d81lwRyfxmeLqwPHF1sWuIK0ThisGDkEDBxC7cqqnAaCvY2UVnNqDl_AAdJbjEtDcvPNl9qQchDlrSq74HYoL5NKwd5rZAnsqyeXyop5atudqwzMXom1vVkzbIZ-bQd2lnEHUFgABQ0RHCrokNxdx_sb8Je6H17QZ5maEHIFO2QpJGzfU1x8"/>
                    <img className="w-7 h-7 rounded-full border border-black/40" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB9kkryAoDqFNMIwBionXxk-7SGBfBWinGRLoHtmla6zf1Pc_bvPR-NXzRFMvRe_3EGBCSt3qo3aTAcEkSFly8VTNrisuJ8063U_GHDU1QNPhOFpS5pQ4NcCiYZZJ6t7rfZAssM5VtqE9cqpkRawECM6w4Nse3ud7cPmdcbFHMlqCQWOWfHVEQyBM-kSODGquAPumBQM8gvsdaEnSc-qYKwXbN2p6nM4rUVB0mpYv8CI6xtp_v4D4Ss8rxMHxbtoD1FZol_V9FgVdw"/>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile Navigation */}
      {isMobile && <BottomNavigation />}
    </div>
  );
};

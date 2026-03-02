
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { MobileMenu } from "@/components/MobileMenu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, LogOut, Menu } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showSidebar = false,
}) => {
  const { user, profile, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(true);
  const mainContentRef = useRef<HTMLElement | null>(null);
  const lastScrollTopRef = useRef(0);

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

  useEffect(() => {
    if (!isMobile) {
      setIsMobileMenuOpen(false);
      setShowMobileControls(true);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !mainContentRef.current) return;

    const container = mainContentRef.current;
    lastScrollTopRef.current = container.scrollTop;

    const onScroll = () => {
      const currentScrollTop = container.scrollTop;
      const delta = currentScrollTop - lastScrollTopRef.current;

      if (currentScrollTop <= 10) {
        setShowMobileControls(true);
      } else if (delta > 4) {
        setShowMobileControls(false);
      } else if (delta < -4) {
        setShowMobileControls(true);
      }

      lastScrollTopRef.current = currentScrollTop;
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [isMobile]);

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
      {isMobile && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`md:hidden fixed top-6 left-6 z-50 w-11 h-11 rounded-xl bg-black/30 border border-white/10 text-white/80 flex items-center justify-center hover:bg-black/40 transition-all duration-300 ${showMobileControls ? "translate-y-0 opacity-100" : "-translate-y-16 opacity-0 pointer-events-none"}`}
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <div className="main-gradient w-full h-full rounded-[3.5rem] flex overflow-hidden border border-white/5 relative shadow-2xl">
        {/* Left Sidebar */}
        {!isMobile && <Sidebar />}

        {/* Main Content */}
        <main ref={mainContentRef} className="flex-1 overflow-y-auto custom-scrollbar p-8 pr-4 flex flex-col gap-8">
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
             
              
              <button
                onClick={logout}
                className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Mobile Navigation */}
      {isMobile && <BottomNavigation hidden={!showMobileControls} />}

      {/* Mobile Left Sidebar Drawer */}
      {isMobile && (
        <MobileMenu open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen} />
      )}
    </div>
  );
};

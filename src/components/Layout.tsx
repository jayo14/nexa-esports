
import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { BottomNavigation } from "@/components/BottomNavigation";
import { MobileMenu } from "@/components/MobileMenu";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, LogOut, Menu, MessageSquare, Settings, Search, ShoppingBag, Bell } from "lucide-react";

const C = {
  primary: "#ec131e",
  bgDark: "#1a0b0d",
  burgundy: "#411d21",
};

interface LayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  pageScroll?: boolean;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  showSidebar = false,
  pageScroll = false,
}) => {
  const { user, profile, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showMobileControls, setShowMobileControls] = useState(true);
  const [showMobileDock, setShowMobileDock] = useState(true);
  const [forceHideMobileDock, setForceHideMobileDock] = useState(false);
  const [lockMobileContentScroll, setLockMobileContentScroll] = useState(false);
  const mainContentRef = useRef<HTMLElement | null>(null);
  const lastScrollTopRef = useRef(0);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getDisplayName = () => {
    if (profile?.username) return profile.username;
    if (user?.email) return user.email.split("@")[0];
    return "Player";
  };

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
      setShowMobileDock(true);
      setForceHideMobileDock(false);
      setLockMobileContentScroll(false);
    }
  }, [isMobile]);

  useEffect(() => {
    const handleDockVisibility = (event: Event) => {
      const customEvent = event as CustomEvent<{ hidden?: boolean; lockScroll?: boolean }>;
      setForceHideMobileDock(!!customEvent.detail?.hidden);
      setLockMobileContentScroll(!!customEvent.detail?.lockScroll);
    };

    window.addEventListener("nexa:mobile-dock-visibility", handleDockVisibility as EventListener);

    return () => {
      window.removeEventListener("nexa:mobile-dock-visibility", handleDockVisibility as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const getScrollTop = () => {
      if (pageScroll) return window.scrollY;
      return mainContentRef.current?.scrollTop ?? 0;
    };

    const onScroll = () => {
      const currentScrollTop = getScrollTop();
      const delta = currentScrollTop - lastScrollTopRef.current;

      if (currentScrollTop <= 10) {
        setShowMobileControls(true);
        setShowMobileDock(true);
      } else if (delta > 4) {
        setShowMobileControls(false);
        setShowMobileDock(true);
      } else if (delta < -4) {
        setShowMobileControls(true);
        setShowMobileDock(false);
      }

      lastScrollTopRef.current = currentScrollTop;
    };

    if (pageScroll) {
      lastScrollTopRef.current = window.scrollY;
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }

    const container = mainContentRef.current;
    if (!container) return;

    lastScrollTopRef.current = container.scrollTop;
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [isMobile, pageScroll]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${C.burgundy} 0%, ${C.bgDark} 100%)` }}
      >
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
    return (
      <div
        className="min-h-screen"
        style={{ background: `linear-gradient(135deg, ${C.burgundy} 0%, ${C.bgDark} 100%)` }}
      >
        {children}
      </div>
    );
  }

  return (
    <div
      className={`text-white/90 antialiased font-sans ${pageScroll ? 'min-h-screen overflow-x-hidden' : 'p-4 md:p-6 h-screen overflow-hidden'}`}
      style={{ background: `linear-gradient(135deg, ${C.burgundy} 0%, ${C.bgDark} 100%)` }}
    >
      {isMobile && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={`md:hidden fixed top-6 left-6 z-50 w-11 h-11 rounded-2xl text-white/80 flex items-center justify-center transition-all duration-300 ${showMobileControls ? "translate-y-0 opacity-100" : "-translate-y-16 opacity-0 pointer-events-none"}`}
          style={{
            background: `${C.bgDark}80`,
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
          }}
          aria-label="Open sidebar menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      )}

      <div
        className={pageScroll
          ? 'w-full min-h-screen relative'
          : 'w-full h-full rounded-[32px] flex border relative shadow-2xl overflow-hidden'}
        style={pageScroll
          ? undefined
          : {
              background: `linear-gradient(135deg, ${C.burgundy} 0%, ${C.bgDark} 100%)`,
              borderColor: "rgba(255,255,255,0.05)",
            }}
      >
        {/* Left Sidebar */}
        {!isMobile && !pageScroll && <Sidebar />}
        {!isMobile && pageScroll && (
          <div className="fixed top-4 bottom-4 left-4 lg:top-6 lg:bottom-6 lg:left-6 z-30">
            <div className="h-full overflow-y-auto hide-scrollbar">
              <Sidebar />
            </div>
          </div>
        )}

        {/* Main Content */}
        <main
          ref={mainContentRef}
          className={pageScroll
            ? `h-[calc(100vh-2rem)] lg:h-[calc(100vh-3rem)] ${isMobile && lockMobileContentScroll ? 'overflow-hidden touch-none' : 'overflow-y-auto custom-scrollbar'} flex flex-col gap-6 min-w-0 px-4 lg:px-6 md:ml-[7rem] lg:ml-[8rem] md:mr-[5rem] lg:mr-[6rem]`
            : `flex-1 p-4 md:p-6 flex flex-col gap-6 ${isMobile && lockMobileContentScroll ? 'overflow-hidden touch-none' : 'overflow-y-auto custom-scrollbar'}`}
        >
          {pageScroll && (
            <header
              className="sticky top-0 z-20 flex flex-row items-center xs:flex-col xs:items-start justify-between gap-3 xs:gap-4 sm:gap-0 px-2 xs:px-3 sm:px-4 md:px-6 py-3 xs:py-4 w-full rounded-2xl"
              style={{
                background: `${C.burgundy}80`,
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="w-full sm:w-auto">
                <h1 className="text-slate-300 text-base sm:text-lg font-sans">
                  {getGreeting()}, <span className="text-white font-bold">{getDisplayName()}</span>
                </h1>
              </div>
              <div className="flex items-center gap-3 sm:gap-6 w-full sm:w-auto mt-2 sm:mt-0">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    className="rounded-full py-2.5 pl-12 pr-4 sm:pr-6 w-full sm:w-80 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none font-sans"
                    style={{ background: `${C.bgDark}80`, border: 'none' }}
                    placeholder="Search operations..."
                    type="text"
                  />
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-white transition-all"
                    style={{ background: `${C.bgDark}80` }}
                    onClick={() => navigate('/marketplace')}
                  >
                    <ShoppingBag className="w-5 h-5" />
                  </button>
                  <button
                    className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 hover:text-white relative"
                    style={{ background: `${C.bgDark}80` }}
                    onClick={() => navigate('/announcements')}
                  >
                    <Bell className="w-5 h-5" />
                    <span
                      className="absolute top-2 right-2.5 w-2 h-2 rounded-full"
                      style={{ background: C.primary, border: `2px solid ${C.bgDark}` }}
                    />
                  </button>
                </div>
              </div>
            </header>
          )}
          {children}
        </main>

        {/* Right Sidebar */}
        {!isMobile && (
          <aside
            className={`w-16 flex flex-col items-center py-6 gap-6 rounded-[32px] shrink-0 overflow-y-auto hide-scrollbar ${pageScroll ? 'fixed top-4 bottom-4 right-4 lg:top-6 lg:bottom-6 lg:right-6 z-30' : 'mr-4 my-4'}`}
            style={{
              background: `${C.bgDark}66`,
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.05)",
            }}
          >
            <div
              className="w-10 h-10 rounded-full overflow-hidden mb-4 flex-shrink-0 cursor-pointer"
              style={{ border: `2px solid ${C.primary}66` }}
              onClick={() => navigate('/profile')}
            >
              <img
                alt="Me"
                className="w-full h-full rounded-full object-cover"
                src={profile?.avatar_url || "https://lh3.googleusercontent.com/aida-public/AB6AXuBk5ULNyVxQ4Q60CUUdP6SbOlFqlYbJCvjHwey3_6U8Vn3GGHZo_NRv1iBeER9qi1jqYOBEzhBG9Euvu61QpIvh1s9d81lwRyfxmeLqwPHF1sWuIK0ThisGDkEDBxC7cqqnAaCvY2UVnNqDl_AAdJbjEtDcvPNl9qQchDlrSq74HYoL5NKwd5rZAnsqyeXyop5atudqwzMXom1vVkzbIZ-bQd2lnEHUFgABQ0RHCrokNxdx_sb8Je6H17QZ5maEHIFO2QpJGzfU1x8"}
              />
            </div>

            <div className="flex flex-col gap-4">
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400"
                style={{ background: 'rgba(255,255,255,0.05)' }}
                aria-label="Players"
              >
                <Users className="w-5 h-5" />
              </button>

              {otherPlayers.map((player) => (
                <div
                  key={player.id}
                  className="relative group cursor-pointer"
                  onClick={() => navigate(`/profile/${player.id}`)}
                >
                  <div
                    className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm text-slate-300"
                    style={{ background: 'rgba(255,255,255,0.08)', border: `2px solid ${C.bgDark}` }}
                  >
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
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 ${player.status === 'offline' ? 'bg-slate-500' : 'bg-green-500'}`}
                    style={{ borderColor: C.bgDark }}
                  />
                </div>
              ))}
            </div>

            {pageScroll ? (
              <div className="mt-auto flex flex-col gap-4">
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  onClick={() => navigate('/chat')}
                  aria-label="Open chat"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  onClick={() => navigate('/settings')}
                  aria-label="Open settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={logout}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="mt-auto flex flex-col gap-4">
                <button
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  onClick={() => navigate('/settings')}
                  aria-label="Open settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
                <button
                  onClick={logout}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)' }}
                  aria-label="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Mobile Navigation */}
      {isMobile && <BottomNavigation hidden={forceHideMobileDock || !showMobileDock} />}

      {/* Mobile Left Sidebar Drawer */}
      {isMobile && (
        <MobileMenu open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen} />
      )}
    </div>
  );
};

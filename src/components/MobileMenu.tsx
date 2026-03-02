import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  User,
  Crosshair,
  Package,
  Settings,
  Shield,
  Users,
  Calendar,
  Clock,
  Megaphone,
  Bell,
  AlertCircle,
  Sword,
  Activity,
  SlidersHorizontal,
  Wallet,
  DollarSign,
  Trophy,
  ShoppingBag,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const C = {
  primary: '#ec131e',
  bgDark: '#1a0b0d',
  burgundy: '#411d21',
};

interface MobileMenuProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ open, onOpenChange: setOpen }) => {
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'clan_master';
  const isPlayer = profile?.role === 'player';
  const isModerator = profile?.role === 'moderator';

  // --- Menu Definitions (Mirrored from Sidebar.tsx) ---

  const playerMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', primary: true },
    { icon: Trophy, label: 'Leaderboard', path: '/statistics', primary: true },
    { icon: Wallet, label: 'Wallet', path: '/wallet', primary: true },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace', primary: true },
    { icon: User, label: 'Profile', path: '/profile', primary: false },
    { icon: Crosshair, label: 'Scrims', path: '/scrims', primary: false },
    { icon: Package, label: 'Loadouts', path: '/loadouts', primary: false },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts', primary: false },
    { icon: Megaphone, label: 'Announcements', path: '/announcements', primary: false },
    { icon: Settings, label: 'Settings', path: '/settings', primary: false },
  ];

  const moderatorMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', primary: true },
    { icon: Trophy, label: 'Leaderboard', path: '/statistics', primary: true },
    { icon: Wallet, label: 'Wallet', path: '/wallet', primary: true },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace', primary: true },
    { icon: User, label: 'Profile', path: '/profile', primary: false },
    { icon: Crosshair, label: 'Scrims', path: '/scrims', primary: false },
    { icon: Package, label: 'Loadouts', path: '/loadouts', primary: false },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts', primary: false },
    { icon: Clock, label: 'Attendance', path: '/admin/attendance', primary: false },
    { icon: Megaphone, label: 'Announcements', path: '/announcements', primary: false },
    { icon: Settings, label: 'Settings', path: '/settings', primary: false },
  ];

  const adminMenuItems = [
    { icon: Shield, label: 'Admin Dashboard', path: '/admin', primary: true },
    { icon: Trophy, label: 'Leaderboard', path: '/statistics', primary: true },
    { icon: Wallet, label: 'Wallet', path: '/wallet', primary: true },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace', primary: true },
    { icon: Users, label: 'Players', path: '/admin/players', primary: false },
    { icon: Crosshair, label: 'Scrims', path: '/admin/scrims', primary: false },
    { icon: Package, label: 'Loadouts', path: '/loadouts', primary: false },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts', primary: false },
    { icon: Calendar, label: 'Events', path: '/admin/events', primary: false },
    { icon: Trophy, label: 'Seasons', path: '/admin/seasons', primary: false },
    { icon: Clock, label: 'Attendance', path: '/admin/attendance', primary: false },
    { icon: Megaphone, label: 'Announcements', path: '/admin/announcements', primary: false },
    { icon: Bell, label: 'Notifications', path: '/admin/notifications', primary: false },
    { icon: AlertCircle, label: 'Issues', path: '/admin/feedback', primary: false },
    ...(profile?.role === 'clan_master' ? [{ icon: DollarSign, label: 'Earnings', path: '/admin/earnings', primary: false }] : []),
    ...(profile?.role === 'clan_master' ? [{ icon: Activity, label: 'Activities', path: '/admin/activities', primary: false }] : []),
    ...(profile?.role === 'clan_master' ? [{ icon: SlidersHorizontal, label: 'Configuration', path: '/admin/config', primary: false }] : []),
    { icon: Settings, label: 'Settings', path: '/settings', primary: false },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth/login');
      setOpen(false);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const isActivePath = (path: string) => {
    if (path === '/dashboard' || path === '/admin') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const renderMenuItems = (items: typeof playerMenuItems) => {
    return (
      <div className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(item.path);
          
          return (
            <button
              key={item.path}
              onClick={() => handleNavigation(item.path)}
              className={cn(
                'w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all duration-200 border',
                isActive
                  ? 'text-white'
                  : 'text-slate-300 hover:text-white border-white/0 hover:border-white/10'
              )}
              style={
                isActive
                  ? {
                      background: `${C.primary}26`,
                      borderColor: `${C.primary}66`,
                      boxShadow: `0 0 18px ${C.primary}2E`,
                    }
                  : {
                      background: 'rgba(255,255,255,0.03)',
                    }
              }
            >
              <Icon
                className="w-5 h-5"
                style={{ color: isActive ? C.primary : '#94a3b8' }}
              />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent
        side="left"
        className="w-[85vw] max-w-[340px] border-r overflow-y-auto hide-scrollbar"
        style={{
          background: `linear-gradient(160deg, ${C.burgundy}F2 0%, ${C.bgDark}F2 100%)`,
          borderColor: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <SheetHeader className="border-b border-white/10 pb-4 pt-10 md:pt-4">
          <SheetTitle className="text-white">
            <div className="flex items-center gap-3 rounded-2xl p-2" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="relative shrink-0">
                <img
                  src={profile?.avatar_url || '/placeholder.svg'}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover"
                  style={{ border: `2px solid ${C.primary}66` }}
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2" style={{ borderColor: C.bgDark }}></div>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">
                  {profile?.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}
                  {profile?.ign}
                </div>
                <div className="text-xs text-slate-400 capitalize">{profile?.role}</div>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Render Menu Items Based on Role */}
          {isPlayer && (
            <div className="space-y-4">
               <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                  Primary
                </h3>
                {renderMenuItems(playerMenuItems.filter(i => i.primary))}
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                  Secondary
                </h3>
                {renderMenuItems(playerMenuItems.filter(i => !i.primary))}
              </div>
            </div>
          )}

          {isModerator && (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                  Primary
                </h3>
                {renderMenuItems(moderatorMenuItems.filter(i => i.primary))}
              </div>
              <div className="space-y-2">
                 <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                  Secondary
                </h3>
                {renderMenuItems(moderatorMenuItems.filter(i => !i.primary))}
              </div>
            </div>
          )}

          {isAdmin && (
             <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                  Primary
                </h3>
                {renderMenuItems(adminMenuItems.filter(i => i.primary))}
              </div>
              <div className="space-y-2">
                 <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 mb-1">
                  Secondary
                </h3>
                {renderMenuItems(adminMenuItems.filter(i => !i.primary))}
              </div>
            </div>
          )}

          {/* Logout Button */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-red-300 border border-red-500/25 hover:text-red-200 transition-all duration-200"
              style={{ background: 'rgba(236, 19, 30, 0.08)' }}
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};


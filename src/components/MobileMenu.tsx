import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Menu,
  Wallet,
  Sword,
  Megaphone,
  BarChart3,
  Settings,
  Shield,
  Users,
  Calendar,
  Clock,
  Bell,
  AlertCircle,
  Activity,
  SlidersHorizontal,
  DollarSign,
  LogOut,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const MobileMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { profile, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = profile?.role === 'admin' || profile?.role === 'clan_master';

  // Secondary pages for hamburger menu
  const playerSecondaryPages = [
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts' },
    { icon: Megaphone, label: 'Announcements', path: '/announcements' },
    { icon: BarChart3, label: 'Statistics', path: '/statistics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const adminPages = [
    { icon: Shield, label: 'Admin Dashboard', path: '/admin' },
    { icon: Users, label: 'Players', path: '/admin/players' },
    { icon: Calendar, label: 'Events', path: '/admin/events' },
    { icon: Clock, label: 'Attendance', path: '/admin/attendance' },
    { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
    { icon: AlertCircle, label: 'Issues', path: '/admin/feedback' },
  ];

  const clanMasterPages = [
    { icon: DollarSign, label: 'Earnings', path: '/admin/earnings' },
    { icon: Activity, label: 'Activities', path: '/admin/activities' },
    { icon: SlidersHorizontal, label: 'Configuration', path: '/admin/config' },
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
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden fixed top-4 right-4 z-50 bg-background/80 backdrop-blur-sm border border-[#FF1F44]/30 hover:bg-[#FF1F44]/20"
        >
          <Menu className="w-5 h-5 text-white" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-80 bg-gradient-to-br from-background/98 to-background/95 backdrop-blur-xl border-l-2 border-[#FF1F44]/30 overflow-y-auto"
      >
        <SheetHeader className="border-b border-white/10 pb-4">
          <SheetTitle className="text-white font-orbitron">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={profile?.avatar_url || '/placeholder.svg'}
                  alt="Avatar"
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#FF1F44]/30"
                />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-background"></div>
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-white">
                  {profile?.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}
                  {profile?.ign}
                </div>
                <div className="text-xs text-gray-400 capitalize">{profile?.role}</div>
              </div>
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Player Secondary Pages */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">
              Menu
            </h3>
            {playerSecondaryPages.map((item) => {
              const Icon = item.icon;
              const isActive = isActivePath(item.path);
              
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                    isActive
                      ? 'bg-gradient-to-r from-[#FF1F44]/30 to-red-600/20 border border-[#FF1F44]/50 text-white'
                      : 'hover:bg-white/5 text-gray-300 hover:text-white'
                  )}
                >
                  <Icon className={cn('w-5 h-5', isActive ? 'text-[#FF1F44]' : 'text-gray-400')} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Admin Pages */}
          {isAdmin && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">
                Administration
              </h3>
              {adminPages.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.path);
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-[#FF1F44]/30 to-red-600/20 border border-[#FF1F44]/50 text-white'
                        : 'hover:bg-white/5 text-gray-300 hover:text-white'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', isActive ? 'text-[#FF1F44]' : 'text-gray-400')} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Clan Master Only Pages */}
          {profile?.role === 'clan_master' && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-3">
                Clan Master
              </h3>
              {clanMasterPages.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.path);
                
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-[#FF1F44]/30 to-red-600/20 border border-[#FF1F44]/50 text-white'
                        : 'hover:bg-white/5 text-gray-300 hover:text-white'
                    )}
                  >
                    <Icon className={cn('w-5 h-5', isActive ? 'text-[#FF1F44]' : 'text-gray-400')} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Logout Button */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all duration-200"
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

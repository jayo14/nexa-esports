import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  User,
  MessageSquare,
  Crosshair,
  Package,
  Codesandbox,
  Settings,
  Shield,
  Users,
  BarChart3,
  UserCog,
  Calendar,
  UserPlus,
  Clock,
  Megaphone,
  Bell,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sword,
  Swords,
  Activity,
  SlidersHorizontal,
  Wallet,
  Gift,
  DollarSign,
  Trophy,
  ShoppingBag,
  Smartphone,
} from 'lucide-react';
import { NavItem } from '@/components/NavItem';

interface MenuItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
}

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobile: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  setIsCollapsed, 
  isMobile 
}) => {

  const { profile, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMediumScreen, setIsMediumScreen] = useState(false);

  // Handle responsive sidebar behavior
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const isMediumSize = width >= 768 && width < 1024; // md to lg breakpoint
      
      setIsMediumScreen(isMediumSize);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'clan_master';
  const isPlayer = profile?.role === 'player';
  const isModerator = profile?.role === 'moderator';

  const playerMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Crosshair, label: 'Scrims', path: '/scrims' },
    { icon: Package, label: 'Loadouts', path: '/loadouts' },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts' },
    { icon: BarChart3, label: 'Statistics', path: '/statistics' },
    { icon: Megaphone, label: 'Announcements', path: '/announcements' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const moderatorMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Crosshair, label: 'Scrims', path: '/scrims' },
    { icon: Package, label: 'Loadouts', path: '/loadouts' },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts' },
    { icon: Clock, label: 'Attendance', path: '/admin/attendance' },
    { icon: BarChart3, label: 'Statistics', path: '/statistics' },
    { icon: Megaphone, label: 'Announcements', path: '/announcements' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const adminMenuItems = [
    { icon: Shield, label: 'Admin Dashboard', path: '/admin' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace' },
    { icon: Users, label: 'Players', path: '/admin/players' },
    { icon: Crosshair, label: 'Scrims', path: '/admin/scrims' },
    { icon: Package, label: 'Loadouts', path: '/loadouts' },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts' },
    { icon: Calendar, label: 'Events', path: '/admin/events' },
    { icon: Trophy, label: 'Seasons', path: '/admin/seasons' },
    { icon: Clock, label: 'Attendance', path: '/admin/attendance' },
    { icon: Megaphone, label: 'Announcements', path: '/admin/announcements' },
    { icon: Bell, label: 'Notifications', path: '/admin/notifications' },
    { icon: AlertCircle, label: 'Issues', path: '/admin/feedback' },
  ...(profile?.role === 'clan_master' ? [{ icon: DollarSign, label: 'Earnings', path: '/admin/earnings' }] : []),
  ...(profile?.role === 'clan_master' ? [{ icon: Activity, label: 'Activities', path: '/admin/activities' }] : []),
  ...(profile?.role === 'clan_master' ? [{ icon: SlidersHorizontal, label: 'Configuration', path: '/admin/config' }] : []),
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth/login');
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (!profile) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {/* Overlay for mobile when sidebar is open */}
      {!isCollapsed && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}
      
      <div className={`
        fixed left-0 top-0 h-full bg-gradient-to-br from-card/98 to-card/95 backdrop-blur-xl border-r-2 border-border/50 z-50
        transition-all duration-300 overflow-y-auto flex flex-col shadow-2xl
        ${isMobile 
          ? (isCollapsed ? '-translate-x-full' : 'w-64 translate-x-0')
          : isMediumScreen 
            ? 'w-16' // Semi-collapsed on medium screens
            : (isCollapsed ? 'w-16' : 'w-64') // Full control on desktop
        }
      `}>

      {/* Header */}
      <div className="p-4 border-b border-border/30 bg-gradient-to-r from-primary/10 to-primary/5">
        <div className="flex items-center justify-between">
          {!isCollapsed && !isMediumScreen && (
            <div className="flex items-center space-x-3">
              <div className="relative">
                <img
                  src={profile?.avatar_url || '/placeholder.svg'}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full object-cover border-2 border-primary/30 shadow-lg"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-card"></div>
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">
                  {profile?.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}
                  {profile?.ign}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{profile?.role}</p>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all"
          >
            {(isCollapsed || isMediumScreen) ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-6">
        <div className="space-y-2">
          {/* Player Menu - Only show for players */}
          {isPlayer && (
            <>
              {playerMenuItems.map((item) => (
                <NavItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  isActive={location.pathname === item.path}
                  isCollapsed={isCollapsed || isMediumScreen}
                  onClick={() => navigate(item.path)}
                />
              ))}
            </>
          )}

          {/* Moderator Menu - Only show for moderators */}
          {isModerator && (
            <>
              {moderatorMenuItems.map((item) => (
                <NavItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  isActive={location.pathname === item.path}
                  isCollapsed={isCollapsed || isMediumScreen}
                  onClick={() => navigate(item.path)}
                />
              ))}
            </>
          )}

          {/* Admin Menu - Only show for admins */}
          {isAdmin && (
            <>
              {adminMenuItems.map((item) => (
                <NavItem
                  key={item.path}
                  icon={item.icon}
                  label={item.label}
                  path={item.path}
                  isActive={location.pathname.startsWith(item.path)}
                  isCollapsed={isCollapsed || isMediumScreen}
                  onClick={() => navigate(item.path)}
                />
              ))}
            </>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/30 bg-gradient-to-r from-red-500/5 to-red-600/5">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={`w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all ${
            (isCollapsed || isMediumScreen) ? 'px-0 justify-center' : ''
          }`}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && !isMediumScreen && <span className="ml-2 font-medium">Logout</span>}
        </Button>
      </div>
      </div>
    </>
  );
};
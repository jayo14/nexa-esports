import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sword,
  Swords,
  Activity,
  SlidersHorizontal,
  Wallet,
  DollarSign,
  Trophy,
  ShoppingBag,
} from 'lucide-react';
import { NavItem } from '@/components/NavItem';
import { useNotifications } from '@/hooks/useNotifications';
import { useActivities } from '@/hooks/useActivities';

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  primary?: boolean;
  subItems?: { label: string; path: string; }[];
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
  const { unreadCount } = useNotifications();
  const { data: activitiesCount = 0 } = useActivities();
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

  const marketplaceSubItems = [
    { label: 'Browse Accounts', path: '/marketplace' },
    { label: 'Buyer Dashboard', path: '/marketplace/orders' },
    ...(isAdmin ? [{ label: 'Marketplace Admin', path: '/admin/marketplace' }] : []),
  ];

  const getBadgeProps = (path: string) => {
    if (path === '/admin/notifications') return { badgeCount: unreadCount, badgeColor: 'bg-destructive' };
    if (path === '/admin/activities') return { badgeCount: activitiesCount, badgeColor: 'bg-orange-500' };
    return {};
  };

  const playerMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', primary: true },
    { icon: Trophy, label: 'Leaderboard', path: '/statistics', primary: true },
    { icon: Wallet, label: 'Wallet', path: '/wallet', primary: true },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace', primary: true, subItems: marketplaceSubItems },
    { icon: User, label: 'Profile', path: '/profile', primary: false },
    { icon: Crosshair, label: 'Scrims', path: '/scrims', primary: false },
    { icon: Package, label: 'Loadouts', path: '/loadouts', primary: false },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts', primary: false },
    { icon: Megaphone, label: 'Announcements', path: '/announcements', primary: false },
    { icon: Settings, label: 'Settings', path: '/settings', primary: false },
  ];

  const moderatorMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', primary: true },
    { icon: Trophy, label: 'Leaderboard', path: '/statistics', primary: true },
    { icon: Wallet, label: 'Wallet', path: '/wallet', primary: true },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace', primary: true, subItems: marketplaceSubItems },
    { icon: User, label: 'Profile', path: '/profile', primary: false },
    { icon: Crosshair, label: 'Scrims', path: '/scrims', primary: false },
    { icon: Package, label: 'Loadouts', path: '/loadouts', primary: false },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts', primary: false },
    { icon: Clock, label: 'Attendance', path: '/admin/attendance', primary: false },
    { icon: Megaphone, label: 'Announcements', path: '/announcements', primary: false },
    { icon: Settings, label: 'Settings', path: '/settings', primary: false },
  ];

  const adminMenuItems: MenuItem[] = [
    { icon: Shield, label: 'Admin Dashboard', path: '/admin', primary: true },
    { icon: Trophy, label: 'Leaderboard', path: '/statistics', primary: true },
    { icon: Wallet, label: 'Wallet', path: '/wallet', primary: true },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace', primary: true, subItems: marketplaceSubItems },
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

  const renderNavItems = (items: MenuItem[]) => {
    return items.map((item) => (
      <NavItem
        key={item.path}
        icon={item.icon}
        label={item.label}
        path={item.path}
        isActive={location.pathname === item.path || (item.subItems?.some(si => location.pathname === si.path) ?? false)}
        isCollapsed={isCollapsed || isMediumScreen}
        onClick={() => navigate(item.path)}
        subItems={item.subItems}
        {...getBadgeProps(item.path)}
      />
    ));
  };

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
        {/* Player Menu - Only show for players */}
        {isPlayer && (
          <>
            <div className="space-y-2">
              {!isCollapsed && !isMediumScreen && (
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  Primary
                </div>
              )}
              {renderNavItems(playerMenuItems.filter(item => item.primary))}
            </div>

            <div className="space-y-2 pt-4 border-t border-border/30">
              {!isCollapsed && !isMediumScreen && (
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  Secondary
                </div>
              )}
              {renderNavItems(playerMenuItems.filter(item => !item.primary))}
            </div>
          </>
        )}

        {/* Moderator Menu - Only show for moderators */}
        {isModerator && (
          <>
            <div className="space-y-2">
              {!isCollapsed && !isMediumScreen && (
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  Primary
                </div>
              )}
              {renderNavItems(moderatorMenuItems.filter(item => item.primary))}
            </div>

            <div className="space-y-2 pt-4 border-t border-border/30">
              {!isCollapsed && !isMediumScreen && (
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  Secondary
                </div>
              )}
              {renderNavItems(moderatorMenuItems.filter(item => !item.primary))}
            </div>
          </>
        )}

        {/* Admin Menu - Only show for admins */}
        {isAdmin && (
          <>
            <div className="space-y-2">
              {!isCollapsed && !isMediumScreen && (
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  Primary
                </div>
              )}
              {renderNavItems(adminMenuItems.filter(item => item.primary))}
            </div>

            <div className="space-y-2 pt-4 border-t border-border/30">
              {!isCollapsed && !isMediumScreen && (
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                  Secondary
                </div>
              )}
              {renderNavItems(adminMenuItems.filter(item => !item.primary))}
            </div>
          </>
        )}
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

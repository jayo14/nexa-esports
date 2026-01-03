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
  AlertCircle, // Add this import
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
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: Crosshair, label: 'Scrims', path: '/scrims' },
    { icon: Package, label: 'Loadouts', path: '/loadouts' },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts' },
    { icon: Megaphone, label: 'Announcements', path: '/announcements' },
    { icon: BarChart3, label: 'Statistics', path: '/statistics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const moderatorMenuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: Crosshair, label: 'Scrims', path: '/scrims' },
    { icon: Package, label: 'Loadouts', path: '/loadouts' },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts' },
    { icon: Clock, label: 'Attendance', path: '/admin/attendance' },
    { icon: Megaphone, label: 'Announcements', path: '/announcements' },
    { icon: BarChart3, label: 'Statistics', path: '/statistics' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  const adminMenuItems = [
    { icon: Shield, label: 'Admin Dashboard', path: '/admin' },
    { icon: Users, label: 'Players', path: '/admin/players' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: Package, label: 'Loadouts', path: '/loadouts' },
    { icon: Sword, label: 'Weapon Layouts', path: '/weapon-layouts' },
    { icon: Crosshair, label: 'Scrims', path: '/admin/scrims' },
    { icon: Calendar, label: 'Events', path: '/admin/events' },
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
        fixed left-0 top-0 h-full bg-card border-r border-border z-50
        transition-all duration-300 overflow-y-auto flex flex-col
        ${isMobile 
          ? (isCollapsed ? '-translate-x-full' : 'w-64 translate-x-0')
          : isMediumScreen 
            ? 'w-16' // Semi-collapsed on medium screens
            : (isCollapsed ? 'w-16' : 'w-64') // Full control on desktop
        }
      `}>

      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          {!isCollapsed && !isMediumScreen && (
            <div className="flex items-center space-x-3">
              <img
                src={profile?.avatar_url || '/placeholder.svg'}
                alt="Avatar"
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <p className="text-sm font-medium text-foreground">
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
            className="text-muted-foreground hover:text-foreground"
          >
            {(isCollapsed || isMediumScreen) ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {/* Player Menu - Only show for players */}
          {isPlayer && (
            <>
              {!isCollapsed && !isMediumScreen && (
                <div className="pb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Player Menu
                  </h3>
                </div>
              )}
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
              {!isCollapsed && !isMediumScreen && (
                <div className="pb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Moderator Menu
                  </h3>
                </div>
              )}
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
              {!isCollapsed && !isMediumScreen && (
                <div className="pb-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Admin Menu
                  </h3>
                </div>
              )}
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
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          onClick={handleLogout}
          className={`w-full justify-start text-muted-foreground hover:text-foreground ${
            (isCollapsed || isMediumScreen) ? 'px-0 justify-center' : ''
          }`}
        >
          <LogOut className="w-4 h-4" />
          {!isCollapsed && !isMediumScreen && <span className="ml-2">Logout</span>}
        </Button>
      </div>
      </div>
    </>
  );
};
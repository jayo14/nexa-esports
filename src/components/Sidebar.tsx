
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  Home,
  Gamepad2,
  Trophy,
  ShoppingBag,
  Bell,
  MessageSquare,
  Plus,
  Users,
  CalendarCheck,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const { logout, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const userRole = profile?.role;
  const isAdmin = userRole === 'admin';
  const isClanMaster = userRole === 'clan_master';
  const isModerator = userRole === 'moderator';

  const navItems = [
    { icon: Home, path: '/dashboard', label: 'Home' },
    { icon: Gamepad2, path: '/scrims', label: 'Scrims' },
    { icon: Trophy, path: '/statistics', label: 'Statistics' },
    { icon: ShoppingBag, path: '/marketplace', label: 'Marketplace' },
    { icon: Bell, path: '/announcements', label: 'Notifications' },
    { icon: MessageSquare, path: '/chat', label: 'Chat' },
  ];

  const adminNavItems = [
    {
      icon: Users,
      path: '/admin/players',
      label: 'Player Management',
      roles: ['admin', 'clan_master'],
    },
    {
      icon: CalendarCheck,
      path: '/admin/attendance',
      label: 'Attendance',
      roles: ['admin', 'clan_master', 'moderator'],
    },
  ];

  return (
    <aside className="w-20 md:w-24 flex flex-col items-center py-8 gap-6 shrink-0 h-full">
      <div className="mb-4 cursor-pointer" onClick={() => navigate('/')}>
        <img src="/nexa-logo.jpg" alt="Nexa Esports" className="w-12 h-12 rounded-full" />
      </div>

      <nav className="floating-glass w-16 md:w-20 rounded-[2.5rem] py-8 flex flex-col gap-10 items-center flex-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={cn(
                "transition-all duration-300 hover:text-white",
                isActive ? "text-accent-red active-glow-icon" : "text-white/30"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
            </button>
          );
        })}

        {/* Admin Links */}
        {adminNavItems.map((item) => {
          if (userRole && item.roles.includes(userRole)) {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  "transition-all duration-300 hover:text-white",
                  isActive ? "text-accent-red active-glow-icon" : "text-white/30"
                )}
              >
                <Icon className={cn("w-6 h-6", isActive && "fill-current")} />
              </button>
            );
          }
          return null;
        })}
      </nav>

      <div className="mt-auto flex flex-col items-center gap-4">
        <button
          onClick={() => navigate('/list-account')}
          className="w-12 h-12 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 hover:border-accent-red/50 hover:text-accent-red transition-all"
        >
          <Plus className="w-6 h-6" />
        </button>
        <button
          onClick={logout}
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white/30 hover:text-white transition-all"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>
    </aside>
  );
};

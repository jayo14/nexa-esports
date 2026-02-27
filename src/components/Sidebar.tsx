
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
  BarChart3,
  Wallet
} from 'lucide-react';

interface SidebarProps {
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { icon: Home, path: '/dashboard', label: 'Home' },
    { icon: Gamepad2, path: '/scrims', label: 'Scrims' },
    { icon: Trophy, path: '/statistics', label: 'Statistics' },
    { icon: ShoppingBag, path: '/marketplace', label: 'Marketplace' },
    { icon: Wallet, path: '/wallet', label: 'Wallet' },
    { icon: Bell, path: '/announcements', label: 'Notifications' },
    { icon: MessageSquare, path: '/chat', label: 'Chat' },
  ];

  return (
    <aside className="w-20 md:w-24 flex flex-col items-center py-8 gap-6 shrink-0 h-full">
      <div className="mb-4 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-10 h-10 bg-accent-red flex items-center justify-center rounded-xl rotate-45">
          <BarChart3 className="text-white w-6 h-6 -rotate-45" />
        </div>
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
      </nav>

      <div className="mt-auto">
        <button className="w-12 h-12 rounded-2xl border-2 border-dashed border-white/10 flex items-center justify-center text-white/20 hover:border-accent-red/50 hover:text-accent-red transition-all">
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </aside>
  );
};

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  User,
  Crosshair,
  Package,
  Menu,
} from 'lucide-react';

interface BottomNavItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
}

export const BottomNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  // Four major pages for dock navigation
  const majorPages: BottomNavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: User, label: 'Profile', path: '/profile' },
    { icon: Crosshair, label: 'Scrims', path: '/scrims' },
    { icon: Package, label: 'Loadouts', path: '/loadouts' },
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      {/* Dock Navigation */}
      <div className="bg-gradient-to-t from-background/98 via-background/95 to-background/90 backdrop-blur-xl border-t-2 border-[#FF1F44]/30 shadow-[0_-4px_30px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
          {majorPages.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 min-w-[70px]',
                  isActive
                    ? 'bg-gradient-to-br from-[#FF1F44]/30 to-red-600/20 border border-[#FF1F44]/50 shadow-lg scale-105'
                    : 'hover:bg-white/5 active:scale-95'
                )}
              >
                <div className={cn(
                  'relative',
                  isActive && 'animate-pulse'
                )}>
                  <Icon
                    className={cn(
                      'w-6 h-6 transition-colors duration-300',
                      isActive ? 'text-[#FF1F44]' : 'text-gray-400'
                    )}
                  />
                  {isActive && (
                    <div className="absolute inset-0 bg-[#FF1F44]/20 rounded-full blur-md -z-10"></div>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium transition-colors duration-300',
                    isActive ? 'text-white' : 'text-gray-500'
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
        
        {/* Safe area padding for devices with home indicator */}
        <div className="h-safe-area-inset-bottom"></div>
      </div>
    </div>
  );
};

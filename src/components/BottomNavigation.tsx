import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import {
  Home,
  User,
  Trophy,
  Wallet,
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

  // Four major pages for dock navigation: Home, Statistics, Wallet, Profile
  const majorPages: BottomNavItem[] = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: Trophy, label: 'Statistics', path: '/statistics' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const isActivePath = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pb-4">
      {/* Dock Navigation - Responsive with rounded edges and adequate spacing */}
      <div className="bg-gradient-to-t from-background/98 via-background/95 to-background/90 backdrop-blur-xl border-2 border-[#FF1F44]/30 shadow-[0_-4px_30px_rgba(0,0,0,0.5)] rounded-3xl">
        <div className="flex items-center justify-around px-3 py-3 max-w-md mx-auto gap-2">
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
      </div>
    </div>
  );
};

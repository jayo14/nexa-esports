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
    { icon: Trophy, label: 'Leaderboard', path: '/statistics' },
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
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pb-4 flex justify-center"
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Dock Navigation - Width grows with components */}
      <div className="bg-gradient-to-t from-background/98 via-background/95 to-background/90 backdrop-blur-xl border-2 border-primary/30 shadow-[0_-4px_30px_rgba(0,0,0,0.5)] rounded-full">
        <div className="flex items-center justify-center gap-4 px-4 py-3">
          {majorPages.map((item) => {
            const Icon = item.icon;
            const isActive = isActivePath(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                aria-label={`Navigate to ${item.label} page`}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300',
                  isActive
                    ? 'bg-wallet-purple-primary shadow-lg scale-105'
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
                      isActive ? 'text-white' : 'text-gray-400'
                    )}
                  />
                  {isActive && (
                    <div className="absolute inset-0 bg-wallet-purple-primary/20 rounded-xl blur-md -z-10"></div>
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium transition-colors duration-300 whitespace-nowrap',
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
    </nav>
  );
};

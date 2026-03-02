import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Dock, DockItem } from '@/components/magicui/dock';
import {
  Home,
  ShoppingBag,
  MessageSquare,
  Wallet,
  User,
} from 'lucide-react';

interface BottomNavItem {
  icon: React.ComponentType<any>;
  label: string;
  path: string;
}

interface BottomNavigationProps {
  hidden?: boolean;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ hidden = false }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Mobile dock links
  const majorPages: BottomNavItem[] = [
    { icon: Home, label: 'Home', path: '/dashboard' },
    { icon: ShoppingBag, label: 'Marketplace', path: '/marketplace' },
    { icon: MessageSquare, label: 'Chat', path: '/chat' },
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
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pb-4 flex justify-center transition-all duration-300',
        hidden ? 'translate-y-24 opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      <Dock className="bg-[rgba(26,11,13,0.72)] border-white/10">
        {majorPages.map((item) => {
          const Icon = item.icon;
          const isActive = isActivePath(item.path);

          return (
            <DockItem
              key={item.path}
              active={isActive}
              onClick={() => handleNavigation(item.path)}
              title={item.label}
              ariaLabel={`Navigate to ${item.label} page`}
              ariaCurrent={isActive ? 'page' : undefined}
            >
              <Icon className="w-5 h-5" />
            </DockItem>
          );
        })}
      </Dock>
    </nav>
  );
};

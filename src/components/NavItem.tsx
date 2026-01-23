
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { LucideIcon, ChevronDown } from 'lucide-react';
import { useNotifications } from '@/hooks/useNotifications';
import { useActivities } from '@/hooks/useActivities';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  path: string;
  isActive: boolean;
  isCollapsed: boolean;
  onClick: () => void;
  subItems?: { label: string; path: string; }[];
  badgeCount?: number;
  badgeColor?: string;
}

export const NavItem: React.FC<NavItemProps> = ({
  icon: Icon,
  label,
  path,
  isActive,
  isCollapsed,
  onClick,
  subItems,
  badgeCount,
  badgeColor = 'bg-destructive',
}) => {
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false);

  const handleItemClick = () => {
    if (subItems) {
      setIsSubMenuOpen(!isSubMenuOpen);
    } else {
      onClick();
    }
  };

  const navItemContent = (
    <Button
      variant={isActive ? 'secondary' : 'ghost'}
      onClick={handleItemClick}
      className={`w-full justify-start text-left relative ${
        isCollapsed ? 'px-2 justify-center' : 'px-3'
      } ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <Icon className={`w-4 h-4 ${isCollapsed ? '' : 'mr-2'}`} />
      {!isCollapsed && <span className="flex-1 truncate">{label}</span>}
      {subItems && !isCollapsed && (
        <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${isSubMenuOpen ? 'rotate-180' : ''}`} />
      )}
      {badgeCount !== undefined && badgeCount > 0 && (
        <div className={`absolute ${badgeColor} text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 ${
          isCollapsed ? 'top-0 right-0' : 'top-1 right-2'
        }`}>
          {badgeCount > 99 ? '99+' : badgeCount}
        </div>
      )}
    </Button>
  );

  if (isCollapsed) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{navItemContent}</TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <>
      {navItemContent}
      {subItems && isSubMenuOpen && !isCollapsed && (
        <div className="pl-8 space-y-1">
          {subItems.map((item) => (
            <Link to={item.path} key={item.path}>
              <Button variant={location.pathname === item.path ? 'secondary' : 'ghost'} className="w-full justify-start">
                {item.label}
              </Button>
            </Link>
          ))}
        </div>
      )}
    </>
  );
};

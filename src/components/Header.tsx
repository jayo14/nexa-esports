
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/NotificationBell';
import { FaTiktok, FaDiscord } from "react-icons/fa6"
import { Menu } from 'lucide-react';

interface HeaderProps {
  onSidebarToggle?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSidebarToggle }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  if (!profile) return null;

  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <header className="h-[72px] md:h-14 pt-4 md:pt-0 border-b border-border flex items-center justify-between px-4 bg-card/50 transition-all duration-300">
      {/* Left side - Sidebar toggle */}
      <div className="flex items-center">
        {onSidebarToggle && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSidebarToggle}
            className="text-muted-foreground hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Right side - Existing items */}
      <div className="flex items-center space-x-4">
        
        {/* Tiktok*/}
        <a href="https://tiktok.com/@nexa_esport" target="_blank" rel="noopener noreferrer">
            <FaTiktok className="text-lg animate-bounce text-white hover:text-primary cursor-pointer"/>
        </a>

        {/* Discord */}
        <a href="https://discord.gg/KtjK5m994C" target="_blank" rel="noopener noreferrer">
            <FaDiscord className="text-lg animate-bounce text-white hover:text-primary cursor-pointer"/>
        </a>

        {/* Notification Bell */}
        <NotificationBell />

        {/* Profile Avatar */}
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleProfileClick}
          className="flex items-center space-x-2 hover:bg-muted/50"
        >
          <div className="santa-hat-wrapper">
            <Avatar className="w-8 h-8">
              <AvatarImage 
                src={profile.avatar_url || '/placeholder.svg'} 
                alt={profile.username} 
              />
              <AvatarFallback>
                {profile.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-foreground">{profile.username}</p>
            <p className="text-xs text-muted-foreground capitalize">{profile.role}</p>
          </div>
        </Button>
      </div>
    </header>
  );
};

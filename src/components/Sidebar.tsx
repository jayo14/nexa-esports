
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Gamepad2,
  Package,
  Tv,
  BarChart2,
  ShoppingBag,
  MessageSquare,
  Plus,
} from 'lucide-react';

const C = {
  primary: '#ec131e',
  bgDark: '#1a0b0d',
};

const SideNavIcon: React.FC<{
  icon: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
}> = ({ icon, active, onClick }) => (
  <button
    onClick={onClick}
    className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all"
    style={
      active
        ? { background: `${C.primary}26`, color: C.primary, boxShadow: `0 0 15px ${C.primary}33` }
        : { color: '#64748b' }
    }
    onMouseEnter={(e) => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.color = '#fff';
      }
    }}
    onMouseLeave={(e) => {
      if (!active) {
        (e.currentTarget as HTMLButtonElement).style.color = '#64748b';
      }
    }}
  >
    {icon}
  </button>
);

interface SidebarProps {
  isCollapsed?: boolean;
  setIsCollapsed?: (collapsed: boolean) => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside
      className="w-20 rounded-[32px] flex flex-col items-center py-8 shrink-0"
      style={{
        background: `${C.bgDark}66`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="mb-12 w-10 h-10 flex items-center justify-center" onClick={() => navigate('/')}>
        <svg className="w-8 h-8 fill-white" viewBox="0 0 100 100">
          <path d="M20 20 L20 80 L35 80 L65 35 L65 80 L80 80 L80 20 L65 20 L35 65 L35 20 Z" />
        </svg>
      </div>

      <nav className="flex-1 flex flex-col gap-6">
        <SideNavIcon icon={<Home className="w-5 h-5" />} onClick={() => navigate('/')} active={isActive('/')} />
        <SideNavIcon
          icon={<Gamepad2 className="w-5 h-5" />}
          onClick={() => navigate('/scrims')}
          active={isActive('/scrims') || location.pathname.startsWith('/events/')}
        />
        <SideNavIcon icon={<Package className="w-5 h-5" />} onClick={() => navigate('/marketplace')} active={isActive('/package')} />
        <SideNavIcon icon={<Tv className="w-5 h-5" />} onClick={() => navigate('/announcements')} active={isActive('/announcements')} />
        <SideNavIcon icon={<BarChart2 className="w-5 h-5" />} onClick={() => navigate('/statistics')} active={isActive('/statistics')} />
        <SideNavIcon icon={<ShoppingBag className="w-5 h-5" />} onClick={() => navigate('/marketplace')} active={isActive('/marketplace')} />
        <SideNavIcon icon={<MessageSquare className="w-5 h-5" />} onClick={() => navigate('/chat')} active={isActive('/chat')} />
      </nav>

      <button
        onClick={() => navigate('/list-account')}
        className="mt-auto w-10 h-10 rounded-full flex items-center justify-center"
        style={{ background: `${C.primary}33`, border: `1px solid ${C.primary}66`, color: C.primary }}
      >
        <Plus className="w-4 h-4" />
      </button>
    </aside>
  );
};

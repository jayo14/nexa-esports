
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import {
  MdHome,
  MdAccountBalanceWallet,
  MdSportsEsports,
  MdStorefront,
  MdCampaign,
  MdBarChart,
  MdShoppingBag,
  MdChat,
  MdAdd,
  MdNotifications,
  MdPayments,
  MdSettings,
  MdEvent,
  MdInventory,
  MdGpsFixed,
  MdTimeline,
  MdPeople,
  MdSecurity,
  MdEmojiEvents,
} from 'react-icons/md';

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
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();

  const isAdminOrClanMaster = profile?.role === 'admin' || profile?.role === 'clan_master';

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

  return (
    <aside
      className="w-20 h-full rounded-[32px] flex flex-col items-center py-8 shrink-0"
      style={{
        background: `${C.bgDark}66`,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="mb-8 w-12 h-12 flex items-center justify-center cursor-pointer" onClick={() => navigate('/dashboard')}>
        <img src="/nexa-logo-ramadan.jpg" alt="NeXa Esports" className="w-12 h-12 rounded-full object-cover" />
      </div>

      <ScrollArea className="flex-1 w-full [&>[data-orientation='vertical']]:hidden">
        <nav className="flex flex-col items-center gap-5 pb-2">
          <SideNavIcon icon={<MdHome className="w-5 h-5" />} onClick={() => navigate('/dashboard')} active={isActive('/dashboard')} />
          <SideNavIcon icon={<MdAccountBalanceWallet className="w-5 h-5" />} onClick={() => navigate('/wallet')} active={isActive('/wallet')} />
          <SideNavIcon
            icon={<MdSportsEsports className="w-5 h-5" />}
            onClick={() => navigate('/scrims')}
            active={isActive('/scrims') || location.pathname.startsWith('/events/')}
          />
          <SideNavIcon icon={<MdStorefront className="w-5 h-5" />} onClick={() => navigate('/marketplace')} active={isActive('/marketplace')} />
          <SideNavIcon icon={<MdCampaign className="w-5 h-5" />} onClick={() => navigate('/announcements')} active={isActive('/announcements')} />
          <SideNavIcon icon={<MdBarChart className="w-5 h-5" />} onClick={() => navigate('/statistics')} active={isActive('/statistics')} />
          <SideNavIcon icon={<MdShoppingBag className="w-5 h-5" />} onClick={() => navigate('/buyer/dashboard')} active={isActive('/buyer/dashboard')} />
          <SideNavIcon icon={<MdChat className="w-5 h-5" />} onClick={() => navigate('/chat')} active={isActive('/chat')} />
          <SideNavIcon icon={<MdPeople className="w-5 h-5" />} onClick={() => navigate('/players')} active={isActive('/players')} />
          <SideNavIcon icon={<MdSecurity className="w-5 h-5" />} onClick={() => navigate('/teams')} active={isActive('/teams')} />
          {isAdminOrClanMaster && (
            <>
              <SideNavIcon icon={<MdEvent className="w-5 h-5" />} onClick={() => navigate('/admin/events')} active={isActive('/admin/events')} />
              <SideNavIcon icon={<MdEmojiEvents className="w-5 h-5" />} onClick={() => navigate('/admin/matches')} active={isActive('/admin/matches')} />
              <SideNavIcon icon={<MdNotifications className="w-5 h-5" />} onClick={() => navigate('/notifications')} active={isActive('/notifications')} />
              <SideNavIcon icon={<MdPayments className="w-5 h-5" />} onClick={() => navigate('/admin/earnings')} active={isActive('/admin/earnings')} />
              <SideNavIcon icon={<MdSettings className="w-5 h-5" />} onClick={() => navigate('/admin/config')} active={isActive('/admin/config')} />
              <SideNavIcon icon={<MdInventory className="w-5 h-5" />} onClick={() => navigate('/admin/loadouts')} active={isActive('/admin/loadouts')} />
              <SideNavIcon icon={<MdGpsFixed className="w-5 h-5" />} onClick={() => navigate('/admin/weapon-layouts')} active={isActive('/admin/weapon-layouts')} />
              <SideNavIcon icon={<MdTimeline className="w-5 h-5" />} onClick={() => navigate('/admin/activities')} active={isActive('/admin/activities')} />
            </>
          )}
        </nav>
      </ScrollArea>

      <button
        onClick={() => navigate('/list-account')}
        className="w-10 h-10 mt-auto rounded-full flex items-center justify-center"
        style={{ background: `${C.primary}33`, border: `1px solid ${C.primary}66`, color: C.primary }}
      >
        <MdAdd className="w-4 h-4" />
      </button>
    </aside>
  );
};

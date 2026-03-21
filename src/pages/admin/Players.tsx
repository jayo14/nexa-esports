import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminPlayers, useUpdatePlayer, useDeletePlayer } from '@/hooks/useAdminPlayers';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { logPlayerBan, logPlayerUnban, logRoleChange } from '@/lib/activityLogger';
import {
  Search, Edit, Trash2, ShieldCheck, ShieldOff, UserCog, Crown, User,
  MoreVertical, X, Check, ArrowDown, ArrowUp, Users, Target, TrendingUp,
  Mail, Smartphone, Trophy, CalendarIcon, Share2, Shield, UserPlus, CheckCircle2, Send,
} from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from '@/components/ui/scroll-area';
import PlayerProfileModal from '@/components/PlayerProfileModal';

type Player = Database['public']['Tables']['profiles']['Row'] & { email?: string | null };

/* ─────────────── Design Tokens ─────────────── */
const C = {
  primary:  '#ec1313',
  bgDark:   '#1a0b0b',
  card:     '#2a1515',
  border:   'rgba(236,19,19,0.2)',
};

const glass: React.CSSProperties = {
  background: 'rgba(42,21,21,0.6)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: `1px solid ${C.border}`,
};

const TOP_RANKS_THRESHOLD = 10;

const getPlayerPrefix = (status?: string | null) =>
  status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂';

/* ─────────────── Role Icon ─────────────── */
const RoleIcon: React.FC<{ role: string }> = ({ role }) => {
  switch (role) {
    case 'clan_master': return <Crown   className="w-3.5 h-3.5" style={{ color: '#a855f7' }} />;
    case 'admin':       return <ShieldCheck className="w-3.5 h-3.5" style={{ color: C.primary }} />;
    case 'moderator':   return <UserCog className="w-3.5 h-3.5" style={{ color: '#eab308' }} />;
    default:            return <User    className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />;
  }
};

/* ─────────────── Player Card ─────────────── */
const PlayerCard: React.FC<{
  player: Player;
  leaderboardRank?: number;
  onBan: (p: Player) => void;
  onUnban: (p: Player) => void;
  onEdit: (p: Player) => void;
  onDelete: (id: string) => void;
}> = ({ player, leaderboardRank, onBan, onUnban, onEdit, onDelete }) => {
  const { profile } = useAuth();
  const navigate    = useNavigate();
  const [hovered, setHovered] = useState(false);

  const roleName = player.role === 'clan_master'
    ? 'Clan Master'
    : player.role.charAt(0).toUpperCase() + player.role.slice(1);

  return (
    <div
      className="relative overflow-hidden flex flex-col"
      style={{
        ...glass,
        borderRadius: '20px',
        height: 480,
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: hovered ? `0 0 30px ${C.primary}4d` : '0 4px 24px rgba(0,0,0,0.4)',
        opacity: player.is_banned ? 0.55 : 1,
        filter: player.is_banned ? 'grayscale(40%)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Action buttons */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        {(profile?.role === 'admin' || profile?.role === 'clan_master') && (
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
            style={{ ...glass, border: `1px solid ${C.primary}4d`, color: C.primary }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = C.primary;
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(42,21,21,0.6)';
              (e.currentTarget as HTMLButtonElement).style.color = C.primary;
            }}
            onClick={(e) => { e.stopPropagation(); onEdit(player); }}
            title="Edit Player"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all"
              style={{ ...glass, border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#1a0b0b]/95 backdrop-blur-md border-[#ec1313]/30">
            {(profile?.role === 'admin' || profile?.role === 'clan_master') && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(player); }}>
                <Edit className="w-4 h-4 mr-2" /> Edit
              </DropdownMenuItem>
            )}
            {player.is_banned ? (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onUnban(player); }}
                disabled={player.role === 'clan_master'}
              >
                <Check className="w-4 h-4 mr-2" /> Unban
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onBan(player); }}
                disabled={player.role === 'clan_master'}
                className="text-red-400 focus:text-red-400"
              >
                <ShieldOff className="w-4 h-4 mr-2" /> Ban Player
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/profile/${player.id}`); }}>
              <Share2 className="w-4 h-4 mr-2" /> Public Profile
            </DropdownMenuItem>
            {profile?.role === 'clan_master' && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(player.id); }}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="w-4 h-4 mr-2" /> Delete Player
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Avatar area */}
      <div className="relative h-64 w-full overflow-hidden flex-shrink-0">
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt={player.ign || ''}
            className="w-full h-full object-cover"
            style={{
              transition: 'transform 0.5s ease',
              transform: hovered ? 'scale(1.1)' : 'scale(1)',
            }}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${C.primary}33, ${C.bgDark})` }}
          >
            <span className="text-7xl font-black" style={{ color: C.primary }}>
              {player.ign?.charAt(0)?.toUpperCase() || '?'}
            </span>
          </div>
        )}

        {player.is_banned && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <ShieldOff className="w-14 h-14" style={{ color: C.primary }} />
          </div>
        )}

        {leaderboardRank && leaderboardRank <= TOP_RANKS_THRESHOLD && (
          <div
            className="absolute top-4 left-4 w-9 h-9 rounded-full flex items-center justify-center text-xs font-black text-black shadow-lg"
            style={{ background: 'linear-gradient(135deg, #facc15, #f97316)' }}
          >
            #{leaderboardRank}
          </div>
        )}

        {/* Name overlay */}
        <div
          className="absolute bottom-0 left-0 w-full p-5"
          style={{ background: `linear-gradient(to top, ${C.bgDark}, ${C.bgDark}cc, transparent)` }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span
              className="w-2 h-2 rounded-full"
              style={{
                background: player.is_banned ? C.primary : '#22c55e',
                animation: 'pulse 2s infinite',
              }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: player.is_banned ? C.primary : '#22c55e' }}
            >
              {player.is_banned ? 'Banned' : 'Operational'}
            </span>
          </div>
          <h3 className="text-2xl font-black text-white italic leading-tight truncate">
            {player.ign}
          </h3>
        </div>
      </div>

      {/* Stats section */}
      <div className="p-5 flex flex-col justify-between flex-1">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-3"
            style={{ borderBottom: `1px solid ${C.border}` }}>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</span>
            <div className="flex items-center gap-2" style={{ color: C.primary }}>
              <RoleIcon role={player.role} />
              <span className="text-xs font-bold italic">{roleName}</span>
              {player.grade && (
                <span className="text-[10px] font-black text-slate-400 ml-1">· {player.grade}</span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pb-3"
            style={{ borderBottom: `1px solid ${C.border}` }}>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Kills</span>
            <span className="text-sm font-bold text-slate-200">
              {(player.kills || 0).toLocaleString()}
              {leaderboardRank && (
                <span className="ml-2 text-[10px]" style={{ color: C.primary }}>#{leaderboardRank}</span>
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Device</span>
            <span className="text-xs font-medium text-slate-200">{player.device || 'Mobile'}</span>
          </div>
        </div>

        <div className="mt-4 pt-4 flex gap-2" style={{ borderTop: `1px solid ${C.border}` }}>
          <button
            className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
            style={{ background: `${C.primary}1a`, border: `1px solid ${C.primary}33`, color: C.primary }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = C.primary;
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = `${C.primary}1a`;
              (e.currentTarget as HTMLButtonElement).style.color = C.primary;
            }}
            onClick={() => onEdit(player)}
          >
            Inspect
          </button>
          {player.is_banned ? (
            <button
              className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.3)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,197,94,0.1)')}
              onClick={() => onUnban(player)}
              disabled={player.role === 'clan_master'}
            >
              Revoke Ban
            </button>
          ) : (
            <button
              className="flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#cbd5e1' }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)')}
              onClick={() => onBan(player)}
              disabled={player.role === 'clan_master'}
            >
              Reassign
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/* ─────────────── FilterPill ─────────────── */
const FilterPill: React.FC<{ label: string; active?: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    onClick={onClick}
    className="flex-none px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
    style={
      active
        ? { background: `${C.primary}33`, border: `1px solid ${C.primary}4d`, color: C.primary }
        : { ...glass, border: `1px solid ${C.primary}0d`, color: '#64748b' }
    }
  >
    {label}
  </button>
);

/* ─────────────── InlineSelect ─────────────── */
const InlineSelect: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}> = ({ value, onChange, options, placeholder }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="text-xs font-bold uppercase tracking-widest rounded-xl py-2.5 px-4 focus:outline-none cursor-pointer"
    style={{ ...glass, color: '#cbd5e1', border: `1px solid ${C.primary}1a`, appearance: 'none', paddingRight: '32px' }}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map((o) => (
      <option key={o.value} value={o.value} style={{ background: C.bgDark }}>{o.label}</option>
    ))}
  </select>
);

/* ─────────────── EditPlayerDialog ─────────────── */
const EditPlayerDialog: React.FC<{
  player: Player | null;
  onClose: () => void;
  onSave: (updates: Partial<Player>) => void;
}> = ({ player, onClose, onSave }) => {
  const [p, setP] = useState<Player | null>(player);
  React.useEffect(() => setP(player), [player]);
  if (!p) return null;

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.3)',
    border: `1px solid ${C.primary}1a`,
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '14px',
    color: '#f1f5f9',
    width: '100%',
    outline: 'none',
  };

  const sectionTitle = (title: string) => (
    <h3 className="text-sm font-black uppercase tracking-widest mb-4 pb-2"
      style={{ color: C.primary, borderBottom: `1px solid ${C.primary}33` }}>
      {title}
    </h3>
  );

  const field = (label: string, key: keyof Player, type: 'text' | 'number' = 'text', disabled = false) => (
    <div className="flex flex-col gap-1.5" key={key}>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <input
        type={type}
        value={(p[key] as string | number) || ''}
        onChange={(e) => setP({ ...p, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
        disabled={disabled}
        style={{ ...inputStyle, opacity: disabled ? 0.4 : 1 }}
      />
    </div>
  );

  const selectField = (label: string, key: keyof Player, options: { value: string; label: string }[]) => (
    <div className="flex flex-col gap-1.5" key={key}>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</label>
      <select
        value={(p[key] as string) || ''}
        onChange={(e) => setP({ ...p, [key]: e.target.value })}
        style={{ ...inputStyle, appearance: 'none' }}
      >
        {options.map((o) => <option key={o.value} value={o.value} style={{ background: C.bgDark }}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <Dialog open={!!player} onOpenChange={onClose}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] overflow-y-auto"
        style={{
          background: `${C.bgDark}f5`,
          backdropFilter: 'blur(24px)',
          border: `1px solid ${C.primary}33`,
          borderRadius: '24px',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <Edit className="w-5 h-5" style={{ color: C.primary }} />
            Edit: {getPlayerPrefix(p.status)}{p.ign}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-8 py-4">
          <section>
            {sectionTitle('Basic Information')}
            <div className="grid grid-cols-2 gap-4">
              {field('In-Game Name (IGN)', 'ign')}
              {field('Username', 'username')}
              {selectField('Status', 'status', [
                { value: 'active', label: 'Active (Ɲ・乂)' },
                { value: 'beta',   label: 'Beta (Ɲ・乃)' },
              ])}
            </div>
          </section>

          <section>
            {sectionTitle('Role & Progression')}
            <div className="grid grid-cols-3 gap-4">
              {selectField('Role', 'role', [
                { value: 'player',      label: 'Player' },
                { value: 'moderator',   label: 'Moderator' },
                { value: 'admin',       label: 'Admin' },
                { value: 'clan_master', label: 'Clan Master' },
              ])}
              {selectField('Grade', 'grade', ['Legendary','Master','Pro','Elite','Rookie','S','A','B','C','D'].map((g) => ({ value: g, label: g })))}
              {field('Tier', 'tier')}
            </div>
          </section>

          <section>
            {sectionTitle('Combat Statistics')}
            <div className="grid grid-cols-3 gap-4">
              {field('BR Kills', 'br_kills', 'number')}
              {field('MP Kills', 'mp_kills', 'number')}
              {field('Total Kills (auto)', 'kills', 'number', true)}
              {field('Attendance Score', 'attendance', 'number')}
            </div>
          </section>

          <section>
            {sectionTitle('Game Preferences')}
            <div className="grid grid-cols-2 gap-4">
              {field('BR Class', 'br_class')}
              {field('MP Class', 'mp_class')}
              {selectField('Player Type', 'player_type', [
                { value: 'Hybrid', label: 'Hybrid (MP+BR)' },
                { value: 'BR',     label: 'Battle Royale' },
                { value: 'MP',     label: 'Multiplayer' },
              ])}
            </div>
          </section>

          <button
            onClick={() => onSave({
              ign: p.ign, username: p.username, status: p.status, role: p.role,
              grade: p.grade, tier: p.tier, br_kills: p.br_kills, mp_kills: p.mp_kills,
              kills: (p.br_kills || 0) + (p.mp_kills || 0),
              attendance: p.attendance, br_class: p.br_class, mp_class: p.mp_class,
              player_type: p.player_type,
            })}
            className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm text-white transition-all"
            style={{ background: C.primary, boxShadow: `0 8px 24px ${C.primary}4d` }}
            onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
          >
            <Check className="w-4 h-4 inline mr-2" />
            Save Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─────────────── BanDialog ─────────────── */
const BanDialog: React.FC<{
  player: Player | null;
  onClose: () => void;
  onConfirm: (reason: string, type: 'temporary' | 'permanent', date?: Date) => void;
}> = ({ player, onClose, onConfirm }) => {
  const [banReason, setBanReason] = useState('');
  const [banType,   setBanType]   = useState<'temporary' | 'permanent'>('temporary');
  const [banDate,   setBanDate]   = useState<Date | undefined>(
    new Date(new Date().setDate(new Date().getDate() + 7))
  );

  const DURATIONS = [
    { label: '24 Hours',  days: 1,    meta: 'Minor Warning' },
    { label: '7 Days',    days: 7,    meta: 'Major Disciplinary' },
    { label: 'Permanent', days: null, meta: 'Clan Blacklist' },
  ];

  const isSelected = (days: number | null) => {
    if (days === null) return banType === 'permanent';
    if (banType !== 'temporary') return false;
    const target = new Date(); target.setDate(target.getDate() + days);
    return banDate?.toDateString() === target.toDateString();
  };

  const selectDuration = (days: number | null) => {
    if (days === null) { setBanType('permanent'); return; }
    setBanType('temporary');
    const d = new Date(); d.setDate(d.getDate() + days);
    setBanDate(d);
  };

  return (
    <Dialog open={!!player} onOpenChange={onClose}>
      <DialogContent
        className="max-w-lg"
        style={{
          background: `${C.bgDark}f5`,
          backdropFilter: 'blur(24px)',
          border: `1px solid ${C.primary}33`,
          borderTop: `4px solid ${C.primary}`,
          borderRadius: '24px',
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <ShieldOff className="w-6 h-6" style={{ color: C.primary }} />
            Ban Execution: {player?.ign}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Warning */}
          <div
            className="flex items-start gap-4 p-5 rounded-2xl"
            style={{ background: `${C.primary}1a`, borderLeft: `4px solid ${C.primary}` }}
          >
            <ShieldOff className="w-6 h-6 flex-shrink-0 mt-0.5" style={{ color: C.primary }} />
            <div>
              <h4 className="font-black uppercase tracking-wide text-sm text-white mb-1">
                High-Alert Status: Sanction Pending
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                Execution of this order will restrict the operative from all clan operations.{' '}
                <span className="text-white font-bold">Action may be permanent unless manually appealed.</span>
              </p>
            </div>
          </div>

          {/* Duration options */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">
              Set Ban Duration
            </p>
            <div className="space-y-2">
              {DURATIONS.map(({ label, days, meta }) => {
                const selected = isSelected(days);
                return (
                  <label
                    key={label}
                    className="flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all"
                    style={
                      selected
                        ? { background: `${C.primary}26`, border: `2px solid ${C.primary}` }
                        : { background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.06)' }
                    }
                    onClick={() => selectDuration(days)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{ borderColor: selected ? C.primary : '#475569', background: selected ? C.primary : 'transparent' }}
                      >
                        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className={`text-sm font-bold ${selected ? 'text-white' : 'text-slate-400'}`}>{label}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest"
                      style={{ color: selected ? C.primary : '#475569' }}>
                      {meta}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Reason */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
              Ban Message / Reason
            </p>
            <input
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Enter reason for the ban (required)…"
              className="w-full rounded-xl py-3 px-4 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none"
              style={{ background: 'rgba(0,0,0,0.3)', border: `1px solid ${C.primary}1a` }}
            />
          </div>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => onConfirm(banReason, banType, banDate)}
              className="w-full py-4 rounded-2xl font-black uppercase tracking-widest text-lg text-white transition-all"
              style={{ background: C.primary, boxShadow: `0 0 20px ${C.primary}66` }}
              onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
            >
              Confirm Ban
            </button>
            <button
              onClick={onClose}
              className="w-full py-2 text-slate-500 hover:text-white font-bold uppercase tracking-widest text-sm transition-colors flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" /> Abort Mission
            </button>
          </div>

          {/* Footer intel */}
          <p className="text-slate-500 text-xs italic leading-relaxed px-1">
            By confirming, this action will be logged into the clan's Global Intelligence Network.
            Target operative will be notified via in-game secure channel.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ─────────────── StatCard ─────────────── */
const StatCard: React.FC<{ label: string; value: string; sub: string; trend?: 'up' | 'down' }> = ({
  label, value, sub, trend,
}) => (
  <div className="p-5 rounded-2xl" style={{ ...glass, borderLeft: `4px solid ${C.primary}` }}>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
    <p className="text-3xl font-black text-slate-100 mt-1">{value}</p>
    <p className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
      {trend === 'up'   && <TrendingUp className="w-3 h-3 text-green-500" />}
      {trend === 'down' && <ArrowDown  className="w-3 h-3" style={{ color: C.primary }} />}
      {sub}
    </p>
  </div>
);

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export const AdminPlayers: React.FC = () => {
  const { profile }                  = useAuth();
  const { data: players, isLoading } = useAdminPlayers();
  const { data: leaderboardData }    = useLeaderboard();
  const updatePlayer                 = useUpdatePlayer();
  const deletePlayer                 = useDeletePlayer();
  const { toast }                    = useToast();

  const [searchTerm,     setSearchTerm]     = useState('');
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [filterRole,     setFilterRole]     = useState('all');
  const [filterGrade,    setFilterGrade]    = useState('all');
  const [sortBy,         setSortBy]         = useState('kills');
  const [sortOrder,      setSortOrder]      = useState('desc');
  const [editingPlayer,  setEditingPlayer]  = useState<Player | null>(null);
  const [banningPlayer,  setBanningPlayer]  = useState<Player | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState('player');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [inviteEmailError, setInviteEmailError] = useState('');

  const leaderboardRankMap = useMemo(() => {
    const map = new Map<string, number>();
    leaderboardData?.forEach((e, i) => map.set(e.id, i + 1));
    return map;
  }, [leaderboardData]);

  const filteredPlayers = useMemo(
    () =>
      (players || [])
        .filter((p) => {
          const s = searchTerm.toLowerCase();
          const ok1 = p.username?.toLowerCase().includes(s) || p.ign?.toLowerCase().includes(s) || p.email?.toLowerCase().includes(s);
          const ok2 = filterRole   === 'all'    || p.role  === filterRole;
          const ok3 = filterStatus === 'all'    || 
                      (filterStatus === 'active' && !p.is_banned && p.status !== 'beta') || 
                      (filterStatus === 'beta' && p.status === 'beta' && !p.is_banned) ||
                      (filterStatus === 'banned' && p.is_banned);
          const ok4 = filterGrade  === 'all'    || p.grade === filterGrade;
          return ok1 && ok2 && ok3 && ok4;
        })
        .sort((a, b) => {
          const dir = sortOrder === 'asc' ? 1 : -1;
          switch (sortBy) {
            case 'kills':      return ((a.kills || 0) - (b.kills || 0)) * dir;
            case 'attendance': return ((a.attendance || 0) - (b.attendance || 0)) * dir;
            case 'rank':       return ((leaderboardRankMap.get(a.id) || 9999) - (leaderboardRankMap.get(b.id) || 9999)) * dir;
            case 'name':       return (a.ign?.toLowerCase() || '').localeCompare(b.ign?.toLowerCase() || '') * dir;
            default:           return ((a.kills || 0) - (b.kills || 0)) * dir;
          }
        }),
    [players, searchTerm, filterRole, filterStatus, filterGrade, sortBy, sortOrder, leaderboardRankMap]
  );

  const handleUpdatePlayer = async (updates: Partial<Player>) => {
    if (!editingPlayer) return;
    if (updates.role && updates.role !== editingPlayer.role)
      await logRoleChange(editingPlayer.id, editingPlayer.ign, editingPlayer.role, updates.role);
    await updatePlayer.mutateAsync({ id: editingPlayer.id, updates });
    setEditingPlayer(null);
  };

  const handleDeletePlayer = async (id: string) => {
    const p = players?.find((x) => x.id === id);
    if (p && confirm(`Delete ${p.ign}? This action is irreversible.`))
      await deletePlayer.mutateAsync(id);
  };

  const handleBanPlayer = (p: Player) => {
    if (p.role === 'clan_master') {
      toast({ title: 'Permission Denied', description: 'The Clan Master cannot be banned.', variant: 'destructive' });
      return;
    }
    setBanningPlayer(p);
  };

  const handleConfirmBan = async (reason: string, type: 'temporary' | 'permanent', date?: Date) => {
    if (!banningPlayer) return;
    if (!reason) {
      toast({ title: 'Reason Required', description: 'Please provide a reason for the ban.', variant: 'destructive' });
      return;
    }
    await updatePlayer.mutateAsync({
      id: banningPlayer.id,
      updates: {
        is_banned: true, banned_at: new Date().toISOString(),
        ban_reason: reason,
        ban_expires_at: type === 'temporary' ? date?.toISOString() : null,
        banned_by: profile?.id,
      },
    });
    await logPlayerBan(banningPlayer.id, banningPlayer.ign, reason);
    toast({ title: 'Player Banned', description: `${banningPlayer.ign} has been banned.`, variant: 'destructive' });
    setBanningPlayer(null);
  };

  const handleUnbanPlayer = async (p: Player) => {
    await updatePlayer.mutateAsync({
      id: p.id,
      updates: { is_banned: false, banned_at: null, ban_reason: null, ban_expires_at: null, banned_by: null },
    });
    await logPlayerUnban(p.id, p.ign);
    toast({ title: 'Player Unbanned', description: `${p.ign} has been unbanned.` });
  };

  const handleSendInvite = async () => {
    const normalizedEmail = inviteEmail.trim().toLowerCase();
    const normalizedFullName = inviteFullName.trim();

    // Validate
    if (!normalizedFullName) {
      toast({ title: 'Missing name', description: 'Please enter the recruit\'s full name.', variant: 'destructive' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      setInviteEmailError('Please enter a valid email address.');
      return;
    }
    setInviteEmailError('');

    setSendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke('invite-member', {
        body: {
          email: normalizedEmail,
          fullName: normalizedFullName,
          role: inviteRole,
          redirectTo: `${window.location.origin}/auth/onboarding`,
        },
      });

      if (error) {
        console.error('Invite error:', error);
        let message = 'Could not send invite email.';

        // Try to get detailed error from response body
        if (error.context && typeof error.context.json === 'function') {
          try {
            const body = await error.context.json();
            if (body && body.error) message = body.error;
          } catch (e) {
            // Fallback to error message if JSON parsing fails
            message = error.message || message;
          }
        } else {
          message = error.message || message;
        }

        throw new Error(message);
      }

      if (data?.error) throw new Error(data.error);

      setInviteSuccess(true);
      toast({
        title: 'Invite Sent',
        description: `An invite has been sent to ${normalizedEmail}`,
      });
      } catch (error: any) {
      console.error('handleSendInvite failed:', error);
      toast({
        title: 'Invite failed',
        description: error.message || 'Could not send invite email.',
        variant: 'destructive',
      });
      } finally {
      setSendingInvite(false);
      }

  };

  const handleCloseInviteDialog = (open: boolean) => {
    setInviteDialogOpen(open);
    if (!open) {
      setInviteEmail('');
      setInviteFullName('');
      setInviteEmailError('');
      setInviteSuccess(false);
    }
  };

  const activeCount = players?.filter((p) => !p.is_banned).length || 0;
  const bannedCount = players?.filter((p) => p.is_banned).length || 0;

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full border-2 animate-spin"
            style={{ borderColor: `${C.primary} transparent transparent transparent` }} />
          <p className="text-slate-400 text-sm font-black uppercase tracking-widest">Loading operatives…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        background: `radial-gradient(circle at center, ${C.card} 0%, ${C.bgDark} 100%)`,
      }}
    >
      <div className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-8">

        {/* ── Page Header ── */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                style={{ background: `${C.primary}33`, color: C.primary }}>
                Legendary Tier
              </span>
              <span className="text-slate-500 text-sm">Season 14 Combat Log</span>
            </div>
            <h1 className="text-5xl font-black tracking-tighter text-slate-100 uppercase">
              Player <span style={{ color: C.primary }}>Management</span>
            </h1>
            <p className="text-slate-400 max-w-md mt-2">
              Track performance, discipline attendance records, and optimize clan roles for upcoming tournaments.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-widest transition-all"
              style={{ background: `${C.bgDark}80`, border: `1px solid ${C.primary}4d`, color: '#94a3b8' }}
            >
              <ArrowDown className="w-4 h-4" /> Export CSV
            </button>
            <button
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-black uppercase tracking-widest text-white"
              style={{ background: C.primary, boxShadow: `0 4px 16px ${C.primary}4d` }}
              onClick={() => setInviteDialogOpen(true)}
            >
              <Users className="w-4 h-4" /> Add Member
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Members"      value={`${players?.length || 0}`} sub="+4 this week"      trend="up" />
          <StatCard label="Active Operatives"  value={`${activeCount}`}              sub="Currently operational" trend="up" />
          <StatCard label="Banned Operatives"  value={`${bannedCount}`}              sub="Restricted access" trend="down" />
          <StatCard label="Combat Efficiency"  value="Legendary"                     sub="Top 1% global rank" />
        </div>

        {/* ── Filters ── */}
        <div className="p-4 rounded-2xl" style={{ background: `${C.card}66`, border: `1px solid ${C.primary}1a` }}>
          <div className="flex flex-wrap gap-3 mb-4">
            <FilterPill label="ALL UNITS" active={filterStatus === 'all'}    onClick={() => setFilterStatus('all')} />
            <FilterPill label="ACTIVE"    active={filterStatus === 'active'} onClick={() => setFilterStatus('active')} />
            <FilterPill label="BETA"      active={filterStatus === 'beta'}   onClick={() => setFilterStatus('beta')} />
            <FilterPill label="BANNED"    active={filterStatus === 'banned'} onClick={() => setFilterStatus('banned')} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full py-2.5 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                style={{ background: `${C.bgDark}80`, border: `1px solid ${C.primary}1a` }}
                placeholder="Search operatives by IGN or UID…"
              />
            </div>

            <InlineSelect value={filterRole} onChange={setFilterRole} options={[
              { value: 'all', label: 'All Roles' },
              { value: 'player', label: 'Player' },
              { value: 'moderator', label: 'Moderator' },
              { value: 'admin', label: 'Admin' },
              { value: 'clan_master', label: 'Clan Master' },
            ]} />

            <InlineSelect value={filterGrade} onChange={setFilterGrade} options={[
              { value: 'all', label: 'All Grades' },
              ...['Legendary','Master','Pro','Elite','Rookie','S','A','B','C','D'].map((g) => ({ value: g, label: g })),
            ]} />

            <InlineSelect
              value={`${sortBy}_${sortOrder}`}
              onChange={(v) => { const parts = v.split('_'); setSortBy(parts[0]); setSortOrder(parts[1]); }}
              options={[
                { value: 'kills_desc',      label: 'Most Kills' },
                { value: 'kills_asc',       label: 'Fewest Kills' },
                { value: 'attendance_desc', label: 'Top Attendance' },
                { value: 'rank_asc',        label: 'Leaderboard Rank' },
                { value: 'name_asc',        label: 'Name A-Z' },
              ]}
            />
          </div>
        </div>

        {/* ── Grid ── */}
        {filteredPlayers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredPlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                leaderboardRank={leaderboardRankMap.get(player.id)}
                onBan={handleBanPlayer}
                onUnban={handleUnbanPlayer}
                onEdit={setEditingPlayer}
                onDelete={handleDeletePlayer}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <Shield className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: C.primary }} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">
              No operatives found matching your criteria.
            </p>
          </div>
        )}

        {/* ── Load More ── */}
        <div className="flex justify-center pt-4">
          <button
            className="group flex items-center gap-3 px-8 py-4 rounded-full transition-all"
            style={{ ...glass, border: `1px solid ${C.primary}4d` }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = `0 0 20px ${C.primary}33`)}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
          >
            <span className="text-xs font-black tracking-[0.2em] text-slate-100 uppercase">
              Load More Operatives
            </span>
            <ArrowDown className="w-4 h-4 transition-transform group-hover:translate-y-1" style={{ color: C.primary }} />
          </button>
        </div>
      </div>

      {/* ── Dialogs ── */}
      <EditPlayerDialog player={editingPlayer} onClose={() => setEditingPlayer(null)} onSave={handleUpdatePlayer} />
      <BanDialog        player={banningPlayer} onClose={() => setBanningPlayer(null)} onConfirm={handleConfirmBan} />

      <PlayerProfileModal
        open={!!selectedPlayer}
        onOpenChange={(open) => !open && setSelectedPlayer(null)}
        player={selectedPlayer ? { name: selectedPlayer.ign, id: selectedPlayer.id } : null}
        onEdit={(p) => { setEditingPlayer(p); setSelectedPlayer(null); }}
      />

      <Dialog open={inviteDialogOpen} onOpenChange={handleCloseInviteDialog}>
        <DialogContent
          className="max-w-[480px] p-0 overflow-hidden"
          style={{ background: C.bgDark, border: `1px solid ${C.primary}44`, borderRadius: '24px' }}
        >
          {/* Modal header strip */}
          <div
            className="px-8 pt-8 pb-6"
            style={{ borderBottom: `1px solid ${C.primary}22` }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `${C.primary}22`, border: `1px solid ${C.primary}44` }}
              >
                <UserPlus className="w-5 h-5" style={{ color: C.primary }} />
              </div>
              <div>
                <DialogTitle className="text-lg font-black uppercase tracking-wider text-white">Recruit New Operative</DialogTitle>
                <p className="text-xs text-slate-500 mt-0.5">An invite email will be sent with a password setup link</p>
              </div>
            </div>
          </div>

          <ScrollArea className="max-h-[80vh]">
            {inviteSuccess ? (
              /* ── Success State ── */
              <div className="px-8 py-10 flex flex-col items-center text-center gap-4">
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(34,197,94,0.12)', border: '2px solid rgba(34,197,94,0.4)' }}
                >
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <div>
                  <p className="text-xl font-black text-white mb-1">Invite Dispatched!</p>
                  <p className="text-sm text-slate-400">
                    An invite email has been sent to{' '}
                    <span className="font-bold" style={{ color: C.primary }}>{inviteEmail}</span>
                    {' '}with a link to set their password and access the platform.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCloseInviteDialog(false)}
                  className="mt-2 px-8 py-3 rounded-xl font-black uppercase tracking-widest text-sm text-white transition-all"
                  style={{ background: C.primary, boxShadow: `0 4px 16px ${C.primary}4d` }}
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Form State ── */
              <div className="px-8 py-6 space-y-5">
                {/* Full Name */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Full Name <span style={{ color: C.primary }}>*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={inviteFullName}
                      onChange={(e) => setInviteFullName(e.target.value)}
                      placeholder="e.g. Ghost Sniper"
                      className="w-full rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.primary}22`, outline: 'none' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = `${C.primary}88`; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = `${C.primary}22`; }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendInvite(); }}
                    />
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Email Address <span style={{ color: C.primary }}>*</span>
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); setInviteEmailError(''); }}
                      placeholder="operative@email.com"
                      className="w-full rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 transition-all"
                      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${inviteEmailError ? C.primary : `${C.primary}22`}`, outline: 'none' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = `${C.primary}88`; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = inviteEmailError ? C.primary : `${C.primary}22`; }}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSendInvite(); }}
                    />
                  </div>
                  {inviteEmailError && (
                    <p className="text-xs font-bold" style={{ color: C.primary }}>{inviteEmailError}</p>
                  )}
                </div>

                {/* Role Selection */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Assign Role <span style={{ color: C.primary }}>*</span>
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full rounded-xl pl-11 pr-4 py-3 text-sm text-slate-100 appearance-none transition-all cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.primary}22`, outline: 'none' }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = `${C.primary}88`; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = `${C.primary}22`; }}
                    >
                      <option value="player" style={{ background: C.bgDark }}>Player</option>
                      <option value="moderator" style={{ background: C.bgDark }}>Moderator</option>
                      <option value="admin" style={{ background: C.bgDark }}>Admin</option>
                    </select>
                    <ArrowDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                {/* Info note */}
                <div
                  className="flex items-start gap-3 rounded-xl p-4 text-xs text-slate-400"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <Send className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: C.primary }} />
                  <span>
                    The recruit will receive an email from <span className="text-slate-200 font-bold">NeXa Esports</span> with their name
                    and a secure link to set their password and access the platform.
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 transition-colors hover:text-slate-200"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    onClick={() => handleCloseInviteDialog(false)}
                    disabled={sendingInvite}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={sendingInvite || !inviteFullName.trim() || !inviteEmail.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all"
                    style={{
                      background: (sendingInvite || !inviteFullName.trim() || !inviteEmail.trim()) ? 'rgba(236,19,30,0.4)' : C.primary,
                      boxShadow: sendingInvite ? 'none' : `0 4px 16px ${C.primary}4d`,
                      cursor: (sendingInvite || !inviteFullName.trim() || !inviteEmail.trim()) ? 'not-allowed' : 'pointer',
                    }}
                    onMouseEnter={(e) => { if (!sendingInvite) (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)'; }}
                    onClick={handleSendInvite}
                  >
                    {sendingInvite ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                        Sending…
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Send Invite
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};
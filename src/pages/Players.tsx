import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminPlayers } from '@/hooks/useAdminPlayers';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Search, Shield, Crown, ShieldCheck, UserCog, User, Share2, TrendingUp, ArrowDown } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';

type Player = Database['public']['Tables']['profiles']['Row'] & { email?: string | null };

/* ─────────────── Design Tokens ─────────────── */
const C = {
  primary: '#ec1313',
  bgDark:  '#1a0b0b',
  card:    '#2a1515',
  border:  'rgba(236,19,19,0.2)',
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
    case 'clan_master': return <Crown       className="w-3.5 h-3.5" style={{ color: '#a855f7' }} />;
    case 'admin':       return <ShieldCheck className="w-3.5 h-3.5" style={{ color: C.primary }} />;
    case 'moderator':   return <UserCog     className="w-3.5 h-3.5" style={{ color: '#eab308' }} />;
    default:            return <User        className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />;
  }
};

/* ─────────────── Player Card (read-only) ─────────────── */
const PlayerCard: React.FC<{
  player: Player;
  leaderboardRank?: number;
}> = ({ player, leaderboardRank }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState(false);

  const roleName =
    player.role === 'clan_master'
      ? 'Clan Master'
      : player.role.charAt(0).toUpperCase() + player.role.slice(1);

  return (
    <div
      className="relative overflow-hidden flex flex-col cursor-pointer"
      style={{
        ...glass,
        borderRadius: '20px',
        height: 440,
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: hovered ? `0 0 30px ${C.primary}4d` : '0 4px 24px rgba(0,0,0,0.4)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate(`/profile/${player.id}`)}
    >
      {/* Avatar area */}
      <div className="relative h-56 w-full overflow-hidden flex-shrink-0">
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
            <span className="w-2 h-2 rounded-full" style={{ background: '#22c55e', animation: 'pulse 2s infinite' }} />
            <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#22c55e' }}>
              Operational
            </span>
          </div>
          <h3 className="text-2xl font-black text-white italic leading-tight truncate">
            {getPlayerPrefix(player.status)}{player.ign}
          </h3>
        </div>
      </div>

      {/* Stats section */}
      <div className="p-5 flex flex-col justify-between flex-1">
        <div className="space-y-3">
          <div
            className="flex items-center justify-between pb-3"
            style={{ borderBottom: `1px solid ${C.border}` }}
          >
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Role</span>
            <div className="flex items-center gap-2" style={{ color: C.primary }}>
              <RoleIcon role={player.role} />
              <span className="text-xs font-bold italic">{roleName}</span>
              {player.grade && (
                <span className="text-[10px] font-black text-slate-400 ml-1">· {player.grade}</span>
              )}
            </div>
          </div>

          <div
            className="flex items-center justify-between pb-3"
            style={{ borderBottom: `1px solid ${C.border}` }}
          >
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

        <div className="mt-4 pt-4" style={{ borderTop: `1px solid ${C.border}` }}>
          <button
            className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            style={{ background: `${C.primary}1a`, border: `1px solid ${C.primary}33`, color: C.primary }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = C.primary;
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = `${C.primary}1a`;
              (e.currentTarget as HTMLButtonElement).style.color = C.primary;
            }}
            onClick={(e) => { e.stopPropagation(); navigate(`/profile/${player.id}`); }}
          >
            <Share2 className="w-3 h-3" />
            View Profile
          </button>
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
}> = ({ value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className="text-xs font-bold uppercase tracking-widest rounded-xl py-2.5 px-4 focus:outline-none cursor-pointer"
    style={{ ...glass, color: '#cbd5e1', border: `1px solid ${C.primary}1a`, appearance: 'none', paddingRight: '32px' }}
  >
    {options.map((o) => (
      <option key={o.value} value={o.value} style={{ background: C.bgDark }}>{o.label}</option>
    ))}
  </select>
);

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
export const Players: React.FC = () => {
  const { data: allPlayers, isLoading } = useAdminPlayers();
  const { data: leaderboardData }       = useLeaderboard();

  const [searchTerm,   setSearchTerm]   = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRole,   setFilterRole]   = useState('all');
  const [filterGrade,  setFilterGrade]  = useState('all');
  const [sortBy,       setSortBy]       = useState('kills');
  const [sortOrder,    setSortOrder]    = useState('desc');

  // Exclude banned players from the player-facing view
  const players = useMemo(() => (allPlayers || []).filter((p) => !p.is_banned), [allPlayers]);

  const leaderboardRankMap = useMemo(() => {
    const map = new Map<string, number>();
    leaderboardData?.forEach((e, i) => map.set(e.id, i + 1));
    return map;
  }, [leaderboardData]);

  const filteredPlayers = useMemo(
    () =>
      players
        .filter((p) => {
          const s = searchTerm.toLowerCase();
          const ok1 = p.username?.toLowerCase().includes(s) || p.ign?.toLowerCase().includes(s);
          const ok2 = filterRole   === 'all' || p.role  === filterRole;
          const ok3 = filterStatus === 'all' ||
                      (filterStatus === 'active' && p.status !== 'beta') ||
                      (filterStatus === 'beta'   && p.status === 'beta');
          const ok4 = filterGrade  === 'all' || p.grade === filterGrade;
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-14 h-14 rounded-full border-2 animate-spin"
            style={{ borderColor: `${C.primary} transparent transparent transparent` }}
          />
          <p className="text-slate-400 text-sm font-black uppercase tracking-widest">Loading players…</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: `radial-gradient(circle at center, ${C.card} 0%, ${C.bgDark} 100%)` }}
    >
      <div className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-8">

        {/* ── Page Header ── */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span
              className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
              style={{ background: `${C.primary}33`, color: C.primary }}
            >
              Active Roster
            </span>
            <span className="text-slate-500 text-sm">Season 14 Combat Log</span>
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-slate-100 uppercase">
            <span style={{ color: C.primary }}>Players</span>
          </h1>
          <p className="text-slate-400 max-w-md mt-2">
            Browse the full roster of NeXa Esports operatives, their stats, roles and rankings.
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard label="Total Members"     value={`${players.length}`}                   sub="Active clan members"       trend="up" />
          <StatCard label="Active Operatives" value={`${players.filter((p) => p.status !== 'beta').length}`} sub="Currently operational" trend="up" />
          <StatCard label="Beta Members"      value={`${players.filter((p) => p.status === 'beta').length}`} sub="Probation / beta access" />
        </div>

        {/* ── Filters ── */}
        <div className="p-4 rounded-2xl" style={{ background: `${C.card}66`, border: `1px solid ${C.primary}1a` }}>
          <div className="flex flex-wrap gap-3 mb-4">
            <FilterPill label="ALL UNITS" active={filterStatus === 'all'}    onClick={() => setFilterStatus('all')} />
            <FilterPill label="ACTIVE"    active={filterStatus === 'active'} onClick={() => setFilterStatus('active')} />
            <FilterPill label="BETA"      active={filterStatus === 'beta'}   onClick={() => setFilterStatus('beta')} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full py-2.5 pl-12 pr-4 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
                style={{ background: `${C.bgDark}80`, border: `1px solid ${C.primary}1a` }}
                placeholder="Search players by IGN or username…"
              />
            </div>

            <InlineSelect value={filterRole} onChange={setFilterRole} options={[
              { value: 'all',        label: 'All Roles' },
              { value: 'player',     label: 'Player' },
              { value: 'moderator',  label: 'Moderator' },
              { value: 'admin',      label: 'Admin' },
              { value: 'clan_master',label: 'Clan Master' },
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
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <Shield className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: C.primary }} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">
              No players found matching your criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

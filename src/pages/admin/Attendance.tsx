import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Database } from '@/integrations/supabase/types';
import {
  Search, UserCheck, UserX, Calendar, TrendingUp, Users,
  CheckCircle, XCircle, Download, CalendarDays, Trash2,
  Home, Gamepad2, Package, BarChart2, MessageSquare, Plus,
  Bell, ShoppingBag, Send, ChevronRight,
} from 'lucide-react';

type Player = Database['public']['Tables']['profiles']['Row'];
type AttendanceRecord = Database['public']['Tables']['attendance']['Row'] & {
  profiles: { username: string; ign: string; status: string } | null;
  events:   { name: string } | null;
};
type AttendanceMode = 'MP' | 'BR';

/* ─────────────── Design Tokens ─────────────── */
const C = {
  primary:  '#ec131e',
  bgDark:   '#120809',
  burgundy: '#411d21',
  sidebar:  '#1a0b0d',
  panel:    'rgba(25,12,14,0.6)',
};

const glass: React.CSSProperties = {
  background:  'rgba(255,255,255,0.03)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.05)',
  boxShadow: '0 8px 32px 0 rgba(0,0,0,0.3)',
};


/* ─────────────── Stat Card ─────────────── */
const StatCard: React.FC<{
  label: string;
  value: string | number;
  iconName: React.ReactNode;
  iconColor?: string;
}> = ({ label, value, iconName, iconColor = C.primary }) => (
  <div
    className="p-6 rounded-[32px] relative overflow-hidden group hover:bg-white/5 transition-all"
    style={glass}
  >
    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
    <div className="flex items-end justify-between mt-3">
      <h3 className="text-4xl font-bold text-white">{value}</h3>
      <div style={{ color: `${iconColor}4d` }} className="text-4xl">{iconName}</div>
    </div>
  </div>
);

/* ─────────────── Pill Toggle ─────────────── */
const PillToggle: React.FC<{
  options: string[];
  value: string;
  onChange: (v: string) => void;
}> = ({ options, value, onChange }) => (
  <div className="flex gap-2 bg-white/5 p-2 rounded-2xl border border-white/5">
    {options.map((opt) => (
      <button
        key={opt}
        onClick={() => onChange(opt)}
        className="px-8 py-2.5 rounded-xl font-bold text-sm transition-all"
        style={
          value === opt
            ? { background: C.primary, color: '#fff', boxShadow: `0 4px 12px ${C.primary}4d` }
            : { color: '#64748b' }
        }
        onMouseEnter={(e) => { if (value !== opt) (e.currentTarget as HTMLButtonElement).style.color = '#fff'; }}
        onMouseLeave={(e) => { if (value !== opt) (e.currentTarget as HTMLButtonElement).style.color = '#64748b'; }}
      >
        {opt}
      </button>
    ))}
  </div>
);

/* ═══════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════ */
export const AdminAttendance: React.FC = () => {
  const { profile }    = useAuth();
  const { toast }      = useToast();
  const queryClient    = useQueryClient();

  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>('MP');
  const [selectedLobby, setSelectedLobby]   = useState<number>(1);
  const [selectedDate,  setSelectedDate]    = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm,    setSearchTerm]      = useState('');
  const [roleFilter,    setRoleFilter]      = useState('all');
  const [killsInput,    setKillsInput]      = useState<{ [id: string]: number }>({});
  const [chatMessage,   setChatMessage]     = useState('');

  /* ── Queries ── */
  const { data: players = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('username');
      if (error) throw error;
      return data;
    },
  });

  const { data: rawAttendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance-raw', attendanceMode, selectedLobby],
    queryFn: async () => {
      const result = await (supabase as any)
        .from('attendance')
        .select('*')
        .eq('attendance_type', attendanceMode)
        .eq('lobby', selectedLobby)
        .order('created_at', { ascending: false });
      if (result.error) throw result.error;
      return result.data;
    },
  });

  const { data: profilesData } = useQuery({
    queryKey: ['attendance-profiles'],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from('profiles').select('id, username, ign, status');
      if (error) throw error;
      return data;
    },
  });

  const { data: eventsData } = useQuery({
    queryKey: ['attendance-events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('id, name');
      if (error) throw error;
      return data;
    },
  });

  const attendanceRecords: AttendanceRecord[] = (rawAttendanceData || []).map((record: any) => {
    const p  = profilesData?.find((x: any) => x.id === record.player_id);
    const ev = eventsData?.find((e: any) => e.id === record.event_id);
    return {
      ...record,
      profiles: p ? { username: p.username, ign: p.ign, status: p.status } : null,
      events:   ev ? { name: ev.name } : null,
    };
  });

  /* ── Mutations ── */
  const invalidate = () => {
    ['attendance', 'attendance-raw', 'players', 'admin-players', 'profile', 'player-stats', 'weekly-leaderboard']
      .forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
  };

  const markAttendanceMutation = useMutation({
    mutationFn: async ({
      playerId, status, kills, lobby,
    }: { playerId: string; status: 'present' | 'absent'; kills?: number; lobby: number }) => {
      try {
        const { data, error } = await supabase
          .from('attendance')
          .insert({
            player_id:       playerId,
            status,
            attendance_type: attendanceMode,
            date:            selectedDate,
            event_kills:     kills || 0,
            br_kills:        attendanceMode === 'BR' ? (kills || 0) : 0,
            mp_kills:        attendanceMode === 'MP' ? (kills || 0) : 0,
            lobby,
          })
          .select();
        if (error) throw error;
        return data?.[0];
      } catch (error: any) {
        if (error.code === '23505') {
          toast({ title: 'Attendance Already Marked', description: 'Already marked for this lobby and mode.', variant: 'destructive' });
          return null;
        }
        throw error;
      }
    },
    onSuccess: (data) => { if (data) invalidate(); },
  });

  const undoAttendanceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('attendance').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Attendance record removed', description: 'The selected attendance record has been undone.' });
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.message || 'Failed to reset attendance.', variant: 'destructive' });
    },
  });

  const handleMarkAttendance = async (
    playerId: string, playerIgn: string, status: 'present' | 'absent', kills?: number
  ) => {
    try {
      const newRecord = await markAttendanceMutation.mutateAsync({ playerId, status, kills, lobby: selectedLobby });
      if (newRecord) {
        toast({
          title: 'Attendance Marked',
          description: `${playerIgn} → ${status} (${kills || 0} kills) — ${attendanceMode} Lobby ${selectedLobby}`,
        });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to mark attendance', variant: 'destructive' });
    }
  };

  const exportData = (fmt: 'csv' | 'xlsx') => {
    toast({ title: 'Export Started', description: `Exporting as ${fmt.toUpperCase()}…` });
  };

  const scrollToPlayer = (ign: string) => {
    const el = document.getElementById(`player-${ign}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.style.background = `${C.primary}1a`;
      setTimeout(() => (el.style.background = ''), 2000);
    }
  };

  const filteredPlayers = players.filter((p) => {
    const matchSearch = p.ign.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole   = roleFilter === 'all' || p.role === roleFilter;
    return matchSearch && matchRole && !p.is_banned;
  });

  const filteredRecords = attendanceRecords.filter((r) =>
    r.profiles?.ign?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgAttendance = players.length > 0
    ? Math.round(players.reduce((s, p) => s + (p.attendance || 0), 0) / players.length)
    : 0;

  const presentCount = attendanceRecords.filter((r) => r.status === 'present').length;
  const absentCount  = attendanceRecords.filter((r) => r.status === 'absent').length;

  const getPlayerPrefix = (status?: string | null) => status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂';

  /* ── Inline styles ── */
  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,0,0,0.4)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '13px',
    color: '#f1f5f9',
    outline: 'none',
  };

  return (
    <div
      className="rounded-2xl p-3 sm:p-4 md:p-6"
      style={{
        background: `linear-gradient(135deg, ${C.burgundy}66 0%, ${C.bgDark}66 100%)`,
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
   

      {/* ══════════ MAIN CONTENT ══════════ */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="mb-4 sm:mb-6 px-1">
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Attendance Management</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Track player presence, kill records, and attendance activity across MP and BR lobbies.
          </p>
        </div>
        

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6 space-y-5 sm:space-y-6 lg:space-y-8"
          style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.primary}33 transparent` }}
        >
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            <StatCard label="Total Players"    value={players.length} iconName={<Users className="w-8 h-8" />} />
            <StatCard label="Avg Attendance"   value={`${avgAttendance}%`} iconName={<BarChart2 className="w-8 h-8" />} />
            <StatCard label="Present Records"  value={presentCount} iconName={<CheckCircle className="w-8 h-8" />} iconColor="#22c55e" />
            <StatCard label="Absent Records"   value={absentCount}  iconName={<XCircle className="w-8 h-8" />} />
          </div>

          {/* ── Mode + Lobby + Filters Row ── */}
          <div className="flex flex-col gap-6">
            {/* Mode + Lobby toggles */}
            <div
              className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 p-2 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <PillToggle
                options={['MP', 'BR']}
                value={attendanceMode}
                onChange={(v) => setAttendanceMode(v as AttendanceMode)}
              />
              <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto hide-scrollbar">
                {[1, 2, 3, 4].map((lobby) => (
                  <button
                    key={lobby}
                    onClick={() => setSelectedLobby(lobby)}
                    className="px-4 sm:px-5 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0"
                    style={
                      selectedLobby === lobby
                        ? { background: 'rgba(255,255,255,0.15)', color: '#fff' }
                        : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }
                    }
                    onMouseEnter={(e) => { if (selectedLobby !== lobby) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'; }}
                    onMouseLeave={(e) => { if (selectedLobby !== lobby) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                  >
                    Lobby {lobby}
                  </button>
                ))}
              </div>
            </div>

            {/* Search + Date + role filter + exports */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 px-1 sm:px-2">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 min-w-0">
                <div
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Search className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search players by IGN..."
                    className="bg-transparent border-none outline-none text-sm w-full min-w-0"
                    style={{ color: '#f1f5f9' }}
                  />
                </div>

                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="text-sm font-medium bg-transparent border-none outline-none"
                    style={{ color: '#f1f5f9', colorScheme: 'dark' }}
                  />
                  <button
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    className="text-xs font-bold ml-1 transition-colors hover:text-white"
                    style={{ color: C.primary }}
                  >
                    Today
                  </button>
                </div>

                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <select
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                    className="text-sm font-medium bg-transparent border-none outline-none cursor-pointer"
                    style={{ color: '#f1f5f9', appearance: 'none' }}
                  >
                    <option value="all" style={{ background: C.bgDark }}>All Roles</option>
                    <option value="player" style={{ background: C.bgDark }}>Player</option>
                    <option value="moderator" style={{ background: C.bgDark }}>Moderator</option>
                    <option value="admin" style={{ background: C.bgDark }}>Admin</option>
                    <option value="clan_master" style={{ background: C.bgDark }}>Clan Master</option>
                  </select>
                  <ChevronRight className="w-4 h-4 text-slate-400 rotate-90" />
                </div>
              </div>

              <div className="flex items-center gap-2 self-start xl:self-auto">
                <button
                  onClick={() => exportData('csv')}
                  className="p-2.5 rounded-xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  title="Export CSV"
                >
                  <Download className="w-5 h-5" />
                </button>
                <button
                  onClick={() => exportData('xlsx')}
                  className="p-2.5 rounded-xl transition-all"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.05)', color: '#64748b' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  title="Export Excel"
                >
                  <BarChart2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Main Attendance Table ── */}
          <section className="rounded-[32px] overflow-hidden" style={glass}>
            {/* Section Header */}
            <div
              className="p-4 sm:p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
            >
              <div>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white tracking-tight">
                  {attendanceMode} Lobby {selectedLobby} Attendance
                </h2>
                <p className="text-slate-500 text-sm font-medium mt-1">
                  {new Date(selectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {' • '}
                  {filteredPlayers.length} Players Scheduled
                </p>
              </div>
              <button
                className="px-5 sm:px-8 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm text-white transition-all w-full sm:w-auto"
                style={{ background: C.primary, boxShadow: `0 8px 24px ${C.primary}4d` }}
                onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
              >
                Submit Final Record
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: `${C.primary}33 transparent` }}>
              <table className="w-full">
                <thead className="sticky top-0 z-10" style={{ background: 'rgba(18,8,9,0.9)', backdropFilter: 'blur(12px)' }}>
                  <tr className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-black">
                    <th className="px-8 py-6 text-left">Player Username</th>
                    <th className="px-8 py-6 text-center">Attendance %</th>
                    <th className="px-8 py-6 text-center">Kill Records</th>
                    <th className="px-8 py-6 text-center">Proof</th>
                    <th className="px-8 py-6 text-right">Status Control</th>
                  </tr>
                </thead>
                <tbody style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {playersLoading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full border-2 animate-spin"
                            style={{ borderColor: `${C.primary} transparent transparent transparent` }}
                          />
                          <span className="text-slate-500 text-sm">Loading operatives…</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPlayers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center text-slate-500">
                        No operatives found
                      </td>
                    </tr>
                  ) : (
                    filteredPlayers.map((player) => {
                      const attendedRecord = attendanceRecords.find(
                        (r) => r.player_id === player.id && r.date === selectedDate
                      );
                      const isPresent = attendedRecord?.status === 'present';
                      const isAbsent  = attendedRecord?.status === 'absent';

                      return (
                        <tr
                          key={player.id}
                          id={`player-${player.ign}`}
                          className="group transition-colors"
                          style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                        >
                          {/* Player */}
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-4">
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden"
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                              >
                                {player.avatar_url ? (
                                  <img src={player.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-sm font-black" style={{ color: C.primary }}>
                                    {player.ign?.charAt(0)?.toUpperCase()}
                                  </span>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-200">
                                  {getPlayerPrefix((player as any).status)}{player.ign}
                                </p>
                                <p
                                  className="text-[10px] font-black uppercase tracking-widest mt-0.5"
                                  style={{ color: player.grade ? C.primary : '#64748b' }}
                                >
                                  {player.grade || player.role}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Attendance % */}
                          <td className="px-8 py-5 text-center">
                            <span className="text-lg font-bold text-slate-300">
                              {player.attendance || 0}%
                            </span>
                          </td>

                          {/* Kills input */}
                          <td className="px-8 py-5">
                            <div className="flex justify-center">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={killsInput[player.id] || ''}
                                onChange={(e) =>
                                  setKillsInput((prev) => ({ ...prev, [player.id]: Number(e.target.value) }))
                                }
                                style={{ ...inputStyle, width: '80px', textAlign: 'center' }}
                                onFocus={(e) => ((e.target as HTMLInputElement).style.boxShadow = `0 0 0 1px ${C.primary}80`)}
                                onBlur={(e)  => ((e.target as HTMLInputElement).style.boxShadow = 'none')}
                              />
                            </div>
                          </td>

                          {/* Proof */}
                          <td className="px-8 py-5 text-center">
                            {(attendedRecord as any)?.verification_url ? (
                              <button
                                onClick={() => window.open((attendedRecord as any).verification_url, '_blank')}
                                className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-600 font-bold uppercase">No Proof</span>
                            )}
                          </td>

                          {/* Present / Absent toggle */}
                          <td className="px-8 py-5 text-right">
                            <div
                              className="inline-flex gap-1 p-1 rounded-xl"
                              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)' }}
                            >
                              <button
                                onClick={() => handleMarkAttendance(player.id, player.ign, 'present', killsInput[player.id] || 0)}
                                disabled={markAttendanceMutation.isPending}
                                className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                                style={
                                  isPresent
                                    ? { background: 'rgba(34,197,94,0.2)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }
                                    : { color: '#475569' }
                                }
                                onMouseEnter={(e) => { if (!isPresent) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                                onMouseLeave={(e) => { if (!isPresent) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                              >
                                Present
                              </button>
                              <button
                                onClick={() => handleMarkAttendance(player.id, player.ign, 'absent')}
                                disabled={markAttendanceMutation.isPending}
                                className="px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                                style={
                                  isAbsent
                                    ? { background: `${C.primary}33`, color: C.primary, border: `1px solid ${C.primary}4d` }
                                    : { color: '#475569' }
                                }
                                onMouseEnter={(e) => { if (!isAbsent) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}
                                onMouseLeave={(e) => { if (!isAbsent) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                              >
                                Absent
                              </button>
                              {attendedRecord && (
                                <button
                                  onClick={() => undoAttendanceMutation.mutate(attendedRecord.id)}
                                  disabled={undoAttendanceMutation.isPending}
                                  className="px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all"
                                  style={{ color: '#94a3b8' }}
                                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)')}
                                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
                                >
                                  Undo
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Recent Records Table ── */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Recent {attendanceMode} Records</h2>
              <button
                className="text-sm font-black uppercase tracking-widest underline decoration-2 underline-offset-4 transition-colors hover:text-white"
                style={{ color: C.primary }}
              >
                See More
              </button>
            </div>

            <div className="rounded-[32px] overflow-hidden" style={glass}>
              <table className="w-full text-left">
                <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                  <tr className="text-slate-500 text-[10px] uppercase tracking-widest font-black">
                    <th className="px-8 py-4">Player</th>
                    <th className="px-8 py-4">Event Details</th>
                    <th className="px-8 py-4 text-center">Date</th>
                    <th className="px-8 py-4 text-center">Proof</th>
                    <th className="px-8 py-4 text-center">Status</th>
                    <th className="px-8 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLoading ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-slate-500">
                        Loading records…
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-8 py-12 text-center text-slate-500">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.slice(-10).reverse().map((record) => (
                      <tr
                        key={record.id}
                        className="transition-all"
                        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.03)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')}
                      >
                        {/* Player */}
                        <td
                          className="px-8 py-4 cursor-pointer transition-colors"
                          style={{ color: '#94a3b8' }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLTableCellElement).style.color = C.primary)}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLTableCellElement).style.color = '#94a3b8')}
                          onClick={() => scrollToPlayer(record.profiles?.ign || '')}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#64748b' }}
                            >
                              {record.profiles?.ign?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="font-bold text-sm text-slate-200">
                              {record.profiles
                                ? `${getPlayerPrefix(record.profiles.status)}${record.profiles.ign}`
                                : 'Unknown'}
                            </span>
                          </div>
                        </td>

                        {/* Event */}
                        <td className="px-8 py-4 text-sm text-slate-400">
                          {record.events?.name || `${attendanceMode} Session`}
                        </td>

                        {/* Date */}
                        <td className="px-8 py-4 text-center text-sm text-slate-500">
                          {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>

                        {/* Proof */}
                        <td className="px-8 py-4 text-center">
                          {(record as any).verification_url && (
                             <Download className="w-4 h-4 text-slate-500 mx-auto cursor-pointer" onClick={() => window.open((record as any).verification_url, '_blank')} />
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-8 py-4 text-center">
                          <span
                            className="px-3 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider"
                            style={
                              record.status === 'present'
                                ? { background: 'rgba(34,197,94,0.1)',  color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }
                                : { background: `${C.primary}1a`, color: C.primary,  border: `1px solid ${C.primary}33` }
                            }
                          >
                            {record.status === 'present' ? 'Present' : 'Absent'}
                          </span>
                        </td>

                        {/* Reset action */}
                        <td className="px-8 py-4 text-right">
                          <button
                            onClick={() => undoAttendanceMutation.mutate(record.id)}
                            className="text-[10px] font-black uppercase tracking-widest transition-all hover:text-white"
                            style={{ color: '#475569' }}
                          >
                            Reset
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
      </div>
      </main>
    </div>
  );
};
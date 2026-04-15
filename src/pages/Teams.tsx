import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams } from '@/hooks/useTeams';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCompetitive } from '@/hooks/useCompetitive';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Search, Users, Shield, Medal, Hash } from 'lucide-react';

const PRIMARY = '#ec131e';

const rankBadgeStyle = (rank: number): React.CSSProperties => {
  if (rank === 1) return { background: '#FFD70022', color: '#FFD700', border: '1px solid #FFD70055' };
  if (rank === 2) return { background: '#C0C0C022', color: '#C0C0C0', border: '1px solid #C0C0C055' };
  if (rank === 3) return { background: '#CD7F3222', color: '#CD7F32', border: '1px solid #CD7F3255' };
  return { background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' };
};

export const Teams: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const { teams, myTeam, joinTeam, joinTeamByCode, isLoading } = useTeams();
  const { seasonLeaderboard, activeSeason } = useCompetitive();
  const [search, setSearch] = useState('');
  const [joiningCode, setJoiningCode] = useState(false);

  const filtered = useMemo(
    () =>
      teams.filter(
        (team) =>
          team.name.toLowerCase().includes(search.toLowerCase()) ||
          team.tag.toLowerCase().includes(search.toLowerCase()) ||
          (team.invite_code || '').toLowerCase().includes(search.toLowerCase()),
      ),
    [teams, search],
  );

  const seasonStandings = useMemo(() => {
    const map = new Map<string, { rank: number; points: number }>();
    for (const entry of seasonLeaderboard.filter((row) => row.season_id === activeSeason?.id)) {
      map.set(entry.team_id, { rank: entry.rank, points: entry.season_points });
    }
    return map;
  }, [seasonLeaderboard, activeSeason?.id]);

  const joinDisabledReason = profile?.is_banned
    ? 'Banned players cannot join teams.'
    : myTeam
      ? 'You are already in a team. Leave your current team first.'
      : '';

  const canJoin = !profile?.is_banned && !myTeam;

  const handleJoin = async (teamId: string) => {
    try {
      await joinTeam(teamId);
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : 'Failed to join team';
      toast({ title: 'Error', description, variant: 'destructive' });
    }
  };

  const handleJoinByCode = async () => {
    setJoiningCode(true);
    try {
      const team = await joinTeamByCode(search.trim());
      toast({ title: 'Joined team', description: `You joined ${team.name}.` });
      navigate(`/teams/${team.id}`);
    } catch (error: unknown) {
      const description = error instanceof Error ? error.message : 'Invalid invite code.';
      toast({ title: 'Join by code failed', description, variant: 'destructive' });
    } finally {
      setJoiningCode(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-2xl font-bold tracking-wider text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              TEAMS
            </h1>
          </div>
          <Button
            onClick={() => navigate('/teams/create')}
            disabled={!!myTeam}
            style={{ background: PRIMARY, color: '#fff' }}
            className="rounded-xl gap-2"
            title={myTeam ? 'Leave your current team before creating a new one.' : undefined}
          >
            <Plus className="w-4 h-4" />
            Create Team
          </Button>
        </div>

        {myTeam && (
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: `${PRIMARY}15`,
              border: `1px solid ${PRIMARY}44`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: PRIMARY }}>
              <Shield className="w-4 h-4" />
              My Team
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {myTeam.logo_url ? (
                  <img src={myTeam.logo_url} alt={myTeam.name} className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black"
                    style={{ background: `${PRIMARY}22`, color: PRIMARY, fontFamily: 'Orbitron, sans-serif' }}
                  >
                    {myTeam.tag}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {myTeam.name}
                  </h2>
                  <p className="text-sm" style={{ color: PRIMARY }}>
                    [{myTeam.tag}]
                  </p>
                </div>
              </div>
              <Button onClick={() => navigate(`/teams/${myTeam.id}`)} className="rounded-xl" style={{ background: PRIMARY, color: '#fff' }}>
                View Team
              </Button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search teams by name/tag or enter invite code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
        </div>

        {search.trim().length >= 6 && (
          <Button
            onClick={handleJoinByCode}
            disabled={!canJoin || joiningCode}
            className="rounded-xl"
            style={canJoin ? { background: `${PRIMARY}`, color: '#fff' } : { background: 'rgba(255,255,255,0.08)', color: '#64748b' }}
            title={canJoin ? 'Join a team with this invite code.' : joinDisabledReason}
          >
            <Hash className="w-4 h-4 mr-2" />
            {joiningCode ? 'Joining...' : 'Join by Code'}
          </Button>
        )}

        {!canJoin && (
          <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2">
            {joinDisabledReason}
          </p>
        )}

        {isLoading ? (
          <div className="text-center py-16 text-slate-500">Loading teams...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-slate-500">No teams found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((team) => {
              const isMyTeam = myTeam?.id === team.id;
              const standing = seasonStandings.get(team.id);
              return (
                <div
                  key={team.id}
                  className="rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all hover:scale-[1.01]"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${isMyTeam ? PRIMARY + '44' : 'rgba(255,255,255,0.08)'}`,
                  }}
                  onClick={() => navigate(`/teams/${team.id}`)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                        style={{ background: `${PRIMARY}22`, color: PRIMARY, fontFamily: 'Orbitron, sans-serif' }}
                      >
                        {team.tag}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="font-bold text-white truncate">{team.name}</h3>
                      <p className="text-xs" style={{ color: PRIMARY }}>[{team.tag}]</p>
                      <p className="text-[11px] text-slate-400">{team.member_count ?? 0} members</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {standing && (
                      <div className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold" style={rankBadgeStyle(standing.rank)}>
                        <Medal className="w-3 h-3" />
                        #{standing.rank}
                      </div>
                    )}

                    {!isMyTeam ? (
                      <Button
                        size="sm"
                        disabled={!canJoin}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (canJoin) void handleJoin(team.id);
                        }}
                        className="rounded-xl shrink-0"
                        title={canJoin ? 'Join this team' : joinDisabledReason}
                        style={canJoin ? { background: PRIMARY, color: '#fff' } : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }}
                      >
                        Join
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: `${PRIMARY}22`, color: PRIMARY }}>
                        Your Team
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

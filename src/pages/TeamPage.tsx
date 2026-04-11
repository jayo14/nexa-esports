import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams } from '@/hooks/useTeams';
import { useCompetitive } from '@/hooks/useCompetitive';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Team, TeamMember } from '@/types/competitive';
import {
  ArrowLeft,
  MessageSquare,
  LogOut,
  UserMinus,
  Trophy,
  Crown,
  Loader2,
  UserPlus,
  CheckSquare,
} from 'lucide-react';

const PRIMARY = '#ec131e';

export const TeamPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { myTeam, myMembership, leaveTeam, kickMember } = useTeams();
  const { seasonLeaderboard, activeSeason } = useCompetitive() as {
    seasonLeaderboard?: Array<{ team_id: string; rank: number; season_points: number; season_kills: number }>;
    activeSeason?: { name: string } | null;
  };

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [players, setPlayers] = useState<Array<{ id: string; ign: string | null; username: string | null; avatar_url: string | null; is_banned?: boolean | null }>>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);

  const isMine = myTeam?.id === teamId;
  const isCaptain = isMine && myMembership?.role === 'captain';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'clan_master';

  useEffect(() => {
    if (!teamId) return;
    const fetch = async () => {
      setLoading(true);
      const [{ data: teamData }, { data: memberData }] = await Promise.all([
        supabase.from('teams').select('*').eq('id', teamId).single(),
        supabase
          .from('team_members')
          .select('*, profile:profiles(username, ign, avatar_url, tier)')
          .eq('team_id', teamId)
          .order('role', { ascending: true }),
      ]);
      setTeam(teamData as Team);
      setMembers((memberData as unknown as TeamMember[]) || []);
      setLoading(false);
    };
    fetch();
  }, [teamId]);

  useEffect(() => {
    if (!isAdmin || !teamId) return;
    const fetchAssignablePlayers = async () => {
      setPlayersLoading(true);
      const [{ data: profilesData, error: profilesError }, { data: membersData, error: membersError }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, ign, username, avatar_url, is_banned')
          .order('username', { ascending: true }),
        supabase
          .from('team_members')
          .select('user_id, team_id'),
      ]);

      if (profilesError || membersError) {
        toast({
          title: 'Error',
          description: profilesError?.message || membersError?.message || 'Failed to load players',
          variant: 'destructive',
        });
        setPlayersLoading(false);
        return;
      }

      const memberships = (membersData as Array<{ user_id: string; team_id: string }> | null) || [];
      const membershipMap = new Map(memberships.map((m) => [m.user_id, m.team_id]));
      const availablePlayers = ((profilesData as Array<{ id: string; ign: string | null; username: string | null; avatar_url: string | null; is_banned?: boolean | null }> | null) || [])
        .filter((p) => !p.is_banned)
        .filter((p) => !membershipMap.has(p.id));

      setPlayers(availablePlayers);
      setPlayersLoading(false);
    };
    fetchAssignablePlayers();
  }, [isAdmin, teamId, toast]);

  const seasonStats = (seasonLeaderboard ?? []).find((s) => s.team_id === teamId);

  const handleLeave = async () => {
    setActionLoading(true);
    try {
      await leaveTeam();
      navigate('/teams');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleKick = async (userId: string) => {
    setActionLoading(true);
    try {
      await kickMember(userId);
      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId]
    );
  };

  const handleAssignPlayers = async () => {
    if (!teamId || selectedPlayerIds.length === 0) return;
    setActionLoading(true);
    try {
      const rows = selectedPlayerIds.map((id) => ({
        team_id: teamId,
        user_id: id,
        role: 'member' as const,
      }));

      const { error } = await supabase
        .from('team_members')
        .insert(rows);

      if (error) throw error;

      const { data: memberData } = await supabase
        .from('team_members')
        .select('*, profile:profiles(username, ign, avatar_url, tier)')
        .eq('team_id', teamId)
        .order('role', { ascending: true });

      setMembers((memberData as unknown as TeamMember[]) || []);
      setPlayers((prev) => prev.filter((p) => !selectedPlayerIds.includes(p.id)));
      setSelectedPlayerIds([]);
      toast({ title: 'Players Added', description: 'Selected players were assigned to this team.' });
    } catch (err: any) {
      toast({ title: 'Assign Failed', description: err.message || 'Could not assign players.', variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0a0a0a' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: PRIMARY }} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4" style={{ background: '#0a0a0a' }}>
        <p className="text-slate-400">Team not found.</p>
        <Button onClick={() => navigate('/teams')} style={{ background: PRIMARY, color: '#fff' }}>
          Back to Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teams')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            TEAM DASHBOARD
          </h1>
        </div>

        {/* Team Card */}
        <div
          className="rounded-2xl p-6 space-y-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-4">
            {team.logo_url ? (
              <img src={team.logo_url} alt={team.name} className="w-16 h-16 rounded-xl object-cover" />
            ) : (
              <div
                className="w-16 h-16 rounded-xl flex items-center justify-center text-xl font-black"
                style={{ background: `${PRIMARY}22`, color: PRIMARY, fontFamily: 'Orbitron, sans-serif' }}
              >
                {team.tag}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                {team.name}
              </h2>
              <p className="font-bold" style={{ color: PRIMARY }}>
                [{team.tag}]
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            {isMine && (
              <Button
                onClick={() => navigate(`/teams/${team.id}/chat`)}
                className="rounded-xl gap-2"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                <MessageSquare className="w-4 h-4" />
                Team Chat
              </Button>
            )}
            {isMine && (
              <Button
                variant="outline"
                onClick={handleLeave}
                disabled={actionLoading}
                className="rounded-xl gap-2 border-red-500/30 text-red-400 hover:text-red-300"
              >
                <LogOut className="w-4 h-4" />
                Leave Team
              </Button>
            )}
          </div>
        </div>

        {/* Season Stats */}
        {activeSeason && (
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: `${PRIMARY}10`,
              border: `1px solid ${PRIMARY}33`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: PRIMARY }}>
              <Trophy className="w-4 h-4" />
              {activeSeason.name} — Current Standing
            </div>
            {seasonStats ? (
              <div className="flex gap-6">
                <div className="text-center">
                  <p className="text-2xl font-black text-white">#{seasonStats.rank}</p>
                  <p className="text-xs text-slate-400">Rank</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{seasonStats.season_points}</p>
                  <p className="text-xs text-slate-400">Points</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-black text-white">{seasonStats.season_kills}</p>
                  <p className="text-xs text-slate-400">Kills</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No results yet this season.</p>
            )}
          </div>
        )}

        {/* Members */}
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">
            Members ({members.length})
          </h3>
          <div className="space-y-3">
            {members.map((m) => {
              const p = m.profile;
              const isMe = m.user_id === user?.id;
              return (
                <div key={m.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={(p as any)?.avatar_url || '/placeholder.svg'}
                      alt={(p as any)?.username}
                      className="w-10 h-10 rounded-full object-cover"
                      style={{ border: `2px solid ${m.role === 'captain' ? PRIMARY : 'rgba(255,255,255,0.1)'}` }}
                    />
                    <div>
                      <p className="font-semibold text-white text-sm">
                        {m.role === 'captain' && (
                          <Crown className="w-3 h-3 inline mr-1" style={{ color: PRIMARY }} />
                        )}
                        {(p as any)?.ign || (p as any)?.username || 'Unknown'}
                      </p>
                      <p className="text-xs capitalize" style={{ color: m.role === 'captain' ? PRIMARY : '#64748b' }}>
                        {m.role}
                      </p>
                    </div>
                  </div>
                  {isCaptain && !isMe && (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={actionLoading}
                      onClick={() => handleKick(m.user_id)}
                      className="text-red-400 hover:text-red-300 rounded-xl gap-1"
                    >
                      <UserMinus className="w-3 h-3" />
                      Kick
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isAdmin && (
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{
              background: 'rgba(255,255,255,0.03)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Add Players to Team</h3>
              <Button
                onClick={handleAssignPlayers}
                disabled={actionLoading || selectedPlayerIds.length === 0}
                className="rounded-xl gap-2"
                style={{ background: PRIMARY, color: '#fff' }}
              >
                <UserPlus className="w-4 h-4" />
                Assign to Team ({selectedPlayerIds.length})
              </Button>
            </div>

            {playersLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: PRIMARY }} />
              </div>
            ) : players.length === 0 ? (
              <p className="text-slate-500 text-sm">No available players to assign.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {players.map((player) => {
                  const selected = selectedPlayerIds.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => togglePlayerSelection(player.id)}
                      className="rounded-xl p-3 text-left transition-all"
                      style={{
                        background: selected ? `${PRIMARY}20` : 'rgba(255,255,255,0.04)',
                        border: selected ? `1px solid ${PRIMARY}99` : '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={player.avatar_url || '/placeholder.svg'}
                          alt={player.username || player.ign || 'Player'}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-white font-semibold text-sm truncate">{player.ign || player.username || 'Unknown'}</p>
                          <p className="text-slate-400 text-xs truncate">@{player.username || 'unknown'}</p>
                        </div>
                        <CheckSquare className="w-4 h-4" style={{ color: selected ? PRIMARY : '#64748b' }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

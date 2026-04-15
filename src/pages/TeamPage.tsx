import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTeams } from '@/hooks/useTeams';
import { useCompetitive } from '@/hooks/useCompetitive';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  BarChart3,
  Pencil,
  Shuffle,
  Copy,
} from 'lucide-react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const PRIMARY = '#ec131e';

type ProfileLite = {
  username?: string;
  ign?: string;
  avatar_url?: string;
  tier?: string;
};

type AssignablePlayer = {
  id: string;
  ign: string | null;
  username: string | null;
  avatar_url: string | null;
  is_banned?: boolean | null;
};

type TeamMemberWithProfile = TeamMember & {
  profile?: ProfileLite;
};

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const TeamPage: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { myTeam, myMembership, leaveTeam, kickMember } = useTeams();
  const { seasonLeaderboard, activeSeason, matchDayTeamScores, playerSeasonStats } = useCompetitive();

  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<TeamMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [players, setPlayers] = useState<AssignablePlayer[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editTag, setEditTag] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState('');

  const isMine = myTeam?.id === teamId;
  const isCaptain = isMine && myMembership?.role === 'captain';
  const isAdmin = profile?.role === 'admin' || profile?.role === 'clan_master';
  const canEditTeam = isCaptain || isAdmin;

  useEffect(() => {
    if (!teamId) return;
    const fetchTeamData = async () => {
      setLoading(true);
      const [{ data: teamData }, { data: memberData }] = await Promise.all([
        supabase.from('teams').select('*').eq('id', teamId).single(),
        supabase
          .from('team_members')
          .select('*, profile:profiles(username, ign, avatar_url, tier)')
          .eq('team_id', teamId)
          .order('role', { ascending: true }),
      ]);

      setTeam((teamData as Team) || null);
      setMembers(((memberData as TeamMemberWithProfile[]) || []));

      if (teamData) {
        const teamRow = teamData as Team;
        setEditName(teamRow.name);
        setEditTag(teamRow.tag);
        setEditLogoUrl(teamRow.logo_url || '');
      }
      setLoading(false);
    };
    void fetchTeamData();
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
          description: profilesError?.message || membersError?.message || 'Failed to load players.',
          variant: 'destructive',
        });
        setPlayersLoading(false);
        return;
      }

      const memberships = ((membersData as Array<{ user_id: string; team_id: string }> | null) || []);
      const membershipMap = new Map(memberships.map((item) => [item.user_id, item.team_id]));
      const availablePlayers = (((profilesData as AssignablePlayer[] | null) || [])
        .filter((player) => !player.is_banned)
        .filter((player) => !membershipMap.has(player.id)));

      setPlayers(availablePlayers);
      setPlayersLoading(false);
    };
    void fetchAssignablePlayers();
  }, [isAdmin, teamId, toast]);

  const seasonStats = useMemo(
    () => seasonLeaderboard.find((entry) => entry.team_id === teamId && entry.season_id === activeSeason?.id),
    [seasonLeaderboard, teamId, activeSeason?.id],
  );

  const matchDayChartData = useMemo(
    () =>
      matchDayTeamScores
        .filter((entry) => entry.team_id === teamId && entry.season_id === activeSeason?.id)
        .sort((a, b) => new Date(a.match_date).getTime() - new Date(b.match_date).getTime())
        .map((entry) => ({
          matchDay: entry.match_day_name,
          points: entry.team_total_pts,
        })),
    [matchDayTeamScores, teamId, activeSeason?.id],
  );

  const memberStats = useMemo(() => {
    const seasonMemberStats = playerSeasonStats
      .filter((entry) => entry.season_id === activeSeason?.id)
      .filter((entry) => members.some((member) => member.user_id === entry.user_id));

    return members
      .map((member) => {
        const stats = seasonMemberStats.find((entry) => entry.user_id === member.user_id);
        return {
          member,
          points: stats?.season_points || 0,
          kills: stats?.season_kills || 0,
          lobbies: stats?.lobbies_played || 0,
        };
      })
      .sort((a, b) => b.points - a.points);
  }, [members, playerSeasonStats, activeSeason?.id]);

  const handleLeave = async () => {
    setActionLoading(true);
    try {
      await leaveTeam();
      navigate('/teams');
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error, 'Could not leave team.'), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleKick = async (userId: string) => {
    setActionLoading(true);
    try {
      await kickMember(userId);
      setMembers((prev) => prev.filter((member) => member.user_id !== userId));
    } catch (error: unknown) {
      toast({ title: 'Error', description: getErrorMessage(error, 'Could not kick member.'), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const transferCaptaincy = async (newCaptainId: string) => {
    if (!team || !user?.id) return;
    setActionLoading(true);
    try {
      await supabase
        .from('team_members')
        .update({ role: 'member' })
        .eq('user_id', user.id)
        .eq('team_id', team.id);

      await supabase
        .from('team_members')
        .update({ role: 'captain' })
        .eq('user_id', newCaptainId)
        .eq('team_id', team.id);

      const { data: memberData } = await supabase
        .from('team_members')
        .select('*, profile:profiles(username, ign, avatar_url, tier)')
        .eq('team_id', team.id)
        .order('role', { ascending: true });
      setMembers((memberData as TeamMemberWithProfile[]) || []);
      toast({ title: 'Captain transferred', description: 'Captaincy was transferred successfully.' });
    } catch (error: unknown) {
      toast({ title: 'Transfer failed', description: getErrorMessage(error, 'Could not transfer captaincy.'), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateTeam = async () => {
    if (!team) return;
    if (!editName.trim() || !editTag.trim()) {
      toast({ title: 'Validation', description: 'Name and tag are required.', variant: 'destructive' });
      return;
    }
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: editName.trim(),
          tag: editTag.trim().toUpperCase(),
          logo_url: editLogoUrl.trim() || null,
        })
        .eq('id', team.id);
      if (error) throw error;

      setTeam((prev) =>
        prev
          ? {
              ...prev,
              name: editName.trim(),
              tag: editTag.trim().toUpperCase(),
              logo_url: editLogoUrl.trim() || undefined,
            }
          : prev,
      );
      setIsEditOpen(false);
      toast({ title: 'Team updated', description: 'Team details updated successfully.' });
    } catch (error: unknown) {
      toast({ title: 'Update failed', description: getErrorMessage(error, 'Could not update team.'), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const togglePlayerSelection = (playerId: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(playerId) ? prev.filter((id) => id !== playerId) : [...prev, playerId],
    );
  };

  const handleAssignPlayers = async () => {
    if (!teamId || selectedPlayerIds.length === 0) return;
    setActionLoading(true);
    try {
      const rows = selectedPlayerIds.map((id) => ({ team_id: teamId, user_id: id, role: 'member' as const }));
      const { error } = await supabase.from('team_members').insert(rows);
      if (error) throw error;

      const { data: memberData } = await supabase
        .from('team_members')
        .select('*, profile:profiles(username, ign, avatar_url, tier)')
        .eq('team_id', teamId)
        .order('role', { ascending: true });
      setMembers((memberData as TeamMemberWithProfile[]) || []);
      setPlayers((prev) => prev.filter((player) => !selectedPlayerIds.includes(player.id)));
      setSelectedPlayerIds([]);
      toast({ title: 'Players Added', description: 'Selected players were assigned to this team.' });
    } catch (error: unknown) {
      toast({ title: 'Assign failed', description: getErrorMessage(error, 'Could not assign players.'), variant: 'destructive' });
    } finally {
      setActionLoading(false);
    }
  };

  const copyInviteCode = async () => {
    if (!team?.invite_code) return;
    await navigator.clipboard.writeText(team.invite_code);
    toast({ title: 'Copied', description: 'Invite code copied to clipboard.' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: PRIMARY }} />
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-[#0a0a0a]">
        <p className="text-slate-400">Team not found.</p>
        <Button onClick={() => navigate('/teams')} style={{ background: PRIMARY, color: '#fff' }}>
          Back to Teams
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teams')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            TEAM DASHBOARD
          </h1>
        </div>

        <div className="rounded-2xl p-6 space-y-4" style={glassCardStyle}>
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
              <p className="font-bold" style={{ color: PRIMARY }}>[{team.tag}]</p>
            </div>
          </div>

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
            {canEditTeam && (
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogTrigger asChild>
                  <Button className="rounded-xl gap-2 bg-[#ec131e] hover:bg-[#ec131e]/90">
                    <Pencil className="w-4 h-4" />
                    Edit Team
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md bg-[#120b0c] border border-white/10">
                  <DialogHeader>
                    <DialogTitle className="text-white">Edit Team</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label>Tag</Label>
                      <Input value={editTag} onChange={(e) => setEditTag(e.target.value)} maxLength={5} />
                    </div>
                    <div className="space-y-1">
                      <Label>Logo URL</Label>
                      <Input value={editLogoUrl} onChange={(e) => setEditLogoUrl(e.target.value)} />
                    </div>
                    <Button onClick={handleUpdateTeam} disabled={actionLoading} className="w-full bg-[#ec131e] hover:bg-[#ec131e]/90">
                      Save Team
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
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

          {isCaptain && team.invite_code && (
            <div className="rounded-xl border border-[#ec131e]/30 bg-[#ec131e]/10 p-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold" style={{ color: PRIMARY }}>Invite Code</p>
                <p className="text-white font-black tracking-widest">{team.invite_code}</p>
              </div>
              <Button variant="outline" className="border-white/20 text-white" onClick={copyInviteCode}>
                <Copy className="w-4 h-4 mr-2" />
                Copy
              </Button>
            </div>
          )}
        </div>

        {activeSeason && (
          <div className="rounded-2xl p-5 space-y-4" style={glassCardStyle}>
            <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: PRIMARY }}>
              <Trophy className="w-4 h-4" />
              {activeSeason.name} — Team Score
            </div>
            {seasonStats ? (
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <p className="text-2xl font-black text-white">#{seasonStats.rank}</p>
                  <p className="text-xs text-slate-400">Season Rank</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <p className="text-2xl font-black text-white">{seasonStats.season_points}</p>
                  <p className="text-xs text-slate-400">Season Points</p>
                </div>
                <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-center">
                  <p className="text-2xl font-black text-white">{seasonStats.season_kills}</p>
                  <p className="text-xs text-slate-400">Season Kills</p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-sm">No results yet this season.</p>
            )}
          </div>
        )}

        <div className="rounded-2xl p-5 space-y-4" style={glassCardStyle}>
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <BarChart3 className="w-4 h-4" style={{ color: PRIMARY }} />
            Match Day Performance
          </div>
          {matchDayChartData.length === 0 ? (
            <p className="text-slate-500 text-sm">No match-day scores available for this team yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={matchDayChartData}>
                  <XAxis dataKey="matchDay" stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#94a3b8" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: 'rgba(10,10,10,0.95)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="points" fill={PRIMARY} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5 space-y-4" style={glassCardStyle}>
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">Member Stats</h3>
          <div className="space-y-2">
            <div className="grid grid-cols-[1.2fr_80px_80px_80px_130px] gap-2 text-xs uppercase text-slate-400 px-2">
              <span>Player</span>
              <span className="text-right">Points</span>
              <span className="text-right">Kills</span>
              <span className="text-right">Lobbies</span>
              <span className="text-right">Actions</span>
            </div>
            {memberStats.map((row) => {
              const memberProfile = row.member.profile;
              const isMe = row.member.user_id === user?.id;
              return (
                <div key={row.member.id} className="grid grid-cols-[1.2fr_80px_80px_80px_130px] gap-2 items-center rounded-xl border border-white/10 bg-white/5 p-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={memberProfile?.avatar_url || '/placeholder.svg'}
                      alt={memberProfile?.username || 'Player'}
                      className="w-9 h-9 rounded-full object-cover"
                      style={{ border: `2px solid ${row.member.role === 'captain' ? PRIMARY : 'rgba(255,255,255,0.15)'}` }}
                    />
                    <div className="min-w-0">
                      <p className="font-semibold text-white text-sm truncate">
                        {row.member.role === 'captain' && <Crown className="w-3 h-3 inline mr-1" style={{ color: PRIMARY }} />}
                        {memberProfile?.ign || memberProfile?.username || 'Unknown'}
                      </p>
                      <p className="text-xs capitalize" style={{ color: row.member.role === 'captain' ? PRIMARY : '#64748b' }}>
                        {row.member.role}
                      </p>
                    </div>
                  </div>
                  <p className="text-right text-white font-bold">{row.points}</p>
                  <p className="text-right text-white">{row.kills}</p>
                  <p className="text-right text-white">{row.lobbies}</p>
                  <div className="flex justify-end gap-1">
                    {isCaptain && !isMe && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionLoading}
                          onClick={() => transferCaptaincy(row.member.user_id)}
                          className="text-amber-300 hover:text-amber-200 rounded-xl px-2"
                          title="Transfer captaincy"
                        >
                          <Shuffle className="w-3 h-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionLoading}
                          onClick={() => handleKick(row.member.user_id)}
                          className="text-red-400 hover:text-red-300 rounded-xl px-2"
                          title="Kick member"
                        >
                          <UserMinus className="w-3 h-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {isAdmin && (
          <div className="rounded-2xl p-5 space-y-4" style={glassCardStyle}>
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

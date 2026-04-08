import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Team, TeamMember } from '@/types/competitive';

export function useTeams() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [myMembership, setMyMembership] = useState<TeamMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTeams((data as Team[]) || []);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  }, []);

  const fetchMyTeam = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data: membership, error: memErr } = await supabase
        .from('team_members')
        .select('*, team:teams(*)')
        .eq('user_id', user.id)
        .maybeSingle();

      if (memErr) throw memErr;
      if (membership) {
        setMyMembership(membership as unknown as TeamMember);
        setMyTeam((membership as any).team as Team);
      } else {
        setMyMembership(null);
        setMyTeam(null);
      }
    } catch (err) {
      console.error('Error fetching my team:', err);
    }
  }, [user?.id]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      await Promise.all([fetchTeams(), fetchMyTeam()]);
      setIsLoading(false);
    };
    load();

    // Real-time subscription
    const channel = supabase
      .channel('teams-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, () => {
        fetchTeams();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'team_members' }, () => {
        fetchMyTeam();
        fetchTeams();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTeams, fetchMyTeam]);

  const createTeam = async (name: string, tag: string, logoUrl?: string) => {
    if (!user?.id) throw new Error('Not authenticated');
    if (myTeam) throw new Error('You are already in a team');

    const { data: team, error: teamErr } = await supabase
      .from('teams')
      .insert({ name, tag: tag.toUpperCase(), logo_url: logoUrl || null, created_by: user.id })
      .select()
      .single();

    if (teamErr) throw teamErr;

    const { error: memberErr } = await supabase
      .from('team_members')
      .insert({ team_id: team.id, user_id: user.id, role: 'captain' });

    if (memberErr) throw memberErr;

    toast({ title: 'Team Created', description: `${name} [${tag.toUpperCase()}] has been created!` });
    await Promise.all([fetchTeams(), fetchMyTeam()]);
    return team;
  };

  const joinTeam = async (teamId: string) => {
    if (!user?.id) throw new Error('Not authenticated');
    if (myTeam) {
      toast({ title: 'Already in a Team', description: 'You must leave your current team first.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('team_members')
      .insert({ team_id: teamId, user_id: user.id, role: 'member' });

    if (error) throw error;
    toast({ title: 'Joined Team', description: 'You have joined the team!' });
    await Promise.all([fetchTeams(), fetchMyTeam()]);
  };

  const leaveTeam = async () => {
    if (!user?.id || !myMembership) return;

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
    toast({ title: 'Left Team', description: 'You have left the team.' });
    await Promise.all([fetchTeams(), fetchMyTeam()]);
  };

  const kickMember = async (userId: string) => {
    if (!myMembership || myMembership.role !== 'captain') {
      toast({ title: 'Unauthorized', description: 'Only captains can kick members.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('user_id', userId)
      .eq('team_id', myMembership.team_id);

    if (error) throw error;
    toast({ title: 'Member Kicked', description: 'The member has been removed from the team.' });
    await fetchTeams();
  };

  return { teams, myTeam, myMembership, createTeam, joinTeam, leaveTeam, kickMember, isLoading };
}

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Shield, Search, ArrowRight, Loader2, UserMinus } from 'lucide-react';
import { cn } from '@/lib/utils';

const PRIMARY = '#ec131e';

export const TeamAssign: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  // Fetch all players
  const { data: players = [], isLoading: playersLoading } = useQuery({
    queryKey: ['admin-players-assign'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, username, ign, avatar_url, role, status,
          team_members (
            team_id,
            teams (id, name, tag)
          )
        `)
        .order('ign');
      if (error) throw error;
      return data;
    },
  });

  // Fetch all teams
  const { data: teams = [], isLoading: teamsLoading } = useQuery({
    queryKey: ['admin-teams-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Assign player to team
  const assignMutation = useMutation({
    mutationFn: async ({ userId, teamId }: { userId: string, teamId: string }) => {
      // First remove from any existing team
      await supabase.from('team_members').delete().eq('user_id', userId);
      
      if (teamId !== 'none') {
        const { error } = await supabase
          .from('team_members')
          .insert({ user_id: userId, team_id: teamId, role: 'member' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-players-assign'] });
      toast({ title: 'Success', description: 'Player team assignment updated.' });
    },
  });

  const filteredPlayers = players.filter(p => 
    p.ign?.toLowerCase().includes(search.toLowerCase()) || 
    p.username?.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: players.length,
    assigned: players.filter(p => p.team_members && p.team_members.length > 0).length,
    unassigned: players.filter(p => !p.team_members || p.team_members.length === 0).length,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white font-orbitron tracking-tight">TEAM ASSIGNMENT</h1>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Squad Logic & Roster Management</p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
           <div className="text-center px-4 border-r border-white/10">
              <p className="text-[10px] font-black text-slate-500 uppercase">Total</p>
              <p className="text-xl font-black text-white">{stats.total}</p>
           </div>
           <div className="text-center px-4 border-r border-white/10">
              <p className="text-[10px] font-black text-green-500 uppercase">Deployed</p>
              <p className="text-xl font-black text-white">{stats.assigned}</p>
           </div>
           <div className="text-center px-4">
              <p className="text-[10px] font-black text-red-500 uppercase">Reserve</p>
              <p className="text-xl font-black text-white">{stats.unassigned}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card className="bg-[#1a0b0d]/50 border-white/10 backdrop-blur-md rounded-[32px] overflow-hidden">
          <CardHeader className="border-b border-white/5 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle className="text-lg font-black text-white uppercase tracking-tight">Operator Roster</CardTitle>
                <CardDescription className="text-xs">Manage squad deployments across all verified sectors.</CardDescription>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input 
                  placeholder="Search Operator..." 
                  className="pl-10 bg-white/5 border-white/10 h-10 text-xs" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5 bg-white/[0.02]">
                    <th className="py-4 px-6">Operator</th>
                    <th className="py-4 px-6">Current Squad</th>
                    <th className="py-4 px-6">Reassign To</th>
                    <th className="py-4 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {playersLoading || teamsLoading ? (
                    <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-red-500" /></td></tr>
                  ) : filteredPlayers.map((player) => {
                    const currentTeam = player.team_members?.[0]?.teams;
                    const isAssigning = assignMutation.isPending && assignMutation.variables?.userId === player.id;

                    return (
                      <tr key={player.id} className="hover:bg-white/[0.01] transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl border border-white/10 overflow-hidden bg-white/5">
                              {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" alt="" /> : <Users className="w-5 h-5 m-2.5 text-slate-700" />}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-white uppercase tracking-tight">{player.ign || player.username}</p>
                              <p className="text-[10px] font-bold text-slate-500 uppercase">{player.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          {currentTeam ? (
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20">
                              <Shield className="w-3 h-3 text-red-500" />
                              <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{currentTeam.name}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Unassigned</span>
                          )}
                        </td>
                        <td className="py-4 px-6">
                           <div className="flex items-center gap-2">
                              <Select 
                                value={currentTeam?.id || 'none'} 
                                onValueChange={(val) => assignMutation.mutate({ userId: player.id, teamId: val })}
                                disabled={isAssigning}
                              >
                                <SelectTrigger className="w-40 bg-white/5 border-white/10 h-9 text-[10px] font-black uppercase">
                                  <SelectValue placeholder="Select Squad" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a0b0d] border-white/10">
                                  <SelectItem value="none" className="text-[10px] font-bold uppercase">Leave Squad</SelectItem>
                                  {teams.map(t => (
                                    <SelectItem key={t.id} value={t.id} className="text-[10px] font-bold uppercase">{t.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {isAssigning && <Loader2 className="w-4 h-4 animate-spin text-red-500" />}
                           </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className={cn(
                            "inline-block w-2 h-2 rounded-full",
                            player.status === 'online' ? "bg-green-500" : "bg-slate-700"
                          )} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Shield, Search, Loader2, PlayCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      toast({ title: 'Roster Updated', description: 'Squad synchronization successful.' });
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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-orbitron tracking-tighter uppercase">
            ROSTER <span className="text-[#ec131e]">CONTROL</span>
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Squad Deployment & Intelligence Logic</p>
        </div>

        <div className="grid grid-cols-3 gap-4 xl:gap-6">
           <div className="glass-level-2 p-5 rounded-2xl min-w-[120px] text-center border-white/5">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Force</p>
              <p className="text-2xl font-black text-white font-orbitron">{stats.total}</p>
           </div>
           <div className="glass-level-2 p-5 rounded-2xl min-w-[120px] text-center border-emerald-500/10 scale-105 brand-glow">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Deployed</p>
              <p className="text-2xl font-black text-white font-orbitron">{stats.assigned}</p>
           </div>
           <div className="glass-level-2 p-5 rounded-2xl min-w-[120px] text-center border-red-500/10">
              <p className="text-[10px] font-black text-[#ec131e] uppercase tracking-widest mb-1">Reserves</p>
              <p className="text-2xl font-black text-white font-orbitron">{stats.unassigned}</p>
           </div>
        </div>
      </div>

      <div className="glass-level-2 rounded-[32px] overflow-hidden border-white/10 shadow-2xl">
        <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-xl font-black text-white uppercase tracking-tight font-orbitron">Operator Roster</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Personnel Index</p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input 
              placeholder="Search by IGN or Username..." 
              className="pl-12 glass-level-3 border-white/10 h-12 text-xs font-bold uppercase tracking-widest rounded-xl focus:ring-[#ec131e] transition-all" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 bg-white/[0.02] border-b border-white/5">
                <th className="py-6 px-8">Operator Unit</th>
                <th className="py-6 px-8">Tactical Role</th>
                <th className="py-6 px-8">Current Deployment</th>
                <th className="py-6 px-8">Reassignment Buffer</th>
                <th className="py-6 px-8 text-right pr-12">Telemetry</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {playersLoading || teamsLoading ? (
                <tr><td colSpan={5} className="py-32 text-center text-slate-600 font-bold uppercase"><Loader2 className="w-10 h-10 animate-spin mx-auto text-[#ec131e] opacity-50 mb-4" /> Synchronizing data...</td></tr>
              ) : filteredPlayers.length === 0 ? (
                <tr><td colSpan={5} className="py-32 text-center text-slate-600 font-bold uppercase">No operators matching search parameters</td></tr>
              ) : filteredPlayers.map((player) => {
                const currentTeam = player.team_members?.[0]?.teams;
                const isAssigning = assignMutation.isPending && assignMutation.variables?.userId === player.id;

                return (
                  <tr key={player.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl border-2 border-white/5 overflow-hidden bg-white/5 glass-level-3 shrink-0 group-hover:scale-110 transition-transform">
                          {player.avatar_url ? <img src={player.avatar_url} className="w-full h-full object-cover" alt="" /> : <Users className="w-6 h-6 m-3 text-slate-700" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-black text-white uppercase tracking-tight truncate">{player.ign || player.username}</p>
                          <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">ID: {player.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                       <span className="text-[10px] font-black text-slate-400 border border-white/10 px-3 py-1.5 rounded-lg uppercase tracking-widest bg-white/5">{player.role}</span>
                    </td>
                    <td className="py-6 px-8">
                      {currentTeam ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#ec131e]/10 border border-[#ec131e]/20 group-hover:brand-glow transition-all">
                          <Shield className="w-3.5 h-3.5 text-[#ec131e]" />
                          <span className="text-[10px] font-black text-[#ec131e] uppercase tracking-widest">{currentTeam.name}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic opacity-50">Stationed at Base</span>
                      )}
                    </td>
                    <td className="py-6 px-8">
                       <div className="flex items-center gap-3">
                          <Select 
                            value={currentTeam?.id || 'none'} 
                            onValueChange={(val) => assignMutation.mutate({ userId: player.id, teamId: val })}
                            disabled={isAssigning}
                          >
                            <SelectTrigger className="w-48 glass-level-3 border-white/10 h-10 text-[10px] font-black uppercase tracking-widest rounded-xl hover:border-[#ec131e]/50 transition-colors">
                              <SelectValue placeholder="New Sector" />
                            </SelectTrigger>
                            <SelectContent className="glass-level-3 border-white/10 shadow-2xl backdrop-blur-2xl">
                              <SelectItem value="none" className="text-[10px] font-black uppercase py-3 hover:text-[#ec131e]">Return to Reserves</SelectItem>
                              {teams.map(t => (
                                <SelectItem key={t.id} value={t.id} className="text-[10px] font-black uppercase py-3">{t.name} Unit</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {isAssigning && <Loader2 className="w-4 h-4 animate-spin text-[#ec131e]" />}
                       </div>
                    </td>
                    <td className="py-6 px-8 text-right pr-12">
                      <div className={cn(
                        "inline-block w-2.5 h-2.5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)]",
                        player.status === 'online' ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-slate-800"
                      )} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        <div className="p-8 border-t border-white/5 flex justify-between items-center text-slate-600">
           <p className="text-[10px] font-black uppercase tracking-[0.5em]">NEXA ROSTER SYNC v2.1</p>
           <PlayCircle className="w-5 h-5 opacity-20" />
        </div>
      </div>
    </div>
  );
};

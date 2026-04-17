import React, { useEffect, useMemo, useState } from 'react';
import { useCompetitive } from '@/hooks/useCompetitive';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Trophy, Plus, Link as LinkIcon, Save, CalendarDays, Activity, PlayCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlayerEntry = {
  id: string;
  username: string;
  ign: string;
  avatar_url?: string;
  team_id?: string;
  team_name?: string;
  team_tag?: string;
};

type DraftResult = {
  kills: number;
  placement: number;
  team_id?: string;
};

const getPlacementPoints = (placement: number) => {
  if (placement >= 1 && placement <= 3) return 10;
  if (placement >= 4 && placement <= 7) return 7;
  if (placement >= 8 && placement <= 15) return 5;
  return 3;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const MatchManagement: React.FC = () => {
  const { toast } = useToast();
  const {
    seasons,
    matchDays,
    lobbies,
    createMatchDay,
    createLobby,
    updateLobbyRecording,
    bulkUpsertLobbyResults,
    isLoading,
  } = useCompetitive();

  const [players, setPlayers] = useState<PlayerEntry[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [createDayOpen, setCreateDayOpen] = useState(false);

  const [newMatchSeasonId, setNewMatchSeasonId] = useState('');
  const [newMatchName, setNewMatchName] = useState('');
  const [newMatchDate, setNewMatchDate] = useState('');

  const [expandedMatchDays, setExpandedMatchDays] = useState<Record<string, boolean>>({});

  const [selectedMatchDayId, setSelectedMatchDayId] = useState('');
  const [selectedLobbyId, setSelectedLobbyId] = useState('');
  const [newLobbyNumber, setNewLobbyNumber] = useState('');
  const [newLobbyRecording, setNewLobbyRecording] = useState('');
  const [draftResults, setDraftResults] = useState<Record<string, DraftResult>>({});
  const [savingResults, setSavingResults] = useState(false);

  const [editingLobbyId, setEditingLobbyId] = useState<string | null>(null);
  const [editingRecordingUrl, setEditingRecordingUrl] = useState('');
  const [editingNotes, setEditingNotes] = useState('');

  const matchDayMap = useMemo(
    () => Object.fromEntries(matchDays.map((matchDay) => [matchDay.id, matchDay])),
    [matchDays],
  );

  const groupedMatchDays = useMemo(() => {
    const grouped = new Map<string, typeof matchDays>();
    for (const season of seasons) grouped.set(season.id, []);
    for (const day of matchDays) {
      if (!grouped.has(day.season_id)) grouped.set(day.season_id, []);
      grouped.get(day.season_id)?.push(day);
    }
    return grouped;
  }, [seasons, matchDays]);

  const selectedMatchDayLobbies = useMemo(
    () => lobbies.filter((lobby) => lobby.match_day_id === selectedMatchDayId),
    [lobbies, selectedMatchDayId],
  );

  useEffect(() => {
    if (!selectedMatchDayId && matchDays.length > 0) {
      setSelectedMatchDayId(matchDays[0].id);
    }
  }, [matchDays, selectedMatchDayId]);

  useEffect(() => {
    if (!selectedMatchDayId) return;
    const firstLobby = lobbies.find((lobby) => lobby.match_day_id === selectedMatchDayId);
    setSelectedLobbyId(firstLobby?.id || '');
  }, [selectedMatchDayId, lobbies]);

  useEffect(() => {
    const loadPlayers = async () => {
      setPlayersLoading(true);
      try {
        const [{ data: profileRows }, { data: teamMemberRows }, { data: teamsRows }] = await Promise.all([
          supabase.from('profiles').select('id, username, ign, avatar_url').eq('role', 'player'),
          supabase.from('team_members').select('user_id, team_id'),
          supabase.from('teams').select('id, name, tag'),
        ]);

        const teamsById = new Map((teamsRows || []).map((team:any) => [team.id, team]));
        const memberByUserId = new Map<string, { team_id?: string }>();
        for (const member of (teamMemberRows || [])) {
          memberByUserId.set(member.user_id, { team_id: member.team_id || undefined });
        }

        const rows = ((profileRows || []).map((row:any) => {
          const membership = memberByUserId.get(row.id);
          const team = membership?.team_id ? teamsById.get(membership.team_id) : undefined;
          return {
            id: row.id,
            username: row.username || '',
            ign: row.ign || row.username || 'Unknown',
            avatar_url: row.avatar_url || undefined,
            team_id: membership?.team_id,
            team_name: team?.name,
            team_tag: team?.tag,
          } as PlayerEntry;
        }));

        setPlayers(rows);
      } catch (error: any) {
        toast({ title: 'Failed to synchronize players', description: error.message, variant: 'destructive' });
      } finally {
        setPlayersLoading(false);
      }
    };
    void loadPlayers();
  }, [toast]);

  useEffect(() => {
    const loadLobbyResults = async () => {
      if (!selectedLobbyId) return;
      const { data } = await supabase
        .from('lobby_results')
        .select('user_id, team_id, kills, placement')
        .eq('lobby_id', selectedLobbyId);

      const existingMap: Record<string, DraftResult> = {};
      for (const row of (data || [])) {
        existingMap[row.user_id] = {
          kills: row.kills ?? 0,
          placement: row.placement ?? 1,
          team_id: row.team_id ?? undefined,
        };
      }

      setDraftResults((prev) => {
        const merged: Record<string, DraftResult> = {};
        for (const player of players) {
          merged[player.id] = existingMap[player.id] || prev[player.id] || {
            kills: 0,
            placement: 1,
            team_id: player.team_id,
          };
        }
        return merged;
      });
    };
    void loadLobbyResults();
  }, [selectedLobbyId, players]);

  const toggleMatchDayExpanded = (matchDayId: string) => {
    setExpandedMatchDays((prev) => ({ ...prev, [matchDayId]: !prev[matchDayId] }));
  };

  const handleCreateMatchDay = async () => {
    if (!newMatchSeasonId || !newMatchName || !newMatchDate) {
      toast({ title: 'Data Missing', description: 'Season, Label, and Date required.', variant: 'destructive' });
      return;
    }
    try {
      await createMatchDay(newMatchSeasonId, newMatchName, newMatchDate);
      setCreateDayOpen(false);
      setNewMatchSeasonId('');
      setNewMatchName('');
      setNewMatchDate('');
      toast({ title: 'Operations Calendar Updated', description: 'New match day successfully registered.' });
    } catch (error: any) {
      toast({ title: 'Sync Failure', description: error.message, variant: 'destructive' });
    }
  };

  const handleCreateLobby = async () => {
    if (!selectedMatchDayId || !newLobbyNumber) return;
    try {
      await createLobby(selectedMatchDayId, Number(newLobbyNumber), newLobbyRecording || undefined);
      setNewLobbyNumber('');
      setNewLobbyRecording('');
      toast({ title: 'Sector Entry Created', description: `Lobby Alpha-${newLobbyNumber} now active.` });
    } catch (error: any) {
      toast({ title: 'Creation Error', description: error.message, variant: 'destructive' });
    }
  };

  const updateDraft = (userId: string, field: 'kills' | 'placement', value: number) => {
    setDraftResults((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: field === 'kills' ? Math.max(0, Math.floor(value)) : Math.max(1, Math.floor(value)),
      },
    }));
  };

  const handleSaveAllResults = async () => {
    if (!selectedLobbyId) return;
    setSavingResults(true);
    try {
      const payload = players.map((player) => {
        const draft = draftResults[player.id] || { kills: 0, placement: 1, team_id: player.team_id };
        return {
          lobby_id: selectedLobbyId,
          user_id: player.id,
          team_id: draft.team_id || player.team_id || undefined,
          kills: draft.kills,
          placement: draft.placement,
        };
      });
      await bulkUpsertLobbyResults(payload);
      toast({ title: 'Intelligence Uploaded', description: 'Match results synchronized with leaderboard.' });
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setSavingResults(false);
    }
  };

  const openRecordingDialog = (lobbyId: string) => {
    const target = lobbies.find((lobby) => lobby.id === lobbyId);
    setEditingLobbyId(lobbyId);
    setEditingRecordingUrl(target?.recording_url || '');
    setEditingNotes(target?.notes || '');
  };

  const handleUpdateRecording = async () => {
    if (!editingLobbyId) return;
    try {
      await updateLobbyRecording(editingLobbyId, editingRecordingUrl);
      await supabase.from('lobbies').update({ notes: editingNotes || null }).eq('id', editingLobbyId);
      setEditingLobbyId(null);
      toast({ title: 'Intel Link Updated', description: 'Lobby recording link has been secured.' });
    } catch (error: any) {
      toast({ title: 'Save Failed', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-orbitron tracking-tighter uppercase">
            MATCH <span className="text-[#ec131e]">CONTROL</span>
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Operational Infrastructure & Results Logistics</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge className="bg-[#ec131e]/10 text-[#ec131e] border-red-500/20 px-4 py-1.5 font-black uppercase tracking-widest text-[9px] rounded-lg">Competitive Auth Level 5</Badge>
        </div>
      </div>

      <Tabs defaultValue="match-days" className="w-full">
        <TabsList className="grid w-full grid-cols-3 glass-level-2 border-white/10 p-1 rounded-[20px] h-14 mb-8">
          <TabsTrigger value="match-days" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#ec131e] rounded-[16px]">Calendar Ops</TabsTrigger>
          <TabsTrigger value="results-entry" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#ec131e] rounded-[16px]">Tactical Feed</TabsTrigger>
          <TabsTrigger value="recordings" className="gap-2 text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-[#ec131e] rounded-[16px]">Comms Archive</TabsTrigger>
        </TabsList>

        <TabsContent value="match-days" className="space-y-6 outline-none">
          <div className="flex justify-end">
             <Dialog open={createDayOpen} onOpenChange={setCreateDayOpen}>
               <DialogTrigger asChild>
                 <Button className="bg-[#ec131e] hover:bg-red-700 h-11 px-8 rounded-xl font-black uppercase tracking-widest text-[11px] brand-glow">
                   <Plus className="w-4 h-4 mr-2" />
                   New Match Day
                 </Button>
               </DialogTrigger>
               <DialogContent className="glass-level-3 border-white/10 text-white font-rajdhani">
                 <DialogHeader>
                   <DialogTitle className="font-orbitron font-black text-[#ec131e] uppercase tracking-widest">Register Match Day</DialogTitle>
                 </DialogHeader>
                 <div className="space-y-6 py-4">
                   <div className="space-y-2 text-left">
                     <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Target Season</Label>
                     <Select value={newMatchSeasonId} onValueChange={setNewMatchSeasonId}>
                       <SelectTrigger className="glass-level-2 border-white/10 h-12 font-bold">
                         <SelectValue placeholder="Select active season..." />
                       </SelectTrigger>
                       <SelectContent className="glass-level-3 border-white/10">
                         {seasons.map((s) => <SelectItem key={s.id} value={s.id} className="text-[10px] font-black uppercase py-3">{s.name}</SelectItem>)}
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="space-y-2 text-left">
                     <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Operation Label</Label>
                     <Input value={newMatchName} onChange={(e) => setNewMatchName(e.target.value)} placeholder="e.g., Tactical Week 04" className="glass-level-2 border-white/10 h-12" />
                   </div>
                   <div className="space-y-2 text-left">
                     <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Deployment Date</Label>
                     <Input type="date" value={newMatchDate} onChange={(e) => setNewMatchDate(e.target.value)} className="glass-level-2 border-white/10 h-12" />
                   </div>
                   <Button onClick={handleCreateMatchDay} className="w-full h-12 bg-[#ec131e] hover:bg-red-700 rounded-xl font-black uppercase tracking-widest">Commit to Calendar</Button>
                 </div>
               </DialogContent>
             </Dialog>
          </div>

          {isLoading ? (
            <div className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-[#ec131e] opacity-50" /></div>
          ) : (
            <div className="space-y-10">
              {seasons.map((season) => {
                const seasonMatchDays = groupedMatchDays.get(season.id) || [];
                return (
                  <div key={season.id} className="space-y-4">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 font-orbitron uppercase tracking-tighter">
                      <Trophy className="w-5 h-5 text-[#ec131e]" />
                      {season.name}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {seasonMatchDays.length === 0 ? (
                        <div className="glass-level-2 p-10 text-center rounded-[24px] border border-dashed border-white/10 md:col-span-2">
                           <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No match days planned for this sector</p>
                        </div>
                      ) : (
                        seasonMatchDays.map((matchDay) => {
                          const lobbyCount = lobbies.filter((lobby) => lobby.match_day_id === matchDay.id).length;
                          const expanded = expandedMatchDays[matchDay.id];
                          return (
                            <div key={matchDay.id} className="glass-level-2 rounded-[24px] overflow-hidden border-white/5 transition-all hover:scale-[1.01]">
                               <div className="p-6 cursor-pointer" onClick={() => toggleMatchDayExpanded(matchDay.id)}>
                                  <div className="flex items-center justify-between mb-4">
                                     <h3 className="font-black text-white uppercase tracking-tight text-lg">{matchDay.name}</h3>
                                     {expanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                                  </div>
                                  <div className="flex items-center gap-4">
                                     <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest gap-2 bg-white/5 py-1 px-3 rounded-lg border border-white/5">
                                        <CalendarDays className="w-3.5 h-3.5 text-[#ec131e]" />
                                        {new Date(matchDay.match_date).toLocaleDateString()}
                                     </div>
                                     <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest gap-2 bg-white/5 py-1 px-3 rounded-lg border border-white/5">
                                        <Activity className="w-3.5 h-3.5" />
                                        {lobbyCount} Sectors
                                     </div>
                                     <Badge className={cn("text-[9px] font-black uppercase tracking-widest ml-auto px-3 py-1", matchDay.is_finalized ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20')}>
                                        {matchDay.is_finalized ? 'Finalized' : 'Accepting Results'}
                                     </Badge>
                                  </div>
                               </div>
                               {expanded && (
                                  <div className="p-6 pt-0 space-y-3 bg-black/20 border-t border-white/5">
                                     {lobbies.filter((l) => l.match_day_id === matchDay.id).map((lobby) => (
                                        <div key={lobby.id} className="flex items-center justify-between p-4 glass-level-3 rounded-xl border-white/5">
                                           <div>
                                              <p className="text-[11px] font-black text-white uppercase tracking-widest mb-0.5">Lobby Alpha-{lobby.lobby_number.toString().padStart(2, '0')}</p>
                                              <p className="text-[10px] font-black text-slate-500 flex items-center gap-2 truncate max-w-[200px] uppercase">
                                                 <LinkIcon className="w-3 h-3" /> {lobby.recording_url || 'Unlinked'}
                                              </p>
                                           </div>
                                           <Button size="sm" variant="outline" className="h-8 border-white/10 text-[9px] font-black uppercase tracking-widest">Audit</Button>
                                        </div>
                                     ))}
                                  </div>
                               )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="results-entry" className="space-y-8 outline-none">
          <div className="glass-level-2 p-8 rounded-[32px] border-white/10">
            <h2 className="text-xl font-black text-white mb-8 uppercase tracking-tight font-orbitron">Initialize Roster Feed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Operations Day</Label>
                <Select value={selectedMatchDayId} onValueChange={setSelectedMatchDayId}>
                  <SelectTrigger className="glass-level-3 border-white/5 h-12 font-bold"><SelectValue placeholder="Select Match Day" /></SelectTrigger>
                  <SelectContent className="glass-level-3 border-white/10">
                    {matchDays.map((day) => <SelectItem key={day.id} value={day.id} className="text-xs uppercase font-bold py-3">{day.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Active Sector</Label>
                <Select value={selectedLobbyId} onValueChange={setSelectedLobbyId}>
                  <SelectTrigger className="glass-level-3 border-white/5 h-12 font-bold"><SelectValue placeholder="Select Sector" /></SelectTrigger>
                  <SelectContent className="glass-level-3 border-white/10">
                    {selectedMatchDayLobbies.map((l) => <SelectItem key={l.id} value={l.id} className="text-xs uppercase font-bold py-3">Lobby Alpha-{l.lobby_number}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Deploy New Sector Index</Label>
                <Input type="number" min={1} value={newLobbyNumber} onChange={(e) => setNewLobbyNumber(e.target.value)} placeholder="01" className="glass-level-3 border-white/5 h-12 font-bold" />
              </div>
              <div className="flex items-end">
                <Button onClick={handleCreateLobby} className="w-full h-12 bg-transparent border-2 border-[#ec131e] text-[#ec131e] hover:bg-[#ec131e] hover:text-white rounded-xl font-black uppercase tracking-widest text-[11px] transition-all">
                  <Plus className="w-4 h-4 mr-2" /> Initialize Lobby
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-8">
            <div className="glass-level-2 rounded-[40px] overflow-hidden border-white/10">
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-xl font-black text-white font-orbitron uppercase tracking-tight">Intelligence Feed</h3>
                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">Sector Sync Status: Active</div>
              </div>
              <div className="p-8 space-y-4">
                {playersLoading ? (
                  <div className="py-20 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#ec131e] opacity-50" /></div>
                ) : (
                  <div className="space-y-3">
                    {players.map((player) => {
                      const draft = draftResults[player.id] || { kills: 0, placement: 1, team_id: player.team_id };
                      const placementPts = getPlacementPoints(draft.placement);
                      const totalPts = draft.kills * 2 + placementPts;

                      return (
                        <div key={player.id} className="glass-level-3 p-4 flex flex-col sm:flex-row items-center gap-6 rounded-[24px] border-white/5 group">
                          <div className="flex items-center gap-4 min-w-0 flex-1">
                            <div className="w-12 h-12 rounded-full border-2 border-white/10 overflow-hidden shrink-0 group-hover:brand-glow transition-all">
                               <img src={player.avatar_url || '/placeholder.svg'} className="w-full h-full object-cover" alt="" />
                            </div>
                            <div className="min-w-0 text-left">
                              <p className="text-base font-black text-white uppercase tracking-tight truncate">{player.ign}</p>
                              <p className="text-[10px] font-black text-[#ec131e] uppercase tracking-widest truncate">
                                {player.team_name ? `[${player.team_tag}] ${player.team_name}` : 'Rogue Operator'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 shrink-0">
                             <div className="space-y-1">
                                <Label className="text-[9px] font-black text-slate-500 uppercase ml-1">Kills</Label>
                                <Input type="number" min={0} value={draft.kills} onChange={(e) => updateDraft(player.id, 'kills', Number(e.target.value))} className="w-20 h-11 bg-white/5 border-white/10 font-bold text-center" />
                             </div>
                             <div className="space-y-1">
                                <Label className="text-[9px] font-black text-slate-500 uppercase ml-1">Rank</Label>
                                <Input type="number" min={1} value={draft.placement} onChange={(e) => updateDraft(player.id, 'placement', Number(e.target.value))} className="w-20 h-11 bg-white/5 border-white/10 font-bold text-center" />
                             </div>
                             <div className="text-right min-w-[100px] border-l border-white/5 pl-6 ml-2">
                                <p className="text-2xl font-black text-white font-orbitron tabular-nums leading-none tracking-tighter">{totalPts}</p>
                                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-1">XP Points</p>
                             </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Button
                  onClick={handleSaveAllResults}
                  disabled={!selectedLobbyId || savingResults || playersLoading}
                  className="w-full h-14 bg-[#ec131e] hover:bg-red-700 rounded-[20px] font-black uppercase tracking-[0.2em] text-[12px] brand-glow mt-8"
                >
                  {savingResults ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Save className="w-5 h-5 mr-3" />}
                  Finalize Intelligence Entry
                </Button>
              </div>
            </div>

            <div className="space-y-8">
               <div className="glass-level-2 p-8 rounded-[32px] border-[#ec131e]/20">
                  <h4 className="text-[11px] font-black text-[#ec131e] uppercase tracking-[0.4em] mb-8 font-orbitron">Protocol Points</h4>
                  <div className="space-y-6">
                     {[
                        { range: '1st - 3rd', pts: 10, bg: 'bg-emerald-500/10' },
                        { range: '4th - 7th', pts: 7, bg: 'bg-blue-500/10' },
                        { range: '8th - 15th', pts: 5, bg: 'bg-amber-500/10' },
                        { range: '16th+', pts: 3, bg: 'bg-slate-500/10' },
                     ].map((p, i) => (
                        <div key={i} className={cn("p-4 rounded-xl flex items-center justify-between border border-white/5", p.bg)}>
                           <span className="text-[10px] font-black text-white uppercase tracking-widest">{p.range}</span>
                           <span className="text-lg font-black text-white font-orbitron">{p.pts} PTS</span>
                        </div>
                     ))}
                  </div>
                  <p className="mt-8 text-[9px] font-black text-slate-500 uppercase leading-relaxed text-center">ELIMINATION MULTIPLIER:<br/><span className="text-white">2.0X PER VERIFIED KILL</span></p>
               </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="recordings" className="mt-6 outline-none">
          <div className="glass-level-2 p-8 rounded-[40px] border-white/10">
            <h2 className="text-xl font-black text-white mb-10 uppercase tracking-tight font-orbitron">Intelligence Comms Archive</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {lobbies.length === 0 ? (
                <div className="py-20 text-center col-span-2 border-2 border-dashed border-white/5 rounded-3xl">
                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No sector recordings stored in archive</p>
                </div>
              ) : (
                lobbies.map((lobby) => {
                  const day = matchDayMap[lobby.match_day_id];
                  return (
                    <div key={lobby.id} className="glass-level-3 p-6 flex flex-col gap-6 rounded-[24px] border-white/5 group hover:border-[#ec131e]/30 transition-all">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <PlayCircle className="w-5 h-5 text-[#ec131e] group-hover:scale-125 transition-transform" />
                            <h4 className="font-black text-white uppercase tracking-tight">{day?.name || 'Sector Ops'}</h4>
                         </div>
                         <Badge className="bg-white/5 text-[9px] font-black tracking-widest uppercase py-1 px-3 border border-white/10">Lobby {lobby.lobby_number.toString().padStart(2, '0')}</Badge>
                      </div>
                      <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Intel Data Link</p>
                         <p className="text-xs text-blue-400 font-bold truncate underline decoration-blue-400/30">{lobby.recording_url || 'Intelligence link missing'}</p>
                      </div>
                      <Button variant="ghost" className="w-full h-11 bg-white/5 hover:bg-[#ec131e] hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" onClick={() => openRecordingDialog(lobby.id)}>
                        <LinkIcon className="w-4 h-4 mr-2" /> Inject Recording Data
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editingLobbyId} onOpenChange={(open) => !open && setEditingLobbyId(null)}>
        <DialogContent className="glass-level-3 border-white/10 text-white font-rajdhani">
          <DialogHeader>
            <DialogTitle className="font-orbitron font-black text-[#ec131e] uppercase tracking-widest">Archive Management</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Secure Intel Link</Label>
              <Input
                value={editingRecordingUrl}
                onChange={(e) => setEditingRecordingUrl(e.target.value)}
                placeholder="https://comm-link.nexa.net/..."
                className="glass-level-2 border-white/10 h-12 font-bold"
              />
            </div>
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Tactical Log Notes</Label>
              <Textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Sector anomalies or operational notes..."
                className="glass-level-2 border-white/10 h-32 font-bold"
              />
            </div>
            <Button onClick={handleUpdateRecording} className="w-full h-12 bg-[#ec131e] hover:bg-red-700 rounded-xl font-black uppercase tracking-widest shadow-2xl">Authorize Sync</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

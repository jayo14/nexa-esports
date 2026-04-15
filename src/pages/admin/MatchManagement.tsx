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
import { Trophy, Plus, Link as LinkIcon, Save, CalendarDays } from 'lucide-react';

const PRIMARY = '#ec131e';

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

type TeamRow = {
  id: string;
  name: string;
  tag?: string;
};

type TeamMemberRow = {
  user_id: string;
  team_id?: string;
};

type ProfileRow = {
  id: string;
  username?: string;
  ign?: string;
  avatar_url?: string;
};

type ExistingLobbyResultRow = {
  user_id: string;
  team_id?: string;
  kills?: number;
  placement?: number;
};

const glassCardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
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

  const seasonMap = useMemo(
    () => Object.fromEntries(seasons.map((season) => [season.id, season])),
    [seasons],
  );

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
        const [{ data: profileRows, error: profileError }, { data: teamMemberRows, error: teamMemberError }, { data: teamsRows, error: teamsError }] = await Promise.all([
          supabase.from('profiles').select('id, username, ign, avatar_url').eq('role', 'player'),
          supabase.from('team_members').select('user_id, team_id'),
          supabase.from('teams').select('id, name, tag'),
        ]);

        if (profileError) throw profileError;
        if (teamMemberError) throw teamMemberError;
        if (teamsError) throw teamsError;

        const teamsById = new Map((teamsRows as TeamRow[] | null || []).map((team) => [team.id, team]));
        const memberByUserId = new Map<string, { team_id?: string }>();
        for (const member of ((teamMemberRows as TeamMemberRow[] | null) || [])) {
          if (!memberByUserId.has(member.user_id)) {
            memberByUserId.set(member.user_id, { team_id: member.team_id || undefined });
          }
        }

        const rows = (((profileRows as ProfileRow[] | null) || []).map((row) => {
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
      } catch (error: unknown) {
        toast({
          title: 'Failed to load players',
          description: getErrorMessage(error, 'Could not load players for results entry.'),
          variant: 'destructive',
        });
      } finally {
        setPlayersLoading(false);
      }
    };

    void loadPlayers();
  }, [toast]);

  useEffect(() => {
    const loadLobbyResults = async () => {
      if (!selectedLobbyId) return;
      const { data, error } = await supabase
        .from('lobby_results')
        .select('user_id, team_id, kills, placement')
        .eq('lobby_id', selectedLobbyId);
      if (error) return;

      const existingMap: Record<string, DraftResult> = {};
      for (const row of ((data as ExistingLobbyResultRow[] | null) || [])) {
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
      toast({ title: 'Missing fields', description: 'Season, name and date are required.', variant: 'destructive' });
      return;
    }

    try {
      await createMatchDay(newMatchSeasonId, newMatchName, newMatchDate);
      setCreateDayOpen(false);
      setNewMatchSeasonId('');
      setNewMatchName('');
      setNewMatchDate('');
      toast({ title: 'Match day created', description: 'The new match day has been added.' });
    } catch (error: unknown) {
      toast({ title: 'Failed to create match day', description: getErrorMessage(error, 'Could not create match day.'), variant: 'destructive' });
    }
  };

  const handleCreateLobby = async () => {
    if (!selectedMatchDayId || !newLobbyNumber) {
      toast({ title: 'Missing fields', description: 'Select a match day and lobby number.', variant: 'destructive' });
      return;
    }

    try {
      await createLobby(selectedMatchDayId, Number(newLobbyNumber), newLobbyRecording || undefined);
      setNewLobbyNumber('');
      setNewLobbyRecording('');
      toast({ title: 'Lobby created', description: 'Lobby has been added to the selected match day.' });
    } catch (error: unknown) {
      toast({ title: 'Failed to create lobby', description: getErrorMessage(error, 'Could not create lobby.'), variant: 'destructive' });
    }
  };

  const updateDraft = (userId: string, field: 'kills' | 'placement', value: number) => {
    setDraftResults((prev) => ({
      ...prev,
      [userId]: {
        kills: prev[userId]?.kills ?? 0,
        placement: prev[userId]?.placement ?? 1,
        team_id: prev[userId]?.team_id,
        [field]: field === 'kills' ? Math.max(0, Math.floor(value)) : Math.max(1, Math.floor(value)),
      },
    }));
  };

  const handleSaveAllResults = async () => {
    if (!selectedLobbyId) {
      toast({ title: 'Select a lobby', description: 'Choose a lobby before saving.', variant: 'destructive' });
      return;
    }

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
      toast({ title: 'Results saved', description: 'Lobby results were saved successfully.' });
    } catch (error: unknown) {
      toast({ title: 'Save failed', description: getErrorMessage(error, 'Could not save lobby results.'), variant: 'destructive' });
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
      setEditingRecordingUrl('');
      setEditingNotes('');
      toast({ title: 'Recording updated', description: 'Lobby recording link has been updated.' });
    } catch (error: unknown) {
      toast({ title: 'Update failed', description: getErrorMessage(error, 'Could not update recording.'), variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-6 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-wide" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            Match Management
          </h1>
          <Badge className="bg-[#ec131e]/20 text-[#ec131e] border border-[#ec131e]/40">
            Competitive Admin
          </Badge>
        </div>

        <Tabs defaultValue="match-days" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white/5 border border-white/10">
            <TabsTrigger value="match-days">Match Days</TabsTrigger>
            <TabsTrigger value="results-entry">Lobby Results Entry</TabsTrigger>
            <TabsTrigger value="recordings">Recording Links</TabsTrigger>
          </TabsList>

          <TabsContent value="match-days" className="mt-6 space-y-4">
            <Dialog open={createDayOpen} onOpenChange={setCreateDayOpen}>
              <DialogTrigger asChild>
                <Button className="bg-[#ec131e] hover:bg-[#ec131e]/90 text-white">
                  <Plus className="w-4 h-4 mr-2" />
                  New Match Day
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-[#120b0c] border border-white/10">
                <DialogHeader>
                  <DialogTitle className="text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    Create Match Day
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label>Season</Label>
                    <Select value={newMatchSeasonId} onValueChange={setNewMatchSeasonId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select season" />
                      </SelectTrigger>
                      <SelectContent>
                        {seasons.map((season) => (
                          <SelectItem key={season.id} value={season.id}>
                            {season.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Name</Label>
                    <Input value={newMatchName} onChange={(e) => setNewMatchName(e.target.value)} placeholder="Week 3 Match Day" />
                  </div>
                  <div className="space-y-1">
                    <Label>Date</Label>
                    <Input type="date" value={newMatchDate} onChange={(e) => setNewMatchDate(e.target.value)} />
                  </div>
                  <Button onClick={handleCreateMatchDay} className="w-full bg-[#ec131e] hover:bg-[#ec131e]/90">
                    Create Match Day
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {isLoading ? (
              <Card style={glassCardStyle}><CardContent className="py-10 text-center text-slate-400">Loading match days...</CardContent></Card>
            ) : (
              <div className="space-y-6">
                {seasons.map((season) => {
                  const seasonMatchDays = groupedMatchDays.get(season.id) || [];
                  return (
                    <div key={season.id} className="space-y-3">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-[#ec131e]" />
                        {season.name}
                      </h2>
                      {seasonMatchDays.length === 0 ? (
                        <Card style={glassCardStyle}>
                          <CardContent className="py-6 text-slate-400 text-sm">No match days in this season.</CardContent>
                        </Card>
                      ) : (
                        seasonMatchDays.map((matchDay) => {
                          const lobbyCount = lobbies.filter((lobby) => lobby.match_day_id === matchDay.id).length;
                          const expanded = expandedMatchDays[matchDay.id];
                          return (
                            <Card key={matchDay.id} style={glassCardStyle}>
                              <CardHeader
                                className="cursor-pointer"
                                onClick={() => toggleMatchDayExpanded(matchDay.id)}
                              >
                                <CardTitle className="text-white text-base flex items-center justify-between">
                                  <span>{matchDay.name}</span>
                                  <Badge className={matchDay.is_finalized ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30' : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'}>
                                    {matchDay.is_finalized ? 'Finalized' : 'Open'}
                                  </Badge>
                                </CardTitle>
                                <div className="text-xs text-slate-400 flex items-center gap-3">
                                  <span className="inline-flex items-center gap-1"><CalendarDays className="w-3 h-3" />{new Date(matchDay.match_date).toLocaleDateString()}</span>
                                  <span>{lobbyCount} lobbies</span>
                                </div>
                              </CardHeader>
                              {expanded && (
                                <CardContent className="pt-0 space-y-2">
                                  {lobbies.filter((lobby) => lobby.match_day_id === matchDay.id).map((lobby) => (
                                    <div key={lobby.id} className="rounded-lg border border-white/10 bg-white/5 p-3 flex items-center justify-between">
                                      <div>
                                        <p className="text-white font-semibold text-sm">Lobby {lobby.lobby_number}</p>
                                        <p className="text-xs text-slate-400 truncate max-w-[240px]">
                                          {lobby.recording_url || 'No recording link'}
                                        </p>
                                      </div>
                                      <Button size="sm" variant="outline" className="border-white/20 text-slate-200">
                                        View
                                      </Button>
                                    </div>
                                  ))}
                                </CardContent>
                              )}
                            </Card>
                          );
                        })
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="results-entry" className="mt-6 space-y-4">
            <Card style={glassCardStyle}>
              <CardHeader>
                <CardTitle className="text-white text-base">Select Match Day and Lobby</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Match Day</Label>
                  <Select value={selectedMatchDayId} onValueChange={setSelectedMatchDayId}>
                    <SelectTrigger><SelectValue placeholder="Select match day" /></SelectTrigger>
                    <SelectContent>
                      {matchDays.map((day) => (
                        <SelectItem key={day.id} value={day.id}>{day.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Lobby</Label>
                  <Select value={selectedLobbyId} onValueChange={setSelectedLobbyId}>
                    <SelectTrigger><SelectValue placeholder="Select lobby" /></SelectTrigger>
                    <SelectContent>
                      {selectedMatchDayLobbies.map((lobby) => (
                        <SelectItem key={lobby.id} value={lobby.id}>Lobby {lobby.lobby_number}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>New Lobby Number</Label>
                  <Input type="number" min={1} max={10} value={newLobbyNumber} onChange={(e) => setNewLobbyNumber(e.target.value)} placeholder="1" />
                </div>
                <div className="space-y-1">
                  <Label>Recording URL (optional)</Label>
                  <Input value={newLobbyRecording} onChange={(e) => setNewLobbyRecording(e.target.value)} placeholder="https://youtube.com/..." />
                </div>
                <div className="md:col-span-2">
                  <Button onClick={handleCreateLobby} variant="outline" className="border-[#ec131e]/40 text-[#ec131e]">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Lobby
                  </Button>
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-[1fr_320px] gap-4">
              <Card style={glassCardStyle}>
                <CardHeader>
                  <CardTitle className="text-white text-base">Player Result Entry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {playersLoading ? (
                    <p className="text-slate-400">Loading players...</p>
                  ) : players.length === 0 ? (
                    <p className="text-slate-400">No players found.</p>
                  ) : (
                    players.map((player) => {
                      const draft = draftResults[player.id] || { kills: 0, placement: 1, team_id: player.team_id };
                      const placementPts = getPlacementPoints(draft.placement);
                      const totalPts = draft.kills * 2 + placementPts;

                      return (
                        <div key={player.id} className="rounded-xl border border-white/10 bg-white/5 p-3 grid grid-cols-[1fr_90px_90px_120px] gap-2 items-center">
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={player.avatar_url || '/placeholder.svg'} alt={player.ign} className="w-9 h-9 rounded-full object-cover border border-white/20" />
                            <div className="min-w-0">
                              <p className="text-white font-semibold text-sm truncate">{player.ign || player.username}</p>
                              <p className="text-xs text-slate-400 truncate">
                                {player.team_name ? `${player.team_name}${player.team_tag ? ` [${player.team_tag}]` : ''}` : 'No team'}
                              </p>
                            </div>
                          </div>
                          <Input type="number" min={0} value={draft.kills} onChange={(e) => updateDraft(player.id, 'kills', Number(e.target.value || 0))} />
                          <Input type="number" min={1} value={draft.placement} onChange={(e) => updateDraft(player.id, 'placement', Number(e.target.value || 1))} />
                          <div className="text-right">
                            <p className="text-white font-black">{totalPts} pts</p>
                            <p className="text-xs text-slate-400">{draft.kills * 2} + {placementPts}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <Button
                    onClick={handleSaveAllResults}
                    disabled={!selectedLobbyId || savingResults || playersLoading}
                    className="w-full bg-[#ec131e] hover:bg-[#ec131e]/90"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {savingResults ? 'Saving...' : 'Save All Results'}
                  </Button>
                </CardContent>
              </Card>

              <Card style={glassCardStyle}>
                <CardHeader>
                  <CardTitle className="text-white text-base">Placement Points</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-slate-300">
                  <p>1–3 → <span className="text-white font-bold">10pts</span></p>
                  <p>4–7 → <span className="text-white font-bold">7pts</span></p>
                  <p>8–15 → <span className="text-white font-bold">5pts</span></p>
                  <p>16+ → <span className="text-white font-bold">3pts</span></p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="recordings" className="mt-6">
            <Card style={glassCardStyle}>
              <CardHeader>
                <CardTitle className="text-white text-base">Lobby Recording Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {lobbies.length === 0 ? (
                  <p className="text-slate-400">No lobbies available.</p>
                ) : (
                  lobbies.map((lobby) => {
                    const day = matchDayMap[lobby.match_day_id];
                    return (
                      <div key={lobby.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-white font-semibold text-sm">{day?.name || 'Unknown match day'} · Lobby {lobby.lobby_number}</p>
                          {lobby.recording_url ? (
                            <a href={lobby.recording_url} target="_blank" rel="noreferrer" className="text-xs text-[#ec131e] hover:underline truncate block">
                              {lobby.recording_url}
                            </a>
                          ) : (
                            <p className="text-xs text-slate-400">No recording URL</p>
                          )}
                        </div>
                        <Button variant="outline" className="border-white/20 text-slate-200" onClick={() => openRecordingDialog(lobby.id)}>
                          <LinkIcon className="w-4 h-4 mr-2" />
                          Edit
                        </Button>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={!!editingLobbyId} onOpenChange={(open) => !open && setEditingLobbyId(null)}>
        <DialogContent className="sm:max-w-lg bg-[#120b0c] border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Recording Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Recording URL</Label>
              <Input
                value={editingRecordingUrl}
                onChange={(e) => setEditingRecordingUrl(e.target.value)}
                placeholder="https://youtube.com/..."
              />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Any context for this lobby recording..."
              />
            </div>
            <Button onClick={handleUpdateRecording} className="w-full bg-[#ec131e] hover:bg-[#ec131e]/90">
              Save Recording
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

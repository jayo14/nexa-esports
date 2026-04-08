import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCompetitive } from '@/hooks/useCompetitive';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MatchDay, Lobby, Season } from '@/types/competitive';
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Clock,
  PlayCircle,
} from 'lucide-react';

const PRIMARY = '#ec131e';

type NewMatchDayForm = {
  season_id: string;
  name: string;
  date: string;
  lobby_count: 3 | 4;
};

export const AdminMatchDays: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { seasons, matchDays, fetchMatchDays } = useCompetitive();

  const [lobbiesMap, setLobbiesMap] = useState<Record<string, Lobby[]>>({});
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [recordingInputs, setRecordingInputs] = useState<Record<string, string>>({});

  const [form, setForm] = useState<NewMatchDayForm>({
    season_id: '',
    name: '',
    date: '',
    lobby_count: 3,
  });

  // Role guard
  const isAdmin = profile?.role === 'admin' || profile?.role === 'clan_master';
  useEffect(() => {
    if (!isAdmin) navigate('/dashboard');
  }, [isAdmin, navigate]);

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === 'in_progress') return <PlayCircle className="w-4 h-4" style={{ color: PRIMARY }} />;
    return <Clock className="w-4 h-4 text-slate-400" />;
  };

  const lobbyStatusColor = (status: string) => {
    if (status === 'verified') return '#22c55e';
    if (status === 'submitted') return '#f59e0b';
    return '#64748b';
  };

  const toggleExpand = async (matchDayId: string) => {
    const next = new Set(expandedDays);
    if (next.has(matchDayId)) {
      next.delete(matchDayId);
    } else {
      next.add(matchDayId);
      if (!lobbiesMap[matchDayId]) {
        const { data } = await supabase
          .from('lobbies')
          .select('*')
          .eq('match_day_id', matchDayId)
          .order('lobby_number');
        setLobbiesMap((prev) => ({ ...prev, [matchDayId]: (data as Lobby[]) || [] }));
      }
    }
    setExpandedDays(next);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.season_id || !form.name || !form.date) {
      toast({ title: 'Validation', description: 'Fill all required fields.', variant: 'destructive' });
      return;
    }
    setFormLoading(true);
    try {
      const { data: md, error: mdErr } = await supabase
        .from('match_days')
        .insert({ season_id: form.season_id, name: form.name, date: form.date })
        .select()
        .single();
      if (mdErr) throw mdErr;

      const lobbyInserts = Array.from({ length: form.lobby_count }, (_, i) => ({
        match_day_id: md.id,
        lobby_number: i + 1,
      }));
      const { error: lobErr } = await supabase.from('lobbies').insert(lobbyInserts);
      if (lobErr) throw lobErr;

      toast({ title: 'Match Day Created', description: `${form.name} created with ${form.lobby_count} lobbies.` });
      setShowForm(false);
      setForm({ season_id: '', name: '', date: '', lobby_count: 3 });
      await fetchMatchDays(form.season_id);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleCompleteMatchDay = async (matchDayId: string) => {
    const { error } = await supabase
      .from('match_days')
      .update({ status: 'completed' })
      .eq('id', matchDayId);
    if (!error) {
      toast({ title: 'Match Day Completed' });
      await fetchMatchDays();
    }
  };

  const handleSaveRecording = async (lobbyId: string, matchDayId: string) => {
    const url = recordingInputs[lobbyId] || '';
    const { error } = await supabase
      .from('lobbies')
      .update({ recording_url: url })
      .eq('id', lobbyId);
    if (!error) {
      toast({ title: 'Recording Saved' });
      const { data } = await supabase
        .from('lobbies')
        .select('*')
        .eq('match_day_id', matchDayId)
        .order('lobby_number');
      setLobbiesMap((prev) => ({ ...prev, [matchDayId]: (data as Lobby[]) || [] }));
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              MATCH DAYS
            </h1>
          </div>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl gap-2"
            style={{ background: PRIMARY, color: '#fff' }}
          >
            <Plus className="w-4 h-4" />
            New Match Day
          </Button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div
            className="rounded-2xl p-5 space-y-4"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <h2 className="font-bold text-white">Create Match Day</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <Label className="text-slate-300">Season *</Label>
                <select
                  value={form.season_id}
                  onChange={(e) => setForm({ ...form, season_id: e.target.value })}
                  className="w-full h-10 rounded-xl px-3 text-sm"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  required
                >
                  <option value="">Select season</option>
                  {seasons.map((s: Season) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Match Day 1"
                  required
                  className="h-10 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Date *</Label>
                <Input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  required
                  className="h-10 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-slate-300">Number of Lobbies</Label>
                <div className="flex gap-2">
                  {[3, 4].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm({ ...form, lobby_count: n as 3 | 4 })}
                      className="px-5 py-2 rounded-xl font-bold text-sm transition-all"
                      style={
                        form.lobby_count === n
                          ? { background: PRIMARY, color: '#fff' }
                          : { background: 'rgba(255,255,255,0.06)', color: '#64748b' }
                      }
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 rounded-xl"
                  style={{ background: PRIMARY, color: '#fff' }}
                >
                  {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Match Days List */}
        <div className="space-y-3">
          {matchDays.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No match days yet.</p>
          ) : (
            matchDays.map((md: MatchDay) => {
              const expanded = expandedDays.has(md.id);
              const lobbies = lobbiesMap[md.id] || [];
              return (
                <div
                  key={md.id}
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {/* Match Day Row */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer"
                    onClick={() => toggleExpand(md.id)}
                  >
                    <div className="flex items-center gap-3">
                      {statusIcon(md.status)}
                      <div>
                        <p className="font-bold text-white text-sm">{md.name}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(md.date).toLocaleDateString()} ·{' '}
                          <span className="capitalize">{md.status}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {md.status !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCompleteMatchDay(md.id);
                          }}
                          className="rounded-xl text-xs"
                          style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
                        >
                          Complete
                        </Button>
                      )}
                      {expanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </div>

                  {/* Lobbies */}
                  {expanded && (
                    <div className="border-t border-white/05 divide-y divide-white/05">
                      {lobbies.map((lobby: Lobby) => (
                        <div key={lobby.id} className="p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-white">Lobby {lobby.lobby_number}</span>
                              <span
                                className="text-xs px-2 py-0.5 rounded-full capitalize font-semibold"
                                style={{
                                  background: `${lobbyStatusColor(lobby.status)}22`,
                                  color: lobbyStatusColor(lobby.status),
                                  border: `1px solid ${lobbyStatusColor(lobby.status)}44`,
                                }}
                              >
                                {lobby.status}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() =>
                                navigate(
                                  `/admin/match-days/${md.id}/lobbies/${lobby.id}/entry`
                                )
                              }
                              className="rounded-xl text-xs gap-1"
                              style={{ background: PRIMARY, color: '#fff' }}
                            >
                              <ExternalLink className="w-3 h-3" />
                              Enter Results
                            </Button>
                          </div>
                          {/* Recording */}
                          <div className="flex gap-2">
                            <Input
                              value={
                                recordingInputs[lobby.id] !== undefined
                                  ? recordingInputs[lobby.id]
                                  : lobby.recording_url || ''
                              }
                              onChange={(e) =>
                                setRecordingInputs((prev) => ({ ...prev, [lobby.id]: e.target.value }))
                              }
                              placeholder="Paste recording URL..."
                              className="flex-1 h-8 text-xs rounded-lg"
                              style={{
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.08)',
                                color: '#fff',
                              }}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleSaveRecording(lobby.id, md.id)}
                              className="h-8 rounded-lg text-xs"
                              style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}
                            >
                              Save
                            </Button>
                          </div>
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
    </div>
  );
};

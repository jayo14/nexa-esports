import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

const PRIMARY = '#ec131e';

interface PlayerRow {
  user_id: string;
  team_id: string;
  ign: string;
  username: string;
  avatar_url?: string;
  team_name: string;
  kills: number;
  placement: number;
}

function calcPoints(kills: number, placement: number) {
  const killPts = kills * 2;
  let placePts = 3;
  if (placement <= 3) placePts = 10;
  else if (placement <= 7) placePts = 7;
  else if (placement <= 15) placePts = 5;
  return { killPts, placePts, total: killPts + placePts };
}

export const AdminLobbyEntry: React.FC = () => {
  const { matchDayId, lobbyId } = useParams<{ matchDayId: string; lobbyId: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();

  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'clan_master';

  useEffect(() => {
    if (!isAdmin) navigate('/dashboard');
  }, [isAdmin, navigate]);

  useEffect(() => {
    const fetchPlayers = async () => {
      setLoading(true);
      try {
        // Fetch all team members with profiles and teams
        const { data, error } = await supabase
          .from('team_members')
          .select('user_id, team_id, role, profile:profiles(ign, username, avatar_url), team:teams(name)')
          .order('team_id');

        if (error) throw error;

        // Also fetch existing results for this lobby to pre-fill
        const { data: existing } = await supabase
          .from('lobby_results')
          .select('*')
          .eq('lobby_id', lobbyId);

        const existingMap: Record<string, { kills: number; placement: number }> = {};
        (existing || []).forEach((r: any) => {
          existingMap[r.user_id] = { kills: r.kills, placement: r.placement };
        });

        const rows: PlayerRow[] = (data || []).map((m: any) => ({
          user_id: m.user_id,
          team_id: m.team_id,
          ign: m.profile?.ign || m.profile?.username || 'Unknown',
          username: m.profile?.username || '',
          avatar_url: m.profile?.avatar_url,
          team_name: m.team?.name || 'Unknown Team',
          kills: existingMap[m.user_id]?.kills ?? 0,
          placement: existingMap[m.user_id]?.placement ?? 1,
        }));

        setPlayers(rows);
      } catch (err: any) {
        toast({ title: 'Error', description: err.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    if (lobbyId) fetchPlayers();
  }, [lobbyId, toast, isAdmin]);

  const updatePlayer = (userId: string, field: 'kills' | 'placement', value: number) => {
    setPlayers((prev) =>
      prev.map((p) => (p.user_id === userId ? { ...p, [field]: Math.max(0, Math.floor(value)) } : p))
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const upsertRows = players.map((p) => ({
        lobby_id: lobbyId,
        user_id: p.user_id,
        team_id: p.team_id,
        kills: p.kills,
        placement: p.placement || 1,
        submitted_by: session?.user?.id,
      }));

      const { error } = await supabase.from('lobby_results').upsert(upsertRows, {
        onConflict: 'lobby_id,user_id',
      });
      if (error) throw error;

      // Update lobby status to submitted
      await supabase.from('lobbies').update({ status: 'submitted' }).eq('id', lobbyId);

      // Check if all lobbies in the match day are submitted → complete match day
      const { data: allLobbies } = await supabase
        .from('lobbies')
        .select('status')
        .eq('match_day_id', matchDayId);

      if (allLobbies && allLobbies.every((l: any) => l.status !== 'pending')) {
        await supabase
          .from('match_days')
          .update({ status: 'completed' })
          .eq('id', matchDayId);
      }

      setSubmitted(true);
      toast({ title: 'Results Submitted', description: 'Lobby results saved successfully!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen" style={{ background: '#0a0a0a' }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: PRIMARY }} />
      </div>
    );
  }

  // Group players by team for summary
  const teamSummary: Record<string, { team_name: string; total: number; kills: number }> = {};
  players.forEach((p) => {
    const { total, killPts } = calcPoints(p.kills, p.placement);
    if (!teamSummary[p.team_id]) {
      teamSummary[p.team_id] = { team_name: p.team_name, total: 0, kills: 0 };
    }
    teamSummary[p.team_id].total += total;
    teamSummary[p.team_id].kills += p.kills;
  });

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/match-days')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            LOBBY SCORE ENTRY
          </h1>
        </div>

        {/* Scoring Legend */}
        <div
          className="rounded-xl p-4 text-xs space-y-1"
          style={{ background: `${PRIMARY}10`, border: `1px solid ${PRIMARY}33` }}
        >
          <p className="font-bold text-sm" style={{ color: PRIMARY }}>
            Scoring Formula
          </p>
          <p className="text-slate-300">Kill Points = kills × 2</p>
          <p className="text-slate-300">
            Placement: Pos 1–3 → 10pts | 4–7 → 7pts | 8–15 → 5pts | 16+ → 3pts
          </p>
          <p className="text-slate-300">Player Total = Kill Points + Placement Points</p>
        </div>

        {submitted && (
          <div
            className="rounded-xl p-4 flex items-center gap-3"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)' }}
          >
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <p className="text-green-400 font-semibold">Results submitted successfully!</p>
          </div>
        )}

        {/* Players Table */}
        {players.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No team members found. Create teams first.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-[1fr_100px_100px_120px] gap-2 px-4 text-xs text-slate-500 uppercase tracking-wider">
              <span>Player</span>
              <span className="text-center">Kills</span>
              <span className="text-center">Place</span>
              <span className="text-right">Points</span>
            </div>

            {players.map((p) => {
              const { killPts, placePts, total } = calcPoints(p.kills, p.placement);
              return (
                <div
                  key={p.user_id}
                  className="rounded-xl p-3 grid grid-cols-[1fr_100px_100px_120px] gap-2 items-center"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={p.avatar_url || '/placeholder.svg'}
                      alt={p.ign}
                      className="w-8 h-8 rounded-full object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{p.ign}</p>
                      <p className="text-xs text-slate-500 truncate">{p.team_name}</p>
                    </div>
                  </div>

                  <Input
                    type="number"
                    min={0}
                    value={p.kills}
                    onChange={(e) => updatePlayer(p.user_id, 'kills', Number(e.target.value))}
                    className="h-8 text-center rounded-lg text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />

                  <Input
                    type="number"
                    min={1}
                    value={p.placement}
                    onChange={(e) => updatePlayer(p.user_id, 'placement', Number(e.target.value))}
                    className="h-8 text-center rounded-lg text-sm"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                  />

                  <div className="text-right text-xs text-slate-400">
                    <p className="font-black text-white text-base">{total}</p>
                    <p>
                      {killPts}+{placePts}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Team Summary */}
        {Object.keys(teamSummary).length > 0 && (
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <p className="font-bold text-white text-sm uppercase tracking-wider">Team Scores Preview</p>
            {Object.entries(teamSummary)
              .sort(([, a], [, b]) => b.total - a.total)
              .map(([teamId, s]) => (
                <div key={teamId} className="flex justify-between items-center">
                  <span className="text-sm text-slate-300">{s.team_name}</span>
                  <span className="font-bold text-white">
                    {s.total} pts · {s.kills} kills
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || players.length === 0}
          className="w-full h-14 rounded-xl font-bold text-base"
          style={{ background: PRIMARY, color: '#fff' }}
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Results'
          )}
        </Button>
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetitive } from '@/hooks/useCompetitive';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy } from 'lucide-react';

const PRIMARY = '#ec131e';

export const AdminSeasonalLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const { seasonLeaderboard, activeSeason, isLoading } = useCompetitive();

  const rankStyle = (rank: number) => {
    if (rank === 1) return { color: '#FFD700' };
    if (rank === 2) return { color: '#C0C0C0' };
    if (rank === 3) return { color: '#CD7F32' };
    return { color: '#64748b' };
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
            SEASONAL LEADERBOARD
          </h1>
        </div>

        {activeSeason && (
          <div
            className="rounded-xl p-3 flex items-center gap-2"
            style={{ background: `${PRIMARY}10`, border: `1px solid ${PRIMARY}33` }}
          >
            <Trophy className="w-4 h-4" style={{ color: PRIMARY }} />
            <p className="text-sm font-semibold" style={{ color: PRIMARY }}>
              {activeSeason.name} · Active Season
            </p>
          </div>
        )}

        {isLoading ? (
          <p className="text-center text-slate-500 py-8">Loading...</p>
        ) : seasonLeaderboard.length === 0 ? (
          <p className="text-center text-slate-500 py-8">No results yet.</p>
        ) : (
          <div className="space-y-3">
            {seasonLeaderboard.map((entry) => (
              <div
                key={entry.team_id}
                className="rounded-2xl p-4 flex items-center gap-4"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(12px)',
                  border: entry.rank <= 3 ? `1px solid ${PRIMARY}33` : '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                  style={{ background: 'rgba(255,255,255,0.06)', ...rankStyle(entry.rank) }}
                >
                  #{entry.rank}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-white">{entry.team_name}</p>
                  <p className="text-xs" style={{ color: PRIMARY }}>
                    [{entry.team_tag}]
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-white">{entry.season_points} pts</p>
                  <p className="text-xs text-slate-400">{entry.season_kills} kills</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompetitive } from '@/hooks/useCompetitive';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Trophy, Zap, Users, Medal } from 'lucide-react';
import { SeasonTeamLeaderboard, MatchDayTeamScore, SeasonPlayerStats } from '@/types/competitive';

const PRIMARY = '#ec131e';

type Tab = 'season' | 'matchdays' | 'players';

export const CompetitiveLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeSeason,
    seasonLeaderboard,
    matchDayTeamScores,
    playerSeasonStats,
    matchDays,
    isLoading,
  } = useCompetitive();

  const [tab, setTab] = useState<Tab>('season');
  const [selectedMatchDay, setSelectedMatchDay] = useState<string>('');

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'season', label: 'Season Leaderboard', icon: <Trophy className="w-4 h-4" /> },
    { key: 'matchdays', label: 'Match Days', icon: <Zap className="w-4 h-4" /> },
    { key: 'players', label: 'Player Stats', icon: <Users className="w-4 h-4" /> },
  ];

  const rankBadgeStyle = (rank: number) => {
    if (rank === 1) return { background: '#FFD70022', color: '#FFD700', border: '1px solid #FFD70055' };
    if (rank === 2) return { background: '#C0C0C022', color: '#C0C0C0', border: '1px solid #C0C0C055' };
    if (rank === 3) return { background: '#CD7F3222', color: '#CD7F32', border: '1px solid #CD7F3255' };
    return { background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' };
  };

  const filteredMatchDayScores = selectedMatchDay
    ? matchDayTeamScores.filter((s) => s.match_day_id === selectedMatchDay)
    : matchDayTeamScores;

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/statistics')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
              COMPETITIVE LEADERBOARD
            </h1>
            {activeSeason && (
              <p className="text-sm" style={{ color: PRIMARY }}>
                {activeSeason.name}
              </p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div
          className="flex rounded-xl p-1 gap-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
              style={
                tab === t.key
                  ? { background: PRIMARY, color: '#fff' }
                  : { color: '#64748b' }
              }
            >
              {t.icon}
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-slate-500">Loading leaderboard...</div>
        ) : !activeSeason ? (
          <div className="text-center py-16 text-slate-500">No active season.</div>
        ) : (
          <>
            {/* Season Leaderboard */}
            {tab === 'season' && (
              <div className="space-y-3">
                {seasonLeaderboard.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No team results yet this season.</p>
                ) : (
                  seasonLeaderboard.map((entry: SeasonTeamLeaderboard) => (
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
                        style={rankBadgeStyle(entry.rank)}
                      >
                        #{entry.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                          {entry.team_name}
                        </p>
                        <p className="text-xs" style={{ color: PRIMARY }}>
                          [{entry.team_tag}]
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-black text-white">{entry.season_points}</p>
                        <p className="text-xs text-slate-400">{entry.season_kills} kills</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Match Days */}
            {tab === 'matchdays' && (
              <div className="space-y-4">
                {/* Match Day Selector */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setSelectedMatchDay('')}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                    style={
                      !selectedMatchDay
                        ? { background: PRIMARY, color: '#fff' }
                        : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }
                    }
                  >
                    All
                  </button>
                  {matchDays.map((md) => (
                    <button
                      key={md.id}
                      onClick={() => setSelectedMatchDay(md.id)}
                      className="px-3 py-1 rounded-lg text-xs font-semibold transition-all"
                      style={
                        selectedMatchDay === md.id
                          ? { background: PRIMARY, color: '#fff' }
                          : { background: 'rgba(255,255,255,0.05)', color: '#64748b' }
                      }
                    >
                      {md.name}
                    </button>
                  ))}
                </div>

                {filteredMatchDayScores.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No match day results yet.</p>
                ) : (
                  <div className="space-y-3">
                    {filteredMatchDayScores.map((score: MatchDayTeamScore, idx: number) => (
                      <div
                        key={`${score.match_day_id}-${score.team_id}`}
                        className="rounded-2xl p-4 flex items-center gap-4"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          backdropFilter: 'blur(12px)',
                          border: '1px solid rgba(255,255,255,0.06)',
                        }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                          style={{ background: 'rgba(255,255,255,0.06)', color: '#64748b' }}
                        >
                          #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">{score.team_name}</p>
                          <p className="text-xs text-slate-500">{score.match_day_name} · {new Date(score.match_date).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          <p className="font-black text-white">{score.total_points} pts</p>
                          <p className="text-xs text-slate-400">{score.total_kills} kills</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Player Stats */}
            {tab === 'players' && (
              <div className="space-y-3">
                {playerSeasonStats.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">No player stats yet this season.</p>
                ) : (
                  playerSeasonStats.map((p: SeasonPlayerStats) => (
                    <div
                      key={p.user_id}
                      className="rounded-2xl p-4 flex items-center gap-3"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        backdropFilter: 'blur(12px)',
                        border: p.rank === 1 ? `1px solid ${PRIMARY}33` : '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black shrink-0"
                        style={rankBadgeStyle(p.rank)}
                      >
                        {p.rank === 1 ? <Medal className="w-4 h-4" /> : `#${p.rank}`}
                      </div>
                      <img
                        src={p.avatar_url || '/placeholder.svg'}
                        alt={p.ign}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                        style={{ border: '1.5px solid rgba(255,255,255,0.1)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white text-sm truncate">{p.ign || p.username}</p>
                        <p className="text-xs" style={{ color: PRIMARY }}>
                          {p.team_name}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-white">{p.total_points} pts</p>
                        <p className="text-xs text-slate-400">{p.total_kills} kills</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

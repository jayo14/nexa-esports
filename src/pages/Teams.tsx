import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams } from '@/hooks/useTeams';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Plus, Search, Users, Shield } from 'lucide-react';

const PRIMARY = '#ec131e';

export const Teams: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { teams, myTeam, joinTeam, isLoading } = useTeams();
  const [search, setSearch] = useState('');

  const filtered = teams.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.tag.toLowerCase().includes(search.toLowerCase())
  );

  const handleJoin = async (teamId: string, teamName: string) => {
    try {
      await joinTeam(teamId);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to join team', variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1
              className="text-2xl font-bold tracking-wider"
              style={{ fontFamily: 'Orbitron, sans-serif', color: '#fff' }}
            >
              TEAMS
            </h1>
          </div>
          <Button
            onClick={() => navigate('/teams/create')}
            disabled={!!myTeam}
            style={{ background: PRIMARY, color: '#fff' }}
            className="rounded-xl gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Team
          </Button>
        </div>

        {/* My Team Card */}
        {myTeam && (
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: `${PRIMARY}15`,
              border: `1px solid ${PRIMARY}44`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider" style={{ color: PRIMARY }}>
              <Shield className="w-4 h-4" />
              My Team
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {myTeam.logo_url ? (
                  <img src={myTeam.logo_url} alt={myTeam.name} className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black"
                    style={{ background: `${PRIMARY}22`, color: PRIMARY, fontFamily: 'Orbitron, sans-serif' }}
                  >
                    {myTeam.tag}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-white" style={{ fontFamily: 'Orbitron, sans-serif' }}>
                    {myTeam.name}
                  </h2>
                  <p className="text-sm" style={{ color: PRIMARY }}>
                    [{myTeam.tag}]
                  </p>
                </div>
              </div>
              <Button
                onClick={() => navigate(`/teams/${myTeam.id}`)}
                className="rounded-xl"
                style={{ background: PRIMARY, color: '#fff' }}
              >
                View Team
              </Button>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search teams by name or tag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-12 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
          />
        </div>

        {/* Teams Grid */}
        {isLoading ? (
          <div className="text-center py-16 text-slate-500">Loading teams...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <Users className="w-12 h-12 mx-auto text-slate-600" />
            <p className="text-slate-500">No teams found</p>
            {!myTeam && (
              <Button
                onClick={() => navigate('/teams/create')}
                style={{ background: PRIMARY, color: '#fff' }}
                className="rounded-xl"
              >
                Create the first team
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((team) => {
              const isMyTeam = myTeam?.id === team.id;
              return (
                <div
                  key={team.id}
                  className="rounded-2xl p-4 flex items-center justify-between gap-4 cursor-pointer transition-all hover:scale-[1.01]"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${isMyTeam ? PRIMARY + '44' : 'rgba(255,255,255,0.08)'}`,
                  }}
                  onClick={() => navigate(`/teams/${team.id}`)}
                >
                  <div className="flex items-center gap-3">
                    {team.logo_url ? (
                      <img src={team.logo_url} alt={team.name} className="w-12 h-12 rounded-xl object-cover" />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black"
                        style={{ background: `${PRIMARY}22`, color: PRIMARY, fontFamily: 'Orbitron, sans-serif' }}
                      >
                        {team.tag}
                      </div>
                    )}
                    <div>
                      <h3 className="font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                        {team.name}
                      </h3>
                      <p className="text-xs" style={{ color: PRIMARY }}>
                        [{team.tag}]
                      </p>
                    </div>
                  </div>

                  {!isMyTeam && (
                    <Button
                      size="sm"
                      disabled={!!myTeam}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJoin(team.id, team.name);
                      }}
                      className="rounded-xl shrink-0"
                      style={
                        myTeam
                          ? { background: 'rgba(255,255,255,0.05)', color: '#64748b' }
                          : { background: PRIMARY, color: '#fff' }
                      }
                    >
                      Join
                    </Button>
                  )}
                  {isMyTeam && (
                    <span className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ background: `${PRIMARY}22`, color: PRIMARY }}>
                      Your Team
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

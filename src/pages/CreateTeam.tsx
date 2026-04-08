import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTeams } from '@/hooks/useTeams';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';

const PRIMARY = '#ec131e';

export const CreateTeam: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { createTeam, myTeam, isLoading } = useTeams();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (myTeam) {
    navigate(`/teams/${myTeam.id}`);
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2) {
      toast({ title: 'Validation Error', description: 'Team name must be at least 2 characters.', variant: 'destructive' });
      return;
    }
    if (tag.trim().length < 2 || tag.trim().length > 6) {
      toast({ title: 'Validation Error', description: 'Team tag must be 2–6 characters.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const team = await createTeam(name.trim(), tag.trim(), logoUrl.trim() || undefined);
      navigate(`/teams/${team.id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to create team', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0a' }}>
      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/teams')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1
            className="text-2xl font-bold tracking-wider text-white"
            style={{ fontFamily: 'Orbitron, sans-serif' }}
          >
            CREATE TEAM
          </h1>
        </div>

        <div
          className="rounded-2xl p-6 space-y-6"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-300 font-semibold">Team Name *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Shadow Warriors"
                maxLength={50}
                required
                className="h-12 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 font-semibold">
                Team Tag * <span className="text-xs text-slate-500">(max 6 chars, auto-uppercased)</span>
              </Label>
              <Input
                value={tag}
                onChange={(e) => setTag(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="e.g. SHDW"
                maxLength={6}
                required
                className="h-12 rounded-xl font-mono text-lg tracking-widest"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: PRIMARY }}
              />
              <p className="text-xs text-slate-500">{tag.length}/6 characters</p>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300 font-semibold">
                Logo URL <span className="text-xs text-slate-500">(optional)</span>
              </Label>
              <Input
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://..."
                type="url"
                className="h-12 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </div>

            {/* Scoring Legend */}
            <div
              className="rounded-xl p-4 space-y-2 text-xs"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="font-semibold text-slate-300 text-sm">Scoring Formula</p>
              <p className="text-slate-400">Kill Points = kills × 2</p>
              <p className="text-slate-400">Placement: Pos 1–3 → 10pts | 4–7 → 7pts | 8–15 → 5pts | 16+ → 3pts</p>
              <p className="text-slate-400">Team Score = sum of all members' totals per lobby</p>
            </div>

            <Button
              type="submit"
              disabled={submitting || isLoading}
              className="w-full h-14 rounded-xl text-base font-bold"
              style={{ background: PRIMARY, color: '#fff' }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Team'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};


import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, Target, Calendar, Award, ArrowLeft, Copy, Share2, Smartphone } from 'lucide-react';
import { FaTiktok, FaYoutube, FaDiscord, FaInstagram } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const PublicProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({ title: "Copied!", description: "Profile link copied to clipboard" });
  };

  const getGradeColor = (grade: string) => {
    const colors = {
      'S': 'text-yellow-400 border-yellow-400/50 bg-yellow-400/20',
      'A': 'text-green-400 border-green-400/50 bg-green-400/20',
      'B': 'text-blue-400 border-blue-400/50 bg-blue-400/20',
      'C': 'text-orange-400 border-orange-400/50 bg-orange-400/20',
      'D': 'text-red-400 border-red-400/50 bg-red-400/20'
    };
    return colors[grade as keyof typeof colors] || 'text-gray-400 border-gray-400/50 bg-gray-400/20';
  };

  if (isLoading) return <div className="min-h-screen bg-[#1a0b0d] flex items-center justify-center text-white">Loading...</div>;
  if (error || !user) return <div className="min-h-screen bg-[#1a0b0d] flex flex-col items-center justify-center text-white gap-4">
    <p>User not found or error loading profile.</p>
    <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
  </div>;

  return (
    <div className="min-h-screen bg-[#1a0b0d] text-white p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <Link to="/dashboard" className="flex items-center text-white/60 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
        </Link>

        <Card className="glass-card rounded-[3rem] border-white/10 overflow-hidden">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative">
                <img
                  src={user.avatar_url || '/placeholder.svg'}
                  alt={user.username}
                  className="w-32 h-32 rounded-[2rem] border-4 border-accent-red/30 object-cover"
                />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-accent-red rounded-full flex items-center justify-center border-4 border-[#1a0b0d]">
                  <Award className="text-white w-5 h-5" />
                </div>
              </div>

              <div className="flex-1 text-center md:text-left space-y-4">
                <div className="flex flex-wrap justify-center md:justify-start items-center gap-4">
                  <h1 className="text-4xl font-display font-bold">Ɲ・乂{user.ign || user.username}</h1>
                  <Badge className={cn("px-4 py-1 rounded-full font-bold", getGradeColor(user.grade || 'D'))}>
                    Grade {user.grade || 'D'}
                  </Badge>
                </div>
                <p className="text-xl text-accent-red font-bold font-display uppercase tracking-widest">{user.tier || 'ROOKIE'}</p>
                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-white/60">
                  <span className="flex items-center gap-2"><Shield className="w-4 h-4" /> {user.player_uid || 'N/A'}</span>
                  <span className="flex items-center gap-2"><Smartphone className="w-4 h-4" /> {user.device || 'N/A'}</span>
                  <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> Joined {user.date_joined ? new Date(user.date_joined).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={copyToClipboard} className="rounded-full bg-white/5 border-white/10 hover:bg-white/10">
                  <Copy className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon" className="rounded-full bg-white/5 border-white/10 hover:bg-white/10">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Kills', value: user.kills?.toLocaleString() || '0', color: 'text-white' },
            { label: 'Attendance', value: `${user.attendance || 0}%`, color: 'text-green-400' },
            { label: 'BR Kills', value: user.br_kills?.toLocaleString() || '0', color: 'text-orange-400' },
            { label: 'MP Kills', value: user.mp_kills?.toLocaleString() || '0', color: 'text-purple-400' },
          ].map((stat, i) => (
            <div key={i} className="glass-card p-6 rounded-[2rem] text-center border-white/5">
              <div className={cn("text-2xl font-display font-bold mb-1", stat.color)}>{stat.value}</div>
              <div className="text-[10px] text-white/40 uppercase font-bold tracking-widest">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="glass-card border-white/10 rounded-[2.5rem]">
            <CardHeader><CardTitle className="font-display text-white">Social Links</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {user.tiktok_handle && (
                <div className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <FaTiktok className="text-xl text-white" />
                    <span className="text-sm font-bold">{user.tiktok_handle}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-accent-red">View</Button>
                </div>
              )}
              {/* Other socials would go here if available in user.social_links */}
            </CardContent>
          </Card>

          <Card className="glass-card border-white/10 rounded-[2.5rem]">
            <CardHeader><CardTitle className="font-display text-white">Preferred Tactics</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                <span className="text-white/40 text-sm font-bold uppercase tracking-widest">Mode</span>
                <span className="text-sm font-bold">{user.preferred_mode || 'Both'}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                <span className="text-white/40 text-sm font-bold uppercase tracking-widest">BR Class</span>
                <span className="text-sm font-bold">{user.br_class || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-black/20 rounded-2xl border border-white/5">
                <span className="text-white/40 text-sm font-bold uppercase tracking-widest">MP Class</span>
                <span className="text-sm font-bold">{user.mp_class || 'N/A'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

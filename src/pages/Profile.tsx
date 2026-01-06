import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  User, 
  Edit3, 
  Camera, 
  Trophy, 
  Target,
  Smartphone,
  Calendar,
  ExternalLink,
  Loader,
  Key,
  Instagram,
  Youtube,
  Twitter,
  Share2,
  Sword,
  Shield,
  Zap,
  CheckCircle2,
  ChevronRight,
  UserCheck
} from 'lucide-react';

export const Profile: React.FC = () => {
  const { profile, updateProfile, resetPassword, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [memberSince, setMemberSince] = useState(0);

  useEffect(() => {
    if (profile?.date_joined) {
      const days = Math.floor((Date.now() - new Date(profile.date_joined).getTime()) / (1000 * 60 * 60 * 24));
      setMemberSince(days);
    }
  }, [profile]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}/avatar_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      await updateProfile({ avatar_url: data.publicUrl });

      toast({
        title: "Success",
        description: "Avatar updated successfully",
      });
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast({
        title: "Error",
        description: "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const getGradeStyles = (grade: string) => {
    const styles = {
      'S': 'from-yellow-400 to-orange-500 shadow-yellow-500/20',
      'A': 'from-emerald-400 to-green-600 shadow-green-500/20',
      'B': 'from-blue-400 to-indigo-600 shadow-blue-500/20',
      'C': 'from-orange-400 to-red-500 shadow-orange-500/20',
      'D': 'from-slate-400 to-slate-600 shadow-slate-500/20'
    };
    return styles[grade as keyof typeof styles] || 'from-gray-400 to-gray-600';
  };

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "No email found for password reset",
        variant: "destructive",
      });
      return;
    }

    const success = await resetPassword(user.email);
    if (success) {
      toast({
        title: "Password Reset Email Sent",
        description: "Check your email for password reset instructions",
      });
    }
  };

  const getSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram className="w-5 h-5" />;
      case 'youtube': return <Youtube className="w-5 h-5" />;
      case 'twitter':
      case 'x': return <Twitter className="w-5 h-5" />;
      default: return <ExternalLink className="w-5 h-5" />;
    }
  };

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <Loader className="w-10 h-10 animate-spin text-primary" />
        <div className="text-muted-foreground animate-pulse font-medium">Loading your legend...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-[32px] blur-xl opacity-50 group-hover:opacity-75 transition duration-1000"></div>
        <Card className="relative bg-background/60 backdrop-blur-2xl border-primary/10 overflow-hidden rounded-[32px] shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 animate-pulse"></div>
          
          <CardContent className="p-6 sm:p-10">
            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
              {/* Avatar Section */}
              <div className="relative shrink-0">
                <div className="absolute -inset-2 bg-gradient-to-br from-primary to-accent rounded-full animate-spin-slow opacity-20 group-hover:opacity-40 transition-opacity"></div>
                <div className="relative h-40 w-40 rounded-full p-1.5 bg-background border-2 border-primary/20 shadow-2xl overflow-hidden">
                  <img
                    src={profile.avatar_url || '/placeholder.svg'}
                    alt={profile.ign}
                    className="h-full w-full rounded-full object-cover"
                  />
                  {uploading && (
                    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center rounded-full">
                      <Loader className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                
                <label className="absolute bottom-2 right-2 p-3 bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-xl cursor-pointer hover:scale-110 transition-all active:scale-95 z-10">
                  <Camera className="h-5 w-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} />
                </label>
              </div>

              {/* Profile Main Info */}
              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <h1 className="text-4xl font-black tracking-tight text-foreground">
                      <span className="text-primary/80 mr-1">{profile?.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}</span>
                      {profile.ign}
                    </h1>
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {profile.role}
                    </Badge>
                  </div>
                  <p className="text-lg text-muted-foreground font-medium flex items-center justify-center md:justify-start gap-2">
                    <User className="h-4 w-4 text-primary/60" />
                    @{profile.username}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${getGradeStyles(profile.grade || 'D')} text-white text-sm font-black shadow-lg flex items-center gap-2`}>
                    <Zap className="h-4 w-4" />
                    GRADE {profile.grade}
                  </div>
                  <div className="px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-black border border-accent/20 flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    {profile.tier}
                  </div>
                  <div className="px-4 py-1.5 rounded-full bg-muted text-muted-foreground text-sm font-bold flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    {profile.device || 'Mobile'}
                  </div>
                </div>

                <div className="pt-4 flex flex-wrap justify-center md:justify-start gap-4">
                  <Button onClick={() => navigate('/settings')} className="rounded-2xl h-12 px-6 font-bold gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-all">
                    <Edit3 className="h-4 w-4" />
                    Edit Profile
                  </Button>
                  <Button variant="outline" onClick={() => navigate(`/public-profile/${profile.id}`)} className="rounded-2xl h-12 px-6 font-bold gap-2 border-2 hover:bg-muted/50 transition-all">
                    <Share2 className="h-4 w-4" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Stats Summary */}
              <div className="hidden lg:grid grid-cols-1 gap-3 w-48">
                <div className="p-4 rounded-[24px] bg-primary/5 border border-primary/10 text-center space-y-1">
                  <div className="text-2xl font-black text-primary">{profile.attendance}%</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Attendance</div>
                </div>
                <div className="p-4 rounded-[24px] bg-accent/5 border border-accent/10 text-center space-y-1">
                  <div className="text-2xl font-black text-accent">{memberSince}</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Days Joined</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Kills', value: profile.kills?.toLocaleString(), icon: Sword, color: 'text-primary' },
          { label: 'BR Kills', value: profile.br_kills?.toLocaleString(), icon: Shield, color: 'text-blue-500' },
          { label: 'MP Kills', value: profile.mp_kills?.toLocaleString(), icon: Zap, color: 'text-yellow-500' },
          { label: 'Clan Role', value: profile.role, icon: UserCheck, color: 'text-purple-500', isLabel: true },
        ].map((stat, i) => (
          <Card key={i} className="bg-background/40 backdrop-blur-xl border-primary/5 rounded-[24px] shadow-sm hover:border-primary/20 transition-all group">
            <CardContent className="p-4 sm:p-6 text-center space-y-2">
              <div className={`mx-auto w-12 h-12 rounded-2xl bg-background border-2 border-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xl sm:text-2xl font-black tracking-tight">{stat.value || 0}</div>
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Detailed Info */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="bg-background/40 backdrop-blur-xl border-primary/5 rounded-[32px] shadow-sm overflow-hidden">
            <CardHeader className="border-b border-primary/5 px-8">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                Detailed Intel
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                {[
                  { label: 'Player UID', value: profile.player_uid, icon: Shield },
                  { label: 'Preferred Mode', value: profile.preferred_mode, icon: Zap },
                  { label: 'In-Game Name', value: profile.ign, icon: User },
                  { label: 'Join Date', value: profile.date_joined, icon: Calendar },
                ].map((item, i) => (
                  <div key={i} className="space-y-2 group">
                    <div className="flex items-center gap-2 text-muted-foreground group-hover:text-primary transition-colors">
                      <item.icon className="h-4 w-4" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
                    </div>
                    <div className="text-base font-bold pl-6 border-l-2 border-primary/10 group-hover:border-primary transition-colors">
                      {item.value || 'Not Disclosed'}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Social Presence */}
          <Card className="bg-background/40 backdrop-blur-xl border-primary/5 rounded-[32px] shadow-sm overflow-hidden">
            <CardHeader className="border-b border-primary/5 px-8">
              <CardTitle className="text-xl font-black flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10">
                  <Share2 className="h-5 w-5 text-accent" />
                </div>
                Social Presence
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {profile.tiktok_handle && (
                   <a 
                   href={`https://tiktok.com/@${profile.tiktok_handle.replace('@', '')}`}
                   target="_blank" 
                   rel="noreferrer"
                   className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/20 hover:bg-muted/50 transition-all group"
                 >
                   <div className="flex items-center gap-3">
                     <div className="p-2 rounded-xl bg-background group-hover:scale-110 transition-transform">
                       <Zap className="h-5 w-5 text-[#ff0050]" />
                     </div>
                     <div className="space-y-0.5">
                       <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">TikTok</div>
                       <div className="text-sm font-bold">{profile.tiktok_handle}</div>
                     </div>
                   </div>
                   <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                 </a>
                )}
                
                {profile.social_links && Object.entries(profile.social_links as Record<string, string>).map(([platform, handle], i) => (
                  <a 
                    key={i}
                    href={platform === 'discord' ? '#' : `https://${platform}.com/${handle.replace('@', '')}`}
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-transparent hover:border-primary/20 hover:bg-muted/50 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-background group-hover:scale-110 transition-transform">
                        {getSocialIcon(platform)}
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest capitalize">{platform}</div>
                        <div className="text-sm font-bold">{handle}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </a>
                ))}

                {(!profile.tiktok_handle && (!profile.social_links || Object.keys(profile.social_links).length === 0)) && (
                  <div className="col-span-full text-center py-6 text-muted-foreground font-medium italic">
                    No social footprints found...
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Security & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gradient-to-br from-primary/5 to-accent/5 backdrop-blur-xl border-primary/10 rounded-[32px] shadow-sm overflow-hidden">
            <CardHeader className="px-8 pt-8">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                < Shield className="h-5 w-5 text-primary" />
                Security Hub
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-4 space-y-6">
              <div className="p-5 rounded-2xl bg-background/50 border border-primary/5 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="text-sm font-bold">Email Verified</div>
                    <div className="text-xs text-muted-foreground">{user?.email}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={handlePasswordReset}
                  variant="outline" 
                  className="w-full h-14 rounded-2xl font-bold gap-3 border-2 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all group"
                >
                  <Key className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                  Reset Password
                </Button>
                <p className="text-[10px] text-center text-muted-foreground font-medium px-4">
                  A reset link will be sent to your registered email address.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Mini */}
          <Card className="bg-background/40 backdrop-blur-xl border-primary/5 rounded-[32px] shadow-sm p-6">
             <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Battle Prowess</span>
                <Sword className="h-4 w-4 text-primary" />
             </div>
             <div className="space-y-4">
                <div className="space-y-2">
                   <div className="flex justify-between text-xs font-bold">
                      <span>Combat Activity</span>
                      <span>{profile.attendance}%</span>
                   </div>
                   <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${profile.attendance}%` }} />
                   </div>
                </div>
                <div className="pt-2 border-t border-primary/5">
                   <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                         <Target className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                         <div className="text-xs font-black text-muted-foreground uppercase tracking-widest">Mastery Status</div>
                         <div className="text-sm font-black text-foreground capitalize">{profile.status || 'Active'} Operative</div>
                      </div>
                   </div>
                </div>
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;

import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, ExternalLink, Target, Calendar, Award, Users, ArrowLeft, Copy, Share2, ChevronDown, Smartphone } from 'lucide-react';
import { FaTiktok, FaYoutube, FaDiscord, FaInstagram } from 'react-icons/fa';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FacebookShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  TelegramShareButton,
  FacebookIcon,
  TwitterIcon,
  WhatsappIcon,
  TelegramIcon,
} from 'react-share';

// Mock user data - in real app would fetch based on IGN
const mockUser = {
  ign: 'slayerX',
  player_uid: 'CDM001234567',
  avatar: '/placeholder.svg',
  kills: 15420,
  attendance: 85,
  grade: 'S',
  tier: 'Elite Slayer',
  device: 'iPhone 15 Pro',
  mode: 'Both',
  class: 'Ninja',
  dateJoined: '2024-01-15',
  socials: {
    tiktok: '@slayerx_gaming',
    youtube: 'SlayerX Gaming',
    discord: 'slayerx#1337',
    instagram: '@slayerx_codm'
  },
  loadouts: [
    {
      id: '1',
      name: 'Assault Domination',
      mode: 'MP',
      primaryWeapon: 'AK-47 - Red Dot, Extended Mag, Compensator'
    },
    {
      id: '2',
      name: 'BR Ninja Setup',
      mode: 'BR',
      primaryWeapon: 'M4 - Holographic Sight, Foregrip, Extended Mag'
    }
  ],
  stats: {
    totalMatches: 342,
    winRate: 78,
    avgKills: 12.4,
    bestKillGame: 28
  }
};

export const PublicProfile: React.FC = () => {
  const { ign } = useParams<{ ign: string }>();
  const { toast } = useToast();
  
  // In real app, would fetch user data based on IGN
  const user = mockUser;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Profile link copied to clipboard",
    });
  };

  const handleShare = async () => {
    const shareData = {
      title: `${user.ign} - NeXa Esports Player Profile`,
      text: `Check out ${user.ign}'s profile on NeXa Esports! Grade ${user.grade} | ${user.tier} | ${user.kills.toLocaleString()} Kills`,
      url: window.location.href,
    };

    try {
      // Check if Web Share API is supported
      if (navigator.share) {
        await navigator.share(shareData);
        toast({
          title: "Shared!",
          description: "Profile shared successfully",
        });
      } else {
        // Fallback to copying link if Web Share API not supported
        await navigator.clipboard.writeText(window.location.href);
        toast({
          title: "Link Copied!",
          description: "Share link copied to clipboard (Web Share not supported)",
        });
      }
    } catch (error: any) {
      // User cancelled share or error occurred
      if (error.name !== 'AbortError') {
        console.error('Error sharing:', error);
        toast({
          title: "Share Failed",
          description: "Could not share profile",
          variant: "destructive",
        });
      }
    }
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

  const getModeColor = (mode: string) => {
    return mode === 'BR' 
      ? 'bg-green-500/20 text-green-400 border-green-500/50' 
      : 'bg-purple-500/20 text-purple-400 border-purple-500/50';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-red-600/10 border-b border-border/30 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-6 md:px-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-primary to-red-600 rounded-xl flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 md:w-10 md:h-10 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-orbitron font-bold text-foreground">NeXa_Esports</h1>
                <p className="text-sm text-muted-foreground font-rajdhani">Public Player Profile</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Share Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    className="font-rajdhani bg-primary hover:bg-primary/90 shadow-lg"
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share via System
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-2">
                    <p className="text-xs text-muted-foreground mb-2">Share on Social Media</p>
                    <div className="flex items-center gap-2 justify-center">
                      <FacebookShareButton
                        url={window.location.href}
                        quote={`Check out ${user.ign}'s profile on NeXa Esports! Grade ${user.grade} | ${user.tier}`}
                        hashtag="#NeXaEsports"
                      >
                        <FacebookIcon size={32} round />
                      </FacebookShareButton>
                      <TwitterShareButton
                        url={window.location.href}
                        title={`Check out ${user.ign}'s profile on NeXa Esports!`}
                        hashtags={['NeXaEsports', 'CODM', user.tier.replace(' ', '')]}
                      >
                        <TwitterIcon size={32} round />
                      </TwitterShareButton>
                      <WhatsappShareButton
                        url={window.location.href}
                        title={`Check out ${user.ign}'s NeXa Esports profile - Grade ${user.grade} | ${user.tier}`}
                      >
                        <WhatsappIcon size={32} round />
                      </WhatsappShareButton>
                      <TelegramShareButton
                        url={window.location.href}
                        title={`${user.ign} - NeXa Esports Player`}
                      >
                        <TelegramIcon size={32} round />
                      </TelegramShareButton>
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(window.location.href)}
                className="font-rajdhani hover:border-primary/50"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Link to="/" className="hidden md:flex text-primary hover:text-primary/80 font-rajdhani items-center transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 md:px-6 space-y-6 md:space-y-8">
        {/* Player Header */}
        <Card className="bg-gradient-to-br from-card/80 to-card/50 border-border/30 shadow-xl backdrop-blur-sm">
          <CardContent className="p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="relative">
                <img
                  src={user.avatar}
                  alt={user.ign}
                  className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-primary/30 shadow-lg"
                />
                <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center border-4 border-background shadow-lg">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <h1 className="text-2xl md:text-3xl font-orbitron font-bold text-foreground">Ɲ・乂{user.ign}</h1>
                  <Badge className={`${getGradeColor(user.grade)} px-4 py-1.5 text-sm font-bold`}>
                    Grade {user.grade}
                  </Badge>
                </div>
                <p className="text-lg md:text-xl text-primary font-rajdhani font-bold mb-3">{user.tier}</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground font-rajdhani">
                  <span className="flex items-center gap-1.5">
                    <Shield className="w-4 h-4" />
                    {user.player_uid}
                  </span>
                  <span className="hidden md:inline">•</span>
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" />
                    {user.device}
                  </span>
                  <span className="hidden md:inline">•</span>
                  <span className="flex items-center gap-1.5">
                    <Target className="w-4 h-4" />
                    {user.mode}
                  </span>
                  <span className="hidden md:inline">•</span>
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {new Date(user.dateJoined).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <Card className="bg-gradient-to-br from-card/80 to-card/50 border-border/30 hover:border-primary/30 transition-all shadow-lg group">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-bold text-primary mb-2 font-orbitron group-hover:scale-110 transition-transform">{user.kills.toLocaleString()}</div>
              <div className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Total Kills</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card/80 to-card/50 border-border/30 hover:border-primary/30 transition-all shadow-lg group">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-bold text-green-400 mb-2 font-orbitron group-hover:scale-110 transition-transform">{user.attendance}%</div>
              <div className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Attendance</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card/80 to-card/50 border-border/30 hover:border-primary/30 transition-all shadow-lg group">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-bold text-blue-400 mb-2 font-orbitron group-hover:scale-110 transition-transform">{user.stats.winRate}%</div>
              <div className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Win Rate</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-card/80 to-card/50 border-border/30 hover:border-primary/30 transition-all shadow-lg group">
            <CardContent className="p-5 text-center">
              <div className="text-3xl font-bold text-yellow-400 mb-2 font-orbitron group-hover:scale-110 transition-transform">{user.stats.avgKills}</div>
              <div className="text-xs text-muted-foreground font-rajdhani uppercase tracking-wider">Avg Kills</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Social Media */}
          <Card className="bg-card/50 border-border/30">
            <CardHeader>
              <CardTitle className="font-orbitron text-foreground flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" />
                Social Media
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.socials.tiktok && (
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-card/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff0050] to-[#00f2ea] flex items-center justify-center">
                      <FaTiktok className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-rajdhani">TikTok</p>
                      <p className="text-sm font-medium text-foreground font-rajdhani">{user.socials.tiktok}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" asChild className="text-primary hover:text-primary/80 group-hover:translate-x-1 transition-transform">
                    <a href={`https://tiktok.com/${user.socials.tiktok}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              )}
              
              {user.socials.youtube && (
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-card/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#FF0000] flex items-center justify-center">
                      <FaYoutube className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-rajdhani">YouTube</p>
                      <p className="text-sm font-medium text-foreground font-rajdhani">{user.socials.youtube}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" asChild className="text-primary hover:text-primary/80 group-hover:translate-x-1 transition-transform">
                    <a href={`https://youtube.com/@${user.socials.youtube}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              )}
              
              {user.socials.discord && (
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-card/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center">
                      <FaDiscord className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-rajdhani">Discord</p>
                      <p className="text-sm font-medium text-foreground font-rajdhani">{user.socials.discord}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-primary hover:text-primary/80 group-hover:translate-x-1 transition-transform"
                    onClick={() => {
                      navigator.clipboard.writeText(user.socials.discord);
                      toast({
                        title: "Copied!",
                        description: "Discord username copied to clipboard",
                      });
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {user.socials.instagram && (
                <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-border/50 hover:border-primary/30 hover:bg-card/30 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#833AB4] via-[#FD1D1D] to-[#F77737] flex items-center justify-center">
                      <FaInstagram className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground font-rajdhani">Instagram</p>
                      <p className="text-sm font-medium text-foreground font-rajdhani">{user.socials.instagram}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" asChild className="text-primary hover:text-primary/80 group-hover:translate-x-1 transition-transform">
                    <a href={`https://instagram.com/${user.socials.instagram}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loadouts */}
          <Card className="bg-card/50 border-border/30">
            <CardHeader>
              <CardTitle className="font-orbitron text-foreground flex items-center">
                <Target className="w-5 h-5 mr-2 text-primary" />
                Featured Loadouts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {user.loadouts.map(loadout => (
                <div key={loadout.id} className="p-3 bg-background/50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-rajdhani font-medium text-foreground">{loadout.name}</h4>
                    <Badge className={getModeColor(loadout.mode)}>
                      {loadout.mode}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground font-rajdhani">{loadout.primaryWeapon}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Performance Stats */}
        <Card className="bg-card/50 border-border/30">
          <CardHeader>
            <CardTitle className="font-orbitron text-foreground flex items-center">
              <Award className="w-5 h-5 mr-2 text-primary" />
              Performance Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground mb-1 font-orbitron">{user.stats.totalMatches}</div>
                <div className="text-sm text-muted-foreground font-rajdhani">Total Matches</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400 mb-1 font-orbitron">{user.stats.winRate}%</div>
                <div className="text-sm text-muted-foreground font-rajdhani">Win Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400 mb-1 font-orbitron">{user.stats.avgKills}</div>
                <div className="text-sm text-muted-foreground font-rajdhani">Average Kills</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400 mb-1 font-orbitron">{user.stats.bestKillGame}</div>
                <div className="text-sm text-muted-foreground font-rajdhani">Best Kill Game</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

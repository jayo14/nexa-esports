import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { useAdminPlayers, useUpdatePlayer, useDeletePlayer } from '@/hooks/useAdminPlayers';
import { useAuth } from '@/contexts/AuthContext';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { logPlayerBan, logPlayerUnban, logRoleChange } from '@/lib/activityLogger';
import { Search, Edit, Trash2, Eye, CalendarIcon, ShieldCheck, ShieldOff, UserCog, Crown, User, MoreVertical, X, Check, ArrowDown, ArrowUp, BarChart, Users, Target, TrendingUp, Mail, Smartphone, Trophy, Crosshair, ExternalLink, Instagram, Youtube, Twitter, Share2 } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import PlayerProfileModal from '@/components/PlayerProfileModal';

type Player = Database['public']['Tables']['profiles']['Row'] & {
  email?: string | null;
};

// Constants
const TOP_RANKS_THRESHOLD = 10;

const PlayerCard = ({ player, onBan, onUnban, onEdit, onDelete, onDetails, leaderboardRank }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'clan_master': return <Crown className="w-4 h-4 text-purple-400" />;
      case 'admin': return <ShieldCheck className="w-4 h-4 text-red-400" />;
      case 'moderator': return <UserCog className="w-4 h-4 text-yellow-400" />;
      default: return <User className="w-4 h-4 text-green-400" />;
    }
  };

  const getGradeColor = (grade: string) => {
    const colors = {
      'Legendary': 'from-yellow-500 to-orange-500',
      'Master': 'from-purple-500 to-pink-500',
      'Pro': 'from-blue-500 to-cyan-500',
      'Elite': 'from-green-500 to-emerald-500',
      'Rookie': 'from-gray-500 to-slate-500',
      'S': 'from-yellow-500 to-orange-500',
      'A': 'from-green-500 to-emerald-500',
      'B': 'from-blue-500 to-cyan-500',
      'C': 'from-orange-500 to-red-500',
      'D': 'from-gray-500 to-slate-500'
    };
    return colors[grade] || 'from-gray-500 to-slate-500';
  };

  const getInitials = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || '?';
  };

  const roleName = player.role === 'clan_master' ? 'Clan Master' : player.role.charAt(0).toUpperCase() + player.role.slice(1);
  
  // Get player symbol prefix
  const playerPrefix = player.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂';

  return (
    <Card 
      className={cn(
        "bg-gradient-to-br from-background/40 via-background/20 to-background/40 backdrop-blur-xl border border-[#FF1F44]/20 shadow-2xl relative overflow-hidden cursor-pointer group",
        "transition-all duration-300 hover:border-[#FF1F44]/60 hover:shadow-[0_0_30px_rgba(255,31,68,0.3)] hover:scale-[1.02]",
        player.is_banned && "opacity-50 grayscale"
      )}
      onClick={() => onDetails(player)}
    >
      {/* Sci-fi corner decorations */}
      <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-[#FF1F44]/40"></div>
      <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-[#FF1F44]/40"></div>
      <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-[#FF1F44]/40"></div>
      <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-[#FF1F44]/40"></div>
      
      {/* Scan line effect */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FF1F44]/5 to-transparent animate-pulse pointer-events-none"></div>
      
      <CardHeader className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            {/* Avatar with soldier silhouette fallback */}
            <div className="relative">
              {player.avatar_url ? (
                <img 
                  src={player.avatar_url} 
                  alt={player.username} 
                  className="w-20 h-20 rounded-lg object-cover border-2 border-[#FF1F44]/30 shadow-lg" 
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gradient-to-br from-[#FF1F44]/20 to-background/40 border-2 border-[#FF1F44]/30 flex items-center justify-center">
                  <span className="text-3xl font-bold text-[#FF1F44]">{getInitials(player.ign)}</span>
                </div>
              )}
              {player.is_banned && (
                <div className="absolute inset-0 bg-black/80 rounded-lg flex items-center justify-center">
                  <ShieldOff className="w-10 h-10 text-red-500" />
                </div>
              )}
              {/* Leaderboard rank badge */}
              {leaderboardRank && leaderboardRank <= TOP_RANKS_THRESHOLD && (
                <div className="absolute -top-2 -right-2 bg-gradient-to-br from-yellow-400 to-orange-500 text-black rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-lg">
                  #{leaderboardRank}
                </div>
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#FF1F44] text-xs font-mono">{playerPrefix}</span>
                <h3 className="text-lg font-bold text-white truncate font-orbitron">{player.ign}</h3>
              </div>
              <p className="text-sm text-gray-400 truncate">@{player.username}</p>
              {player.email && (
                <div className="flex items-center gap-1 mt-1">
                  <Mail className="w-3 h-3 text-gray-500" />
                  <p className="text-xs text-gray-500 truncate">{player.email}</p>
                </div>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="hover:bg-[#FF1F44]/20">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-md border-[#FF1F44]/30">
              {(profile?.role === 'admin' || profile?.role === 'clan_master') && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(player); }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {player.is_banned ? (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onUnban(player); }} disabled={player.role === 'clan_master'}>
                  <Check className="w-4 h-4 mr-2" />
                  Unban
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onBan(player); }} disabled={player.role === 'clan_master'}>
                  <X className="w-4 h-4 mr-2" />
                  Ban
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate(`/profile/${player.id}`); }}>
                <Share2 className="w-4 h-4 mr-2" />
                Public Profile
              </DropdownMenuItem>
              {profile?.role === 'clan_master' && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(player.id); }} className="text-red-500">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Role and Grade Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-gradient-to-r from-[#FF1F44]/20 to-red-600/20 border border-[#FF1F44]/30 text-white">
            {getRoleIcon(player.role)}
            <span className="ml-1">{roleName}</span>
          </Badge>
          {player.grade && (
            <Badge className={`bg-gradient-to-r ${getGradeColor(player.grade)} text-white border-0`}>
              {player.grade}
            </Badge>
          )}
          {player.tier && (
            <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
              Tier {player.tier}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        {/* Combat Statistics - Soldier Analysis Style */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-400 uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Target className="w-3 h-3" />
              Combat Stats
            </span>
            {leaderboardRank && (
              <span className="text-[#FF1F44]">Rank #{leaderboardRank}</span>
            )}
          </div>
          
          {/* Total Kills */}
          <div className="bg-gradient-to-r from-[#FF1F44]/10 to-transparent p-3 rounded-lg border-l-2 border-[#FF1F44]">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400 uppercase">Total Eliminations</span>
              <span className="text-2xl font-bold text-[#FF1F44] font-mono">{player.kills?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between items-center mt-1 text-xs">
              <span className="text-blue-400">BR: {player.br_kills || 0}</span>
              <span className="text-green-400">MP: {player.mp_kills || 0}</span>
            </div>
          </div>
          
          {/* Attendance and Device */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-background/40 p-2 rounded-md border border-green-500/20">
              <div className="flex items-center justify-between">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-lg font-bold text-green-400">{player.attendance || 0}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Attendance</p>
            </div>
            <div className="bg-background/40 p-2 rounded-md border border-blue-500/20">
              <div className="flex items-center justify-between">
                <Smartphone className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-bold text-blue-400 truncate">{player.device || 'Mobile'}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Device</p>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        {player.preferred_mode && (
          <div className="text-xs text-gray-400">
            <span className="text-gray-500">Mode:</span> <span className="text-white">{player.preferred_mode}</span>
          </div>
        )}
        
        {/* Status Indicator */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-xs text-gray-500">Status</span>
          <div className={cn(
            "flex items-center gap-1 text-xs font-semibold",
            player.is_banned ? "text-red-400" : "text-green-400"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full",
              player.is_banned ? "bg-red-400 animate-pulse" : "bg-green-400 animate-pulse"
            )}></div>
            {player.is_banned ? "BANNED" : "ACTIVE"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


export const AdminPlayers: React.FC = () => {
  const { profile } = useAuth();
  const { data: players, isLoading } = useAdminPlayers();
  const { data: leaderboardData } = useLeaderboard();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [sortBy, setSortBy] = useState('kills');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [banningPlayer, setBanningPlayer] = useState<Player | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banDate, setBanDate] = useState<Date | undefined>(new Date(new Date().setDate(new Date().getDate() + 7)));
  const { toast } = useToast();

  // Create leaderboard rank map
  const leaderboardRankMap = useMemo(() => {
    const map = new Map();
    leaderboardData?.forEach((entry, index) => {
      map.set(entry.id, index + 1);
    });
    return map;
  }, [leaderboardData]);

  const filteredPlayers = useMemo(() => players?.filter(player => {
    const matchesSearch = player.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.ign?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || player.role === filterRole;
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'active' && !player.is_banned) ||
                         (filterStatus === 'banned' && player.is_banned);
    const matchesGrade = filterGrade === 'all' || player.grade === filterGrade;
    return matchesSearch && matchesRole && matchesStatus && matchesGrade;
  }).sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'kills':
        aValue = a.kills || 0;
        bValue = b.kills || 0;
        break;
      case 'br_kills':
        aValue = a.br_kills || 0;
        bValue = b.br_kills || 0;
        break;
      case 'mp_kills':
        aValue = a.mp_kills || 0;
        bValue = b.mp_kills || 0;
        break;
      case 'attendance':
        aValue = a.attendance || 0;
        bValue = b.attendance || 0;
        break;
      case 'name':
        aValue = a.ign?.toLowerCase() || '';
        bValue = b.ign?.toLowerCase() || '';
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      case 'date_joined':
        aValue = new Date(a.date_joined || 0).getTime();
        bValue = new Date(b.date_joined || 0).getTime();
        break;
      case 'rank':
        aValue = leaderboardRankMap.get(a.id) || 9999;
        bValue = leaderboardRankMap.get(b.id) || 9999;
        break;
      default:
        aValue = a.kills || 0;
        bValue = b.kills || 0;
    }
    
    return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
  }) || [], [players, searchTerm, filterRole, filterStatus, filterGrade, sortBy, sortOrder, leaderboardRankMap]);

  const handleUpdatePlayer = async (updates: Partial<Player>) => {
    if (!editingPlayer) return;
    if (updates.role && updates.role !== editingPlayer.role) {
      await logRoleChange(editingPlayer.id, editingPlayer.ign, editingPlayer.role, updates.role);
    }
    await updatePlayer.mutateAsync({ id: editingPlayer.id, updates });
    setEditingPlayer(null);
  };

  const handleDeletePlayer = async (playerId: string) => {
    await deletePlayer.mutateAsync(playerId);
  };

  const handleBanPlayer = (player: Player) => {
    if (player.role === 'clan_master') {
      toast({ title: "Permission Denied", description: "The Clan Master cannot be banned.", variant: "destructive" });
      return;
    }
    setBanningPlayer(player);
    setBanReason('');
    setBanType('temporary');
    setBanDate(new Date(new Date().setDate(new Date().getDate() + 7)));
  };

  const handleConfirmBan = async () => {
    if (!banningPlayer) return;
    if (banningPlayer.role === 'clan_master') {
      toast({ title: "Permission Denied", description: "The Clan Master cannot be banned.", variant: "destructive" });
      return;
    }
    if (!banReason) {
      toast({ title: "Reason Required", description: "Please provide a reason for the ban.", variant: "destructive" });
      return;
    }
    if (banType === 'temporary' && !banDate) return;

    const banExpiresAt = banType === 'temporary' ? banDate?.toISOString() : null;
    await updatePlayer.mutateAsync({
      id: banningPlayer.id,
      updates: { is_banned: true, banned_at: new Date().toISOString(), ban_reason: banReason, ban_expires_at: banExpiresAt, banned_by: profile?.id }
    });
    await logPlayerBan(banningPlayer.id, banningPlayer.ign, banReason);
    toast({ title: "Player Banned", description: `${banningPlayer.ign} has been banned.`, variant: 'destructive' });
    setBanningPlayer(null);
  };

  const handleUnbanPlayer = async (player: Player) => {
    await updatePlayer.mutateAsync({
      id: player.id,
      updates: { is_banned: false, banned_at: null, ban_reason: null, ban_expires_at: null, banned_by: null }
    });
    await logPlayerUnban(player.id, player.ign);
    toast({ title: "Player Unbanned", description: `${player.ign} has been unbanned.` });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-foreground">Loading players...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-orbitron">Players Management</h1>
          <p className="text-muted-foreground">Monitor, manage, and moderate all clan members.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 p-2 bg-card/50 border-border/30 rounded-lg">
            <Users className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">{players?.length || 0}</span>
            <span className="text-muted-foreground">Total Players</span>
          </div>
        </div>
      </div>

      <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Search */}
            <div className="relative lg:col-span-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 text-foreground"
                placeholder="Search by name, username, or email..."
              />
            </div>
            
            {/* Role Filter */}
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="bg-background/50 border-border/50 text-foreground">
                <SelectValue placeholder="Filter by Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="clan_master">Clan Master</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Status Filter */}
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-background/50 border-border/50 text-foreground">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="banned">Banned Only</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Grade Filter */}
            <Select value={filterGrade} onValueChange={setFilterGrade}>
              <SelectTrigger className="bg-background/50 border-border/50 text-foreground">
                <SelectValue placeholder="Filter by Grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="Legendary">Legendary</SelectItem>
                <SelectItem value="Master">Master</SelectItem>
                <SelectItem value="Pro">Pro</SelectItem>
                <SelectItem value="Elite">Elite</SelectItem>
                <SelectItem value="Rookie">Rookie</SelectItem>
                <SelectItem value="S">S</SelectItem>
                <SelectItem value="A">A</SelectItem>
                <SelectItem value="B">B</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="D">D</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Sort Options - Second Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {/* Sort By */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="bg-background/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="kills">
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-2" />
                    Total Kills
                  </div>
                </SelectItem>
                <SelectItem value="br_kills">
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-2 text-blue-400" />
                    BR Kills
                  </div>
                </SelectItem>
                <SelectItem value="mp_kills">
                  <div className="flex items-center">
                    <Target className="w-4 h-4 mr-2 text-green-400" />
                    MP Kills
                  </div>
                </SelectItem>
                <SelectItem value="attendance">
                  <div className="flex items-center">
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Attendance Score
                  </div>
                </SelectItem>
                <SelectItem value="rank">
                  <div className="flex items-center">
                    <Trophy className="w-4 h-4 mr-2 text-yellow-400" />
                    Leaderboard Rank
                  </div>
                </SelectItem>
                <SelectItem value="name">
                  <div className="flex items-center">
                    <User className="w-4 h-4 mr-2" />
                    Name (A-Z)
                  </div>
                </SelectItem>
                <SelectItem value="date_joined">
                  <div className="flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Date Joined
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Sort Order */}
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="bg-background/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">
                  <div className="flex items-center">
                    <ArrowDown className="w-4 h-4 mr-2" />
                    Descending (High to Low)
                  </div>
                </SelectItem>
                <SelectItem value="asc">
                  <div className="flex items-center">
                    <ArrowUp className="w-4 h-4 mr-2" />
                    Ascending (Low to High)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredPlayers.map((player) => (
          <PlayerCard 
            key={player.id} 
            player={player}
            leaderboardRank={leaderboardRankMap.get(player.id)}
            onBan={handleBanPlayer}
            onUnban={handleUnbanPlayer}
            onEdit={setEditingPlayer}
            onDelete={(id) => {
              const playerToDelete = players?.find(p => p.id === id);
              if (playerToDelete) {
                if (confirm(`Are you sure you want to delete ${playerToDelete.ign}? This action is irreversible.`)) {
                  handleDeletePlayer(id);
                }
              }
            }}
            onDetails={setSelectedPlayer}
          />
        ))}
      </div>

      {filteredPlayers.length === 0 && !isLoading && (
        <div className="text-center py-12 col-span-full">
          <p className="text-muted-foreground">No players found matching your criteria.</p>
        </div>
      )}

      {/* Edit Player Dialog */}
      {editingPlayer && (
        <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-md border-[#FF1F44]/30">
            <DialogHeader>
              <DialogTitle className="text-foreground font-orbitron text-2xl">
                Edit Player: {editingPlayer.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{editingPlayer.ign}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#FF1F44]">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>In-Game Name (IGN)</Label>
                    <Input 
                      value={editingPlayer.ign || ''} 
                      onChange={(e) => setEditingPlayer({...editingPlayer, ign: e.target.value})}
                      className="bg-background/50 border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Username</Label>
                    <Input 
                      value={editingPlayer.username || ''} 
                      onChange={(e) => setEditingPlayer({...editingPlayer, username: e.target.value})}
                      className="bg-background/50 border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={editingPlayer.status || 'active'} onValueChange={(value) => setEditingPlayer({...editingPlayer, status: value})}>
                      <SelectTrigger className="bg-background/50 border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active (Ɲ・乂)</SelectItem>
                        <SelectItem value="beta">Beta (Ɲ・乃)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Role & Progression */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#FF1F44]">Role & Progression</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={editingPlayer.role} onValueChange={(value: any) => setEditingPlayer({...editingPlayer, role: value})}>
                      <SelectTrigger className="bg-background/50 border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player">Player</SelectItem>
                        <SelectItem value="moderator">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="clan_master">Clan Master</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Grade</Label>
                    <Select value={editingPlayer.grade || ''} onValueChange={(value) => setEditingPlayer({...editingPlayer, grade: value})}>
                      <SelectTrigger className="bg-background/50 border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Legendary">Legendary</SelectItem>
                        <SelectItem value="Master">Master</SelectItem>
                        <SelectItem value="Pro">Pro</SelectItem>
                        <SelectItem value="Elite">Elite</SelectItem>
                        <SelectItem value="Rookie">Rookie</SelectItem>
                        <SelectItem value="S">S</SelectItem>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Tier</Label>
                    <Input 
                      value={editingPlayer.tier || ''} 
                      onChange={(e) => setEditingPlayer({...editingPlayer, tier: e.target.value})}
                      placeholder="e.g., I, II, III"
                      className="bg-background/50 border-white/20"
                    />
                  </div>
                </div>
              </div>

              {/* Combat Statistics */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#FF1F44]">Combat Statistics</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>BR Kills</Label>
                    <Input 
                      type="number"
                      value={editingPlayer.br_kills || 0} 
                      onChange={(e) => setEditingPlayer({...editingPlayer, br_kills: parseInt(e.target.value) || 0})}
                      className="bg-background/50 border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>MP Kills</Label>
                    <Input 
                      type="number"
                      value={editingPlayer.mp_kills || 0} 
                      onChange={(e) => setEditingPlayer({...editingPlayer, mp_kills: parseInt(e.target.value) || 0})}
                      className="bg-background/50 border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Kills (Auto-calculated)</Label>
                    <Input 
                      type="number"
                      value={(editingPlayer.br_kills || 0) + (editingPlayer.mp_kills || 0)} 
                      disabled
                      className="bg-background/30 border-white/20 text-gray-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Attendance Score</Label>
                    <Input 
                      type="number"
                      value={editingPlayer.attendance || 0} 
                      onChange={(e) => setEditingPlayer({...editingPlayer, attendance: parseInt(e.target.value) || 0})}
                      min="0"
                      className="bg-background/50 border-white/20"
                    />
                    <p className="text-xs text-gray-500">Number of times present</p>
                  </div>
                </div>
              </div>

              {/* Game Preferences */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-[#FF1F44]">Game Preferences</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>BR Class</Label>
                    <Input 
                      value={editingPlayer.br_class || ''} 
                      onChange={(e) => setEditingPlayer({...editingPlayer, br_class: e.target.value})}
                      placeholder="e.g., Medic, Scout"
                      className="bg-background/50 border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>MP Class</Label>
                    <Input 
                      value={editingPlayer.mp_class || ''} 
                      onChange={(e) => setEditingPlayer({...editingPlayer, mp_class: e.target.value})}
                      placeholder="e.g., Assault, Sniper"
                      className="bg-background/50 border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Player Type</Label>
                    <Select value={editingPlayer.player_type || ''} onValueChange={(value: any) => setEditingPlayer({...editingPlayer, player_type: value})}>
                      <SelectTrigger className="bg-background/50 border-white/20">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aggressive">Aggressive</SelectItem>
                        <SelectItem value="defensive">Defensive</SelectItem>
                        <SelectItem value="support">Support</SelectItem>
                        <SelectItem value="versatile">Versatile</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => handleUpdatePlayer({ 
                  ign: editingPlayer.ign,
                  username: editingPlayer.username,
                  status: editingPlayer.status,
                  role: editingPlayer.role, 
                  grade: editingPlayer.grade,
                  tier: editingPlayer.tier,
                  br_kills: editingPlayer.br_kills,
                  mp_kills: editingPlayer.mp_kills,
                  kills: (editingPlayer.br_kills || 0) + (editingPlayer.mp_kills || 0),
                  attendance: editingPlayer.attendance,
                  br_class: editingPlayer.br_class,
                  mp_class: editingPlayer.mp_class,
                  player_type: editingPlayer.player_type
                })} 
                className="w-full bg-gradient-to-r from-[#FF1F44] to-red-600 hover:from-red-600 hover:to-[#FF1F44]"
              >
                <Check className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Ban Player Dialog */}
      {banningPlayer && (
        <Dialog open={!!banningPlayer} onOpenChange={() => setBanningPlayer(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-foreground">Ban Player: {banningPlayer.ign}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Ban Type</Label>
                <RadioGroup value={banType} onValueChange={(v: any) => setBanType(v)} className="flex gap-4 mt-2">
                  <Label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="temporary" /> Temporary</Label>
                  <Label className="flex items-center gap-2 cursor-pointer"><RadioGroupItem value="permanent" /> Permanent</Label>
                </RadioGroup>
              </div>
              {banType === 'temporary' && (
                <div>
                  <Label>Ban Until</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !banDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{banDate ? format(banDate, "PPP") : <span>Pick a date</span>}</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={banDate} onSelect={setBanDate} disabled={(date) => date < new Date()} initialFocus /></PopoverContent>
                  </Popover>
                </div>
              )}
              <div>
                <Label>Reason</Label>
                <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Enter ban reason" />
              </div>
              <Button onClick={handleConfirmBan} variant="destructive" className="w-full">Confirm Ban</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Player Details Dialog */}
      <PlayerProfileModal 
        open={!!selectedPlayer} 
        onOpenChange={(open) => !open && setSelectedPlayer(null)} 
        player={selectedPlayer ? { name: selectedPlayer.ign, id: selectedPlayer.id } : null} 
      />
    </div>
  );
};
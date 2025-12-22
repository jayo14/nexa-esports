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
import { logPlayerBan, logPlayerUnban, logRoleChange } from '@/lib/activityLogger';
import { Search, Edit, Trash2, Eye, CalendarIcon, ShieldCheck, ShieldOff, UserCog, Crown, User, MoreVertical, X, Check, ArrowDown, ArrowUp, BarChart, Users } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

type Player = Database['public']['Tables']['profiles']['Row'];

const PlayerCard = ({ player, onBan, onUnban, onEdit, onDelete, onDetails }) => {
  const { profile } = useAuth();

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'clan_master': return <Crown className="w-4 h-4 text-purple-400" />;
      case 'admin': return <ShieldCheck className="w-4 h-4 text-red-400" />;
      case 'moderator': return <UserCog className="w-4 h-4 text-yellow-400" />;
      default: return <User className="w-4 h-4 text-green-400" />;
    }
  };

  const roleName = player.role === 'clan_master' ? 'Clan Master' : player.role.charAt(0).toUpperCase() + player.role.slice(1);

  return (
    <Card className={cn(
      "bg-card/50 border-border/30 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-lg",
      player.is_banned && "opacity-60"
    )}>
      <CardHeader className="p-4 flex flex-row items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img src={player.avatar_url || '/placeholder.svg'} alt={player.username} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20" />
            {player.is_banned && <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
              <ShieldOff className="w-8 h-8 text-red-500" />
            </div>}
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">{player.ign}</h3>
            <p className="text-sm text-muted-foreground">@{player.username}</p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onDetails(player)}>
              <Eye className="w-4 h-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {(profile?.role === 'admin' || profile?.role === 'clan_master') && (
              <DropdownMenuItem onClick={() => onEdit(player)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
            )}
            {player.is_banned ? (
              <DropdownMenuItem onClick={() => onUnban(player)} disabled={player.role === 'clan_master'}>
                <Check className="w-4 h-4 mr-2" />
                Unban
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => onBan(player)} disabled={player.role === 'clan_master'}>
                <X className="w-4 h-4 mr-2" />
                Ban
              </DropdownMenuItem>
            )}
            {profile?.role === 'clan_master' && (
              <DropdownMenuItem onClick={() => onDelete(player.id)} className="text-red-500">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="flex justify-between items-center text-sm p-2 bg-background/50 rounded-md">
          <span className="text-muted-foreground flex items-center gap-2">{getRoleIcon(player.role)} Role</span>
          <span className="font-semibold text-foreground">{roleName}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-2 bg-background/50 rounded-md">
            <p className="text-xl font-bold text-primary">{player.kills || 0}</p>
            <p className="text-xs text-muted-foreground">Total Kills</p>
          </div>
          <div className="p-2 bg-background/50 rounded-md">
            <p className="text-xl font-bold text-green-400">{player.attendance || 0}%</p>
            <p className="text-xs text-muted-foreground">Attendance</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};


export const AdminPlayers: React.FC = () => {
  const { profile } = useAuth();
  const { data: players, isLoading } = useAdminPlayers();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [banningPlayer, setBanningPlayer] = useState<Player | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banDate, setBanDate] = useState<Date | undefined>(new Date(new Date().setDate(new Date().getDate() + 7)));
  const { toast } = useToast();

  const filteredPlayers = useMemo(() => players?.filter(player => {
    const matchesSearch = player.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.ign?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || player.role === filterRole;
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    if (sortOrder === 'asc') {
      return (a.kills || 0) - (b.kills || 0);
    }
    return (b.kills || 0) - (a.kills || 0);
  }) || [], [players, searchTerm, filterRole, sortOrder]);

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative col-span-1 md:col-span-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 text-foreground"
                placeholder="Search by username or IGN..."
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="bg-background/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="clan_master">Clan Master</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="bg-background/50 border-border/50 text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc"><div className='flex items-center'><ArrowDown className='w-4 h-4 mr-2'/> Kills: High to Low</div></SelectItem>
                <SelectItem value="asc"><div className='flex items-center'><ArrowUp className='w-4 h-4 mr-2'/> Kills: Low to High</div></SelectItem>
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
          <DialogContent>
            <DialogHeader><DialogTitle className="text-foreground">Edit Player: {editingPlayer.ign}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={editingPlayer.role} onValueChange={(value: any) => setEditingPlayer({...editingPlayer, role: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Legendary">Legendary</SelectItem>
                      <SelectItem value="Master">Master</SelectItem>
                      <SelectItem value="Pro">Pro</SelectItem>
                      <SelectItem value="Elite">Elite</SelectItem>
                      <SelectItem value="Rookie">Rookie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={() => handleUpdatePlayer({ role: editingPlayer.role, grade: editingPlayer.grade })} className="w-full">Save Changes</Button>
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
      {selectedPlayer && (
        <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-foreground">Player Details: {selectedPlayer.ign}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <p><strong className="text-muted-foreground">Username:</strong> {selectedPlayer.username}</p>
              <p><strong className="text-muted-foreground">Role:</strong> {selectedPlayer.role}</p>
              <p><strong className="text-muted-foreground">Joined:</strong> {selectedPlayer.date_joined ? new Date(selectedPlayer.date_joined).toLocaleDateString() : 'N/A'}</p>
              {selectedPlayer.is_banned && (
                <div className="p-3 bg-destructive/10 rounded-md">
                  <h4 className="font-bold text-destructive">Ban Information</h4>
                  <p><strong className="text-muted-foreground">Reason:</strong> {selectedPlayer.ban_reason}</p>
                  <p><strong className="text-muted-foreground">Expires:</strong> {selectedPlayer.ban_expires_at ? new Date(selectedPlayer.ban_expires_at).toLocaleDateString() : 'Permanent'}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
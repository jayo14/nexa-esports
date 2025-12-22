
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAdminPlayers, useUpdatePlayer, useDeletePlayer } from '@/hooks/useAdminPlayers';
import { useAuth } from '@/contexts/AuthContext';
import { logPlayerBan, logPlayerUnban, logRoleChange } from '@/lib/activityLogger';
import { Search, Edit, Trash2, Eye, UserPlus, CalendarIcon } from 'lucide-react';
import { Database } from '@/integrations/supabase/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

type Player = Database['public']['Tables']['profiles']['Row'];

export const AdminPlayers: React.FC = () => {
  const { profile } = useAuth();
  const { data: players, isLoading } = useAdminPlayers();
  const updatePlayer = useUpdatePlayer();
  const deletePlayer = useDeletePlayer();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [banningPlayer, setBanningPlayer] = useState<Player | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banDate, setBanDate] = useState<Date | undefined>(new Date(new Date().setDate(new Date().getDate() + 7)));

  const filteredPlayers = players?.filter(player => {
    const matchesSearch = player.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         player.ign?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || (filterRole === 'beta' ? player.status === 'beta' : player.role === filterRole);
    return matchesSearch && matchesRole;
  }).sort((a, b) => {
    if (sortOrder === 'asc') {
      return (a.kills || 0) - (b.kills || 0);
    }
    return (b.kills || 0) - (a.kills || 0);
  }) || [];

  const handleUpdatePlayer = async (updates: Partial<Player>) => {
    if (!editingPlayer) return;
    
    // Log role changes
    if (updates.role && updates.role !== editingPlayer.role) {
      await logRoleChange(editingPlayer.id, editingPlayer.ign, editingPlayer.role, updates.role);
    }
    
    await updatePlayer.mutateAsync({
      id: editingPlayer.id,
      updates
    });
    setEditingPlayer(null);
  };


  const handleDeletePlayer = async (playerId: string) => {
    if (confirm('Are you sure you want to delete this player? This action cannot be undone.')) {
      await deletePlayer.mutateAsync(playerId);
    }
  };


  const handleBanPlayer = (player: Player) => {
    setBanningPlayer(player);
    setBanReason('');
    setBanType('temporary');
    setBanDate(new Date(new Date().setDate(new Date().getDate() + 7)));
  };

  const handleConfirmBan = async () => {
    if (!banningPlayer || !banReason) return;
    if (banType === 'temporary' && !banDate) return;

    const banExpiresAt = banType === 'temporary' ? banDate?.toISOString() : null;

    await updatePlayer.mutateAsync({
      id: banningPlayer.id,
      updates: {
        is_banned: true,
        banned_at: new Date().toISOString(),
        ban_reason: banReason,
        ban_expires_at: banExpiresAt,
        banned_by: profile?.id
      }
    });
    
    await logPlayerBan(banningPlayer.id, banningPlayer.ign, banReason);
    setBanningPlayer(null);
    setBanReason('');
  };

  const handleUnbanPlayer = async (player: Player) => {
    if (confirm(`Are you sure you want to unban ${player.username}?`)) {
      await updatePlayer.mutateAsync({
        id: player.id,
        updates: {
          is_banned: false,
          banned_at: null,
          ban_reason: null,
          ban_expires_at: null,
          banned_by: null
        }
      });
      
      // Log unban activity
      await logPlayerUnban(player.id, player.ign);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'clan_master': return 'bg-purple-100 text-purple-800';
      case 'moderator': return 'bg-yellow-100 text-yellow-800';
      case 'player': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'clan_master': return 'Clan Master';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  };

  const getTierColor = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case '1': return 'bg-yellow-100 text-yellow-800';
      case '2': return 'bg-blue-100 text-blue-800';
      case '3': return 'bg-green-100 text-green-800';
      case '4': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade?.toLowerCase()) {
      case 'legendary': return 'bg-yellow-100 text-yellow-800';
      case 'master': return 'bg-emerald-100 text-emerald-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'elite': return 'bg-purple-100 text-purple-800';
      case 'rookie': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white">Loading players...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">Players Management</h1>
      </div>

      {/* Filters */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-white">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-600 text-white"
                placeholder="Search by username or IGN..."
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="clan_master">Clan Master</SelectItem>
                <SelectItem value="beta">Beta Player</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Kills: Descending</SelectItem>
                <SelectItem value="asc">Kills: Ascending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Players Table */}
      <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Player</TableHead>
                <TableHead className="text-gray-300">Role</TableHead>
                <TableHead className="text-gray-300">Grade</TableHead>
                <TableHead className="text-gray-300">Tier</TableHead>
                <TableHead className="text-gray-300">Total Kills</TableHead>
                <TableHead className="text-gray-300">BR/MP</TableHead>
                <TableHead className="text-gray-300">Attendance</TableHead>
                <TableHead className="text-gray-300">Joined</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="overflow-y-auto">
              {filteredPlayers.map((player) => (
                <TableRow key={player.id} className="border-gray-700">
                  <TableCell className="text-white">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        {player.avatar_url ? (
                          <img src={player.avatar_url} alt={player.username} className="w-8 h-8 rounded-full" />
                        ) : (
                          <span className="text-sm">{player.username?.[0]?.toUpperCase()}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{player.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{player.ign}</div>
                        <div className="text-sm text-gray-400">@{player.username}</div>
                        {player.is_banned && (
                          <Badge className="bg-red-100 text-red-800 text-xs mt-1">
                            Banned
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getRoleColor(player.role)}>
                      {getRoleName(player.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getGradeColor(player.grade || 'rookie')}>
                      {player.grade || 'Rookie'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTierColor(player.tier || '4')}>
                      {player.tier || '4'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white font-bold">{player.kills || 0}</TableCell>
                  <TableCell className="text-white">
                    <div className="text-xs">
                      <div className="text-blue-400">BR: {player.br_kills || 0}</div>
                      <div className="text-green-400">MP: {player.mp_kills || 0}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-white">{player.attendance || 0}%</TableCell>
                  <TableCell className="text-white">
                    {player.date_joined ? new Date(player.date_joined).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="text-gray-400 hover:text-white"
                            onClick={() => setSelectedPlayer(player)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle className="text-white">Player Details</DialogTitle>
                          </DialogHeader>
                          {selectedPlayer && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <label className="text-gray-300 text-sm">Username</label>
                                  <p className="text-white">{selectedPlayer.username}</p>
                                </div>
                                <div>
                                  <label className="text-gray-300 text-sm">IGN</label>
                                  <p className="text-white">{selectedPlayer.status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{selectedPlayer.ign}</p>
                                </div>
                                <div>
                                  <label className="text-gray-300 text-sm">Device</label>
                                  <p className="text-white">{selectedPlayer.device || 'N/A'}</p>
                                </div>
                                <div>
                                  <label className="text-gray-300 text-sm">Preferred Mode</label>
                                  <p className="text-white">{selectedPlayer.preferred_mode || 'N/A'}</p>
                                </div>
                                <div>
                                  <label className="text-gray-300 text-sm">TikTok Handle</label>
                                  <p className="text-white">{selectedPlayer.tiktok_handle || 'N/A'}</p>
                                </div>
                                <div>
                                  <label className="text-gray-300 text-sm">Grade</label>
                                  <p className="text-white">{selectedPlayer.grade || 'N/A'}</p>
                                </div>
                                {selectedPlayer.is_banned && (
                                  <div className="col-span-2 bg-red-500/10 p-3 rounded-md border border-red-500/30">
                                    <h4 className="text-red-400 font-bold mb-1">Ban Information</h4>
                                    <p className="text-gray-300 text-sm">
                                      <span className="text-gray-400">Reason:</span> {selectedPlayer.ban_reason}
                                    </p>
                                    <p className="text-gray-300 text-sm">
                                      <span className="text-gray-400">Date:</span> {selectedPlayer.banned_at ? new Date(selectedPlayer.banned_at).toLocaleDateString() : 'N/A'}
                                    </p>
                                    <p className="text-gray-300 text-sm">
                                      <span className="text-gray-400">Expires:</span> {selectedPlayer.ban_expires_at ? new Date(selectedPlayer.ban_expires_at).toLocaleDateString() : 'Permanent'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="text-gray-400 hover:text-white"
                        onClick={() => setEditingPlayer(player)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      
                      {profile?.role === 'clan_master' && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="ghost" 
                              className="text-gray-400 hover:text-red-400"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Player</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete {player.username}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeletePlayer(player.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      

                      {(profile?.role === 'admin' || profile?.role === 'moderator' || profile?.role === 'clan_master') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className={`${player.is_banned 
                            ? 'border-green-500/50 text-green-400 hover:bg-green-500/10' 
                            : 'border-orange-500/50 text-orange-400 hover:bg-orange-500/10'
                          }`}
                          onClick={() => player.is_banned ? handleUnbanPlayer(player) : handleBanPlayer(player)}
                        >
                          {player.is_banned ? 'Unban' : 'Ban'}
                        </Button>
                      )}



                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Player Dialog */}
      {editingPlayer && (
        <Dialog open={!!editingPlayer} onOpenChange={() => setEditingPlayer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-white">Edit Player</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm">Role</label>
                  <Select 
                    value={editingPlayer.role} 
                    onValueChange={(value: 'player' | 'moderator' | 'admin' | 'clan_master') => setEditingPlayer({...editingPlayer, role: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
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
                <div>
                  <label className="text-gray-300 text-sm">Grade</label>
                  <Select 
                    value={editingPlayer.grade} 
                    onValueChange={(value) => setEditingPlayer({...editingPlayer, grade: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Legendary">Legendary</SelectItem>
                      <SelectItem value="Master">Master</SelectItem>
                      <SelectItem value="Pro">Pro</SelectItem>
                      <SelectItem value="Elite">Elite</SelectItem>
                      <SelectItem value="Rookie">Rookie</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm">Tier</label>
                  <Select 
                    value={editingPlayer.tier} 
                    onValueChange={(value) => setEditingPlayer({...editingPlayer, tier: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm">Status</label>
                  <Select 
                    value={editingPlayer.status || 'active'} 
                    onValueChange={(value) => setEditingPlayer({...editingPlayer, status: value})}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="beta">Beta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-gray-300 text-sm">MP Kills</label>
                  <Input
                    type="number"
                    value={editingPlayer.mp_kills || 0}
                    onChange={(e) => setEditingPlayer({...editingPlayer, mp_kills: parseInt(e.target.value) || 0})}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter MP kills"
                  />
                </div>
                <div>
                  <label className="text-gray-300 text-sm">BR Kills</label>
                  <Input
                    type="number"
                    value={editingPlayer.br_kills || 0}
                    onChange={(e) => setEditingPlayer({...editingPlayer, br_kills: parseInt(e.target.value) || 0})}
                    className="bg-gray-800 border-gray-600 text-white"
                    placeholder="Enter BR kills"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditingPlayer(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleUpdatePlayer({
                    role: editingPlayer.role,
                    grade: editingPlayer.grade,
                    tier: editingPlayer.tier,
                    status: editingPlayer.status,
                    mp_kills: editingPlayer.mp_kills,
                    br_kills: editingPlayer.br_kills
                  })}
                  className="bg-[#FF1F44] hover:bg-red-600"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Ban Player Dialog */}
      {banningPlayer && (
        <Dialog open={!!banningPlayer} onOpenChange={() => setBanningPlayer(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-white">Ban Player</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-gray-300">Are you sure you want to ban <span className="font-bold text-white">{banningPlayer.ign}</span>?</p>
              
              <div>
                <label className="text-gray-300 text-sm block mb-2">Ban Type</label>
                <RadioGroup value={banType} onValueChange={(value: 'temporary' | 'permanent') => setBanType(value)} className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="temporary" id="temporary" />
                    <Label htmlFor="temporary" className="text-white">Temporary</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="permanent" id="permanent" />
                    <Label htmlFor="permanent" className="text-white">Permanent</Label>
                  </div>
                </RadioGroup>
              </div>

              {banType === 'temporary' && (
                <div>
                  <label className="text-gray-300 text-sm block mb-2">Ban Until</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal bg-gray-800 border-gray-600 text-white",
                          !banDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {banDate ? format(banDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={banDate}
                        onSelect={setBanDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div>
                <label className="text-gray-300 text-sm">Reason</label>
                <Input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  className="bg-gray-800 border-gray-600 text-white mt-1"
                  placeholder="Enter ban reason"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" onClick={() => setBanningPlayer(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleConfirmBan} 
                  className="bg-red-600 hover:bg-red-700"
                  disabled={!banReason || (banType === 'temporary' && !banDate)}
                >
                  Confirm Ban
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {filteredPlayers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No players found</p>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from "@/integrations/supabase/client"
import { 
  Megaphone, 
  Plus, 
  Edit, 
  Trash2, 
  Clock,
  Eye,
  EyeOff,
  Search
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { sendBroadcastPushNotification, sendPushNotification } from '@/lib/pushNotifications';

export const AdminAnnouncementsManagement = () => {
  const { toast } = useToast();
  const location = useLocation();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState({
    title: '',
    content: '',
    scheduled_for: '',
    expires_at: '',
    is_pinned: false,
    is_published: true
  });

  useEffect(() => {
    const targetUser = location.state?.targetUser;
    if (targetUser) {
      setIsCreateDialogOpen(true);
      setSelectedUsers([targetUser.id]);
    }
  }, [location.state]);

  useEffect(() => {
    const fetchUsers = async () => {
      const { data, error } = await supabase.from('profiles').select('id, ign');
      if (error) {
        console.error("Error fetching users:", error.message);
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("announcements")
        .select(`
          *,
          author:created_by (
            username
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error.message);
        toast({
          title: "Error",
          description: "Failed to fetch announcements",
          variant: "destructive",
        });
        setAnnouncements([]);
      } else {
        setAnnouncements(data || []);
      }
      setLoading(false);
    };

    fetchAnnouncements();
  }, [toast]);

  const getStatusColor = (announcement) => {
    if (!announcement.is_published) return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    if (announcement.is_pinned) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
    return 'bg-green-500/20 text-green-400 border-green-500/50';
  };

  const getStatusText = (announcement) => {
    if (!announcement.is_published) return 'Hidden';
    if (announcement.is_pinned) return 'Pinned';
    return 'Active';
  };

  const filteredAnnouncements = (announcements || []).filter(announcement => {
    const title = announcement?.title || '';
    const content = announcement?.content || '';
    const is_published = announcement?.is_published;
    const is_pinned = announcement?.is_pinned;

    const matchesSearch =
      title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      content.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'visible' && is_published) ||
      (statusFilter === 'hidden' && !is_published) ||
      (statusFilter === 'pinned' && is_pinned);

    return matchesSearch && matchesStatus;
  });

  const handleCreateAnnouncement = async () => {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError || !user) {
      toast({
        title: "Failed to Create",
        description: userError?.message || "User not found",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("announcements")
      .insert([
        {
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          scheduled_for: newAnnouncement.scheduled_for || null,
          expires_at: newAnnouncement.expires_at || null,
          is_published: newAnnouncement.is_published,
          is_pinned: newAnnouncement.is_pinned,
          created_by: user.id,
          target_users: selectedUsers.length > 0 ? selectedUsers : null,
        },
      ])
      .select(`
        *,
        author:created_by (
          username
        )
      `);

    if (error) {
      console.error("Error creating announcement:", error.message);
      toast({
        title: "Failed to Create",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const newAnn = data[0];
      setAnnouncements((prev) => [newAnn, ...prev]);
      setNewAnnouncement({
        title: '',
        content: '',
        scheduled_for: '',
        expires_at: '',
        is_pinned: false,
        is_published: true
      });
      setSelectedUsers([]);
      setIsCreateDialogOpen(false);
      toast({
        title: "Announcement Created",
        description: "Your announcement has been published successfully.",
      });

      // Create broadcast notification
      const { error: notificationError } = await supabase.from('notifications').insert([{
        user_id: null,
        title: newAnn.title,
        message: newAnn.content,
        type: 'announcement',
        data: { announcement_id: newAnn.id }
      }]);
      
      if (notificationError) {
        console.error("Error creating broadcast notification:", notificationError.message);
      }

      // Send push notifications if announcement is published
      if (newAnn.is_published) {
        try {
          if (selectedUsers.length > 0) {
            // Send to specific users
            await sendPushNotification(selectedUsers, {
              title: `📢 ${newAnn.title}`,
              message: newAnn.content?.substring(0, 100) + (newAnn.content?.length > 100 ? '...' : ''),
              data: {
                type: 'announcement',
                url: '/announcements',
                announcementId: newAnn.id,
              }
            });
          } else {
            // Broadcast to all users
            await sendBroadcastPushNotification({
              title: `📢 ${newAnn.title}`,
              message: newAnn.content?.substring(0, 100) + (newAnn.content?.length > 100 ? '...' : ''),
              data: {
                type: 'announcement',
                url: '/announcements',
                announcementId: newAnn.id,
              }
            });
          }
        } catch (pushError) {
          console.warn('Failed to send push notification for announcement:', pushError);
        }
      }
    }
  };

  const handleDeleteAnnouncement = async (announcementId) => {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq('id', announcementId);

    if (error) {
      console.error("Error deleting announcement:", error.message);
      toast({
        title: "Delete failed!",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setAnnouncements(prev => prev.filter(a => a.id !== announcementId));
      toast({
        title: "Announcement Deleted",
        description: "The announcement has been removed successfully.",
      });
    }
  };

  const handleEditAnnouncement = (announcement) => {
    setEditingAnnouncement({
      ...announcement,
      content: announcement.content || '',
      is_published: announcement.is_published,
      is_pinned: announcement.is_pinned,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateAnnouncement = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .update({
        title: editingAnnouncement.title,
        content: editingAnnouncement.content,
        is_pinned: editingAnnouncement.is_pinned,
        is_published: editingAnnouncement.is_published,
      })
      .eq('id', editingAnnouncement.id)
      .select(`
        *,
        author:created_by (
          username
        )
      `);

    if (error) {
      console.error("Error updating announcement:", error.message);
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      setAnnouncements(prev => 
        prev.map(a => a.id === editingAnnouncement.id ? data[0] : a));
      setIsEditDialogOpen(false);
      setEditingAnnouncement(null);
      toast({
        title: "Announcement Updated",
        description: "Changes have been saved successfully.",
      });
    }
  };

  const toggleVisibility = async (announcementId) => {
    const target = announcements.find(a => a.id === announcementId);
    if (!target) return;

    const { data, error } = await supabase
      .from("announcements")
      .update({ is_published: !target.is_published })
      .eq("id", announcementId)
      .select(`
        *,
        author:created_by (
          username
        )
      `);

    if (error) {
      console.error("Error toggling visibility:", error.message);
      toast({
        title: "Visibility Toggle Failed",
        description: error.message,
        variant: "destructive"
      });
    } else if (data && data.length > 0) {
      setAnnouncements(prev =>
        prev.map(a => (a.id === announcementId ? data[0] : a))
      );
      toast({
        title: "Visibility Updated",
        description: `Announcement is now ${data[0].is_published ? 'visible' : 'hidden'}.`,
      });
    }
  };

  const togglePin = async (announcementId) => {
    const target = announcements.find(a => a.id === announcementId);
    if (!target) return;

    const { data, error } = await supabase
      .from("announcements")
      .update({ is_pinned: !target.is_pinned })
      .eq("id", announcementId)
      .select(`
        *,
        author:created_by (
          username
        )
      `);

    if (error) {
      console.error("Error toggling pin:", error.message);
      toast({
        title: "Pin Toggle Failed",
        description: error.message,
        variant: "destructive"
      });
    } else if (data && data.length > 0) {
      setAnnouncements(prev =>
        prev.map(a => (a.id === announcementId ? data[0] : a))
      );
      toast({
        title: "Pin Status Updated",
        description: `Announcement is now ${data[0].is_pinned ? 'pinned' : 'unpinned'}.`,
      });
    }
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const activeAnnouncements = announcements.filter(a => a.is_published).length;
  const pinnedAnnouncements = announcements.filter(a => a.is_pinned).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-orbitron mb-2">Announcements</h1>
          <p className="text-muted-foreground font-rajdhani">Create and manage clan announcements</p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-primary hover:bg-primary/90 font-rajdhani"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Announcement
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1 font-orbitron">{announcements.length}</div>
            <div className="text-sm text-muted-foreground font-rajdhani">Total Announcements</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1 font-orbitron">{activeAnnouncements}</div>
            <div className="text-sm text-muted-foreground font-rajdhani">Active</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1 font-orbitron">{pinnedAnnouncements}</div>
            <div className="text-sm text-muted-foreground font-rajdhani">Pinned</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/30">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 font-rajdhani"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-background/50 border-border/50">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="visible">Active</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
                <SelectItem value="pinned">Pinned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Announcements Table */}
      <Card className="bg-card/50 border-border/30">
        <CardHeader>
          <CardTitle className="text-foreground font-orbitron flex items-center">
            <Megaphone className="w-5 h-5 mr-2 text-primary" />
            Clan Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground">Loading...</div>
          ) : filteredAnnouncements.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No announcements found</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead className="text-muted-foreground font-rajdhani">Title</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Author</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Created</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Status</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAnnouncements.map(announcement => (
                  <TableRow key={announcement.id} className="border-border/30 hover:bg-muted/20">
                    <TableCell>
                      <div className="max-w-xs">
                        <div className="font-medium text-foreground font-rajdhani truncate">
                          {announcement.title}
                        </div>
                        <div className="text-sm text-muted-foreground font-rajdhani truncate">
                          {announcement.content}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-rajdhani text-muted-foreground">
                      {announcement.author?.username || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center text-muted-foreground">
                        <Clock className="w-4 h-4 mr-2" />
                        <span className="font-rajdhani">{formatTimeAgo(announcement.created_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(announcement)}>
                        {getStatusText(announcement)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => toggleVisibility(announcement.id)}
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          {announcement.is_published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleEditAnnouncement(announcement)}
                          className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Announcement Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Create New Announcement</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title" className="font-rajdhani">Title</Label>
              <Input
                id="title"
                value={newAnnouncement.title}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                className="bg-background/50 border-border/50 font-rajdhani"
                placeholder="e.g., 🏆 Championship Tournament Starting Soon!"
              />
            </div>
            
            <div>
              <Label htmlFor="content" className="font-rajdhani">Content</Label>
              <Textarea
                id="content"
                value={newAnnouncement.content}
                onChange={(e) => setNewAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                className="bg-background/50 border-border/50 font-rajdhani min-h-24"
                placeholder="Write your announcement content..."
              />
            </div>

            <div>
              <Label htmlFor="target" className="font-rajdhani">Target Audience</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                  >
                    {selectedUsers.length > 0
                      ? `${selectedUsers.length} user(s) selected`
                      : "Select users (leave empty for all)"}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandEmpty>No users found.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        onSelect={() => {
                          if (selectedUsers.length === users.length) {
                            setSelectedUsers([]);
                          } else {
                            setSelectedUsers(users.map(user => user.id));
                          }
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedUsers.length === users.length ? "opacity-100" : "opacity-0"
                          )}
                        />
                        All Users
                      </CommandItem>
                      {users.map((user) => (
                        <CommandItem
                          key={user.id}
                          onSelect={() => {
                            setSelectedUsers(prev => 
                              prev.includes(user.id)
                                ? prev.filter(id => id !== user.id)
                                : [...prev, user.id]
                            );
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedUsers.includes(user.id) ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {user.ign}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduledFor" className="font-rajdhani">Schedule For (Optional)</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={newAnnouncement.scheduled_for}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, scheduled_for: e.target.value }))}
                  className="bg-background/50 border-border/50 font-rajdhani"
                />
              </div>
              <div>
                <Label htmlFor="expiresAt" className="font-rajdhani">Expires At (Optional)</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={newAnnouncement.expires_at}
                  onChange={(e) => setNewAnnouncement(prev => ({ ...prev, expires_at: e.target.value }))}
                  className="bg-background/50 border-border/50 font-rajdhani"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPinned"
                  checked={newAnnouncement.is_pinned}
                  onCheckedChange={(checked) => setNewAnnouncement(prev => ({ ...prev, is_pinned: checked }))}
                />
                <Label htmlFor="isPinned" className="font-rajdhani">Pin to top</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isVisible"
                  checked={newAnnouncement.is_published}
                  onCheckedChange={(checked) => setNewAnnouncement(prev => ({ ...prev, is_published: checked }))}
                />
                <Label htmlFor="isVisible" className="font-rajdhani">Publish immediately</Label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
                className="font-rajdhani"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateAnnouncement}
                className="bg-primary hover:bg-primary/90 font-rajdhani"
              >
                Create Announcement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Announcement Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Edit Announcement</DialogTitle>
          </DialogHeader>
          
          {editingAnnouncement && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="editTitle" className="font-rajdhani">Title</Label>
                <Input
                  id="editTitle"
                  value={editingAnnouncement.title}
                  onChange={(e) => setEditingAnnouncement(prev => ({ ...prev, title: e.target.value }))}
                  className="bg-background/50 border-border/50 font-rajdhani"
                />
              </div>
              
              <div>
                <Label htmlFor="editContent" className="font-rajdhani">Content</Label>
                <Textarea
                  id="editContent"
                  value={editingAnnouncement.content}
                  onChange={(e) => setEditingAnnouncement(prev => ({ ...prev, content: e.target.value }))}
                  className="bg-background/50 border-border/50 font-rajdhani min-h-24"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="editIsPinned"
                    checked={editingAnnouncement.is_pinned}
                    onCheckedChange={(checked) => setEditingAnnouncement(prev => ({ ...prev, is_pinned: checked }))}
                  />
                  <Label htmlFor="editIsPinned" className="font-rajdhani">Pin to top</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="editIsVisible"
                    checked={editingAnnouncement.is_published}
                    onCheckedChange={(checked) => setEditingAnnouncement(prev => ({ ...prev, is_published: checked }))}
                  />
                  <Label htmlFor="editIsVisible" className="font-rajdhani">Visible to players</Label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsEditDialogOpen(false)}
                  className="font-rajdhani"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateAnnouncement}
                  className="bg-primary hover:bg-primary/90 font-rajdhani"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAnnouncementsManagement;

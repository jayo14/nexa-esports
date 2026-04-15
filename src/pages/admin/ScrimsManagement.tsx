
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  Clock, 
  Users, 
  Target, 
  Trophy,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const AdminScrimsManagement: React.FC = () => {
  const { toast } = useToast();
  const [scrims, setScrims] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingScrim, setEditingScrim] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [newScrim, setNewScrim] = useState({
    name: '',
    date: '',
    time: '',
    description: '',
    assignedPlayers: []
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'ongoing':
        return 'bg-green-500/20 text-green-400 border-green-500/50';
      case 'completed':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
    }
  };


  const filteredScrims = scrims.filter(scrim => {
    const matchesSearch = scrim.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || scrim.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateScrim = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .insert({
          name: newScrim.name,
          date: newScrim.date,
          time: newScrim.time,
          description: newScrim.description,
          type: 'Scrims',
          status: 'upcoming'
        })
        .select()
        .single();

      if (error) throw error;

      setScrims(prev => [...prev, { ...data, assignedPlayers: [] }]);
      setNewScrim({
        name: '',
        date: '',
        time: '',
        description: '',
        assignedPlayers: []
      });
      setIsCreateDialogOpen(false);
      toast({
        title: "Scrim Created",
        description: "New scrim has been scheduled successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteScrim = async (scrimId: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', scrimId);

      if (error) throw error;

      setScrims(prev => prev.filter(s => s.id !== scrimId));
      toast({
        title: "Scrim Deleted",
        description: "The scrim has been removed successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditScrim = (scrim: any) => {
    setEditingScrim({ ...scrim });
    setIsEditDialogOpen(true);
  };

  const handleUpdateScrim = async () => {
    try {
      const { error } = await supabase
        .from('events')
        .update({
          name: editingScrim.name,
          status: editingScrim.status
        })
        .eq('id', editingScrim.id);

      if (error) throw error;

      setScrims(prev => prev.map(s => s.id === editingScrim.id ? editingScrim : s));
      setIsEditDialogOpen(false);
      setEditingScrim(null);
      toast({
        title: "Scrim Updated",
        description: "Changes have been saved successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };


  useEffect(() => {
    const fetchScrims = async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          event_participants (
            id,
            player_id,
            profiles!event_participants_player_id_fkey (
              ign,
              username
            )
          )
        `)
        .eq('type', 'Scrims');

      if (error) {
        console.error('Error fetching scrims:', error.message);
      } else {
        // Transform data to include assignedPlayers
        const transformedScrims = (data || []).map(scrim => ({
          ...scrim,
          assignedPlayers: scrim.event_participants || []
        }));
        setScrims(transformedScrims);
      }
    };
    
    fetchScrims();
  }, []);


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-orbitron mb-2">Scrims Management</h1>
          <p className="text-muted-foreground font-rajdhani">Create and manage clan scrimmages</p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-primary hover:bg-primary/90 font-rajdhani"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Scrim
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1 font-orbitron">{scrims.length}</div>
            <div className="text-sm text-muted-foreground font-rajdhani">Total Scrims</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1 font-orbitron">
              {scrims.filter(s => s.status === 'upcoming').length}
            </div>
            <div className="text-sm text-muted-foreground font-rajdhani">Upcoming</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-400 mb-1 font-orbitron">
              {scrims.filter(s => s.status === 'completed').length}
            </div>
            <div className="text-sm text-muted-foreground font-rajdhani">Completed</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1 font-orbitron">
              {Array.isArray(scrims)
                ? scrims.reduce((total, s) => total + (s.assignedPlayers?.length || 0), 0)
                : 0
              }
            </div>
            <div className="text-sm text-muted-foreground font-rajdhani">Total Assignments</div>
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
                placeholder="Search scrims..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 font-rajdhani"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-background/50 border-border/50">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Scrims Table */}
      <Card className="bg-card/50 border-border/30">
        <CardHeader>
          <CardTitle className="text-foreground font-orbitron flex items-center">
            <Trophy className="w-5 h-5 mr-2 text-primary" />
            Scheduled Scrims
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="text-muted-foreground font-rajdhani">Scrim Details</TableHead>
                <TableHead className="text-muted-foreground font-rajdhani">Date & Time</TableHead>
                <TableHead className="text-muted-foreground font-rajdhani">Players</TableHead>
                <TableHead className="text-muted-foreground font-rajdhani">Status</TableHead>
                <TableHead className="text-muted-foreground font-rajdhani">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredScrims.map(scrim => (
                <TableRow key={scrim.id} className="border-border/30 hover:bg-muted/20">
                  <TableCell>
                    <div className="font-medium text-foreground font-rajdhani">{scrim.name}</div>
                    <div className="text-sm text-muted-foreground font-rajdhani max-w-xs truncate">
                      {scrim.description}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="w-4 h-4 mr-2" />
                      <span className="font-rajdhani">{new Date(scrim.date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-muted-foreground mt-1">
                      <Clock className="w-4 h-4 mr-2" />
                      <span className="font-rajdhani">{scrim.time}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Users className="w-4 h-4 mr-2 text-muted-foreground" />
                      <span className="font-rajdhani">{(scrim.assignedPlayers?.length || 0)} assigned</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(scrim.status)}>
                      {scrim.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleEditScrim(scrim)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => handleDeleteScrim(scrim.id)}
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
          </div>
        </CardContent>
      </Card>

      {/* Create Scrim Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Create New Scrim</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="name" className="font-rajdhani">Scrim Name</Label>
                <Input
                  id="name"
                  value={newScrim.name}
                  onChange={(e) => setNewScrim(prev => ({ ...prev, name: e.target.value }))}
                  className="bg-background/50 border-border/50 font-rajdhani"
                  placeholder="e.g., Clan War vs Thunder"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date" className="font-rajdhani">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newScrim.date}
                  onChange={(e) => setNewScrim(prev => ({ ...prev, date: e.target.value }))}
                  className="bg-background/50 border-border/50 font-rajdhani"
                />
              </div>
              <div>
                <Label htmlFor="time" className="font-rajdhani">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={newScrim.time}
                  onChange={(e) => setNewScrim(prev => ({ ...prev, time: e.target.value }))}
                  className="bg-background/50 border-border/50 font-rajdhani"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="description" className="font-rajdhani">Description</Label>
              <Textarea
                id="description"
                value={newScrim.description}
                onChange={(e) => setNewScrim(prev => ({ ...prev, description: e.target.value }))}
                className="bg-background/50 border-border/50 font-rajdhani"
                placeholder="Brief description of the scrim..."
              />
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
                onClick={handleCreateScrim}
                className="bg-primary hover:bg-primary/90 font-rajdhani"
              >
                Create Scrim
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Scrim Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border/50 max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-orbitron">Edit Scrim</DialogTitle>
          </DialogHeader>
          
          {editingScrim && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="editName" className="font-rajdhani">Scrim Name</Label>
                  <Input
                    id="editName"
                    value={editingScrim.name}
                    onChange={(e) => setEditingScrim(prev => ({ ...prev, name: e.target.value }))}
                    className="bg-background/50 border-border/50 font-rajdhani"
                  />
                </div>
                <div>
                  <Label htmlFor="editStatus" className="font-rajdhani">Status</Label>
                  <Select 
                    value={editingScrim.status} 
                    onValueChange={(value) => setEditingScrim(prev => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label className="font-rajdhani">Assigned Players</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                  {editingScrim?.assignedPlayers?.map((player, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-background/30 rounded">
                      <div className="flex items-center space-x-4">
                        <span className="font-rajdhani">Ɲ・乂{player.ign}</span>
                        <Badge variant="outline" className="text-xs">{player.role}</Badge>
                        <Badge variant="outline" className="text-xs">{player.squad}</Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{player.kills} kills</span>
                        <Badge className="text-xs">{player.performance}</Badge>
                      </div>
                    </div>
                  ))}
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
                  onClick={handleUpdateScrim}
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

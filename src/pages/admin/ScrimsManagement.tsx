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
  Filter,
  Shield,
  Activity
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
        return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
      case 'ongoing':
        return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
      case 'completed':
        return 'text-slate-400 bg-slate-400/10 border-slate-400/20';
      default:
        return 'text-slate-500 bg-slate-500/10 border-slate-500/20';
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
        title: "Scrim Deployed",
        description: "New tactical scrimmage has been scheduled.",
      });
    } catch (error: any) {
      toast({
        title: "Deployment Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteScrim = async (scrimId: string) => {
    if (!confirm('Confirm decommissioning of this scrim?')) return;
    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', scrimId);

      if (error) throw error;

      setScrims(prev => prev.filter(s => s.id !== scrimId));
      toast({
        title: "Scrim Decommissioned",
        description: "Historical data maintained, active entry removed.",
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
        description: "Changes synchronized with central command.",
      });
    } catch (error: any) {
      toast({
        title: "Sync Error",
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
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white font-orbitron tracking-tighter uppercase">
            SCRIMS <span className="text-[#ec131e]">COMMAND</span>
          </h1>
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2">Tactical Scrimmage Management & Roster Logistics</p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-[#ec131e] hover:bg-red-700 h-12 px-8 rounded-xl font-black uppercase tracking-widest text-[11px] brand-glow"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schedule Scrim
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 xl:gap-6">
        <div className="glass-level-2 p-6 rounded-2xl text-center border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Active Ops</p>
          <p className="text-2xl font-black text-white font-orbitron">{scrims.length}</p>
        </div>
        <div className="glass-level-2 p-6 rounded-2xl text-center border-blue-400/10">
          <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Upcoming</p>
          <p className="text-2xl font-black text-white font-orbitron">{scrims.filter(s => s.status === 'upcoming').length}</p>
        </div>
        <div className="glass-level-2 p-6 rounded-2xl text-center border-emerald-500/10">
          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Ongoing</p>
          <p className="text-2xl font-black text-white font-orbitron">{scrims.filter(s => s.status === 'ongoing').length}</p>
        </div>
        <div className="glass-level-2 p-6 rounded-2xl text-center border-white/5">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Personnel</p>
          <p className="text-2xl font-black text-white font-orbitron">
             {scrims.reduce((total, s) => total + (s.assignedPlayers?.length || 0), 0)}
          </p>
        </div>
      </div>

      <div className="glass-level-2 p-6 rounded-[32px] border-white/10">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <Input
              placeholder="Filter by scrimmage title..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 glass-level-3 border-white/10 h-12 text-xs font-bold uppercase tracking-widest rounded-xl"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48 glass-level-3 border-white/10 h-12 text-xs font-black uppercase tracking-widest rounded-xl">
              <Filter className="w-4 h-4 mr-2 text-[#ec131e]" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="glass-level-3 border-white/10">
              <SelectItem value="all" className="text-[10px] font-black uppercase py-3">Global Status</SelectItem>
              <SelectItem value="upcoming" className="text-[10px] font-black uppercase py-3">Upcoming</SelectItem>
              <SelectItem value="ongoing" className="text-[10px] font-black uppercase py-3">Ongoing</SelectItem>
              <SelectItem value="completed" className="text-[10px] font-black uppercase py-3">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="glass-level-2 rounded-[32px] overflow-hidden border-white/10 shadow-2xl">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 bg-white/[0.02]">
                <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Operation Intel</th>
                <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Deployment Window</th>
                <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Force Count</th>
                <th className="py-6 px-8 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Status</th>
                <th className="py-6 px-8 text-right text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 pr-12">Actions</th>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-white/[0.03]">
              {filteredScrims.map(scrim => (
                <TableRow key={scrim.id} className="hover:bg-white/[0.01] transition-colors group border-white/5">
                  <TableCell className="py-6 px-8">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 rounded-xl bg-[#ec131e]/10 border border-[#ec131e]/20 flex items-center justify-center text-[#ec131e] group-hover:scale-110 transition-transform brand-glow">
                          <Activity className="w-5 h-5" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-base font-black text-white uppercase tracking-tight truncate">{scrim.name}</p>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest truncate max-w-xs">{scrim.description || 'No mission brief added'}</p>
                       </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 px-8">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center text-[10px] font-black text-white uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5 mr-2 text-[#ec131e]" />
                        {new Date(scrim.date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <Clock className="w-3.5 h-3.5 mr-2" />
                        {scrim.time}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 px-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-lg">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-[10px] font-black text-white uppercase tabular-nums">{(scrim.assignedPlayers?.length || 0)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-6 px-8">
                    <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-3 py-1 border rounded-lg", getStatusColor(scrim.status))}>
                      {scrim.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-6 px-8 text-right pr-12">
                    <div className="flex items-center justify-end gap-2">
                       <Button size="icon" variant="ghost" onClick={() => handleEditScrim(scrim)} className="w-10 h-10 rounded-xl text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                          <Edit className="w-4 h-4" />
                       </Button>
                       <Button size="icon" variant="ghost" onClick={() => handleDeleteScrim(scrim.id)} className="w-10 h-10 rounded-xl text-red-500 hover:text-red-400 hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4" />
                       </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="glass-level-3 border-white/10 text-white font-rajdhani max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-orbitron font-black text-[#ec131e] uppercase tracking-widest">Initialize Scrim</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-6 py-4">
             <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Operation Title</Label>
                <Input value={newScrim.name} onChange={(e) => setNewScrim(prev => ({ ...prev, name: e.target.value }))} className="glass-level-2 border-white/10 h-12 text-sm font-bold placeholder:text-slate-700" placeholder="e.g., NEUTRALIZATION VS THUNDER" />
             </div>
             <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 text-left">
                   <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Deployment Date</Label>
                   <Input type="date" value={newScrim.date} onChange={(e) => setNewScrim(prev => ({ ...prev, date: e.target.value }))} className="glass-level-2 border-white/10 h-12" />
                </div>
                <div className="space-y-2 text-left">
                   <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Zero Hour</Label>
                   <Input type="time" value={newScrim.time} onChange={(e) => setNewScrim(prev => ({ ...prev, time: e.target.value }))} className="glass-level-2 border-white/10 h-12" />
                </div>
             </div>
             <div className="space-y-2 text-left">
                <Label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Tactical Briefing</Label>
                <Textarea value={newScrim.description} onChange={(e) => setNewScrim(prev => ({ ...prev, description: e.target.value }))} className="glass-level-2 border-white/10 h-32 text-sm font-bold placeholder:text-slate-700" placeholder="Describe the mission parameters..." />
             </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
             <Button variant="ghost" onClick={() => setIsCreateDialogOpen(false)} className="h-12 px-8 uppercase font-black text-[10px] tracking-widest">Abort</Button>
             <Button onClick={handleCreateScrim} className="bg-[#ec131e] hover:bg-red-700 h-12 px-10 rounded-xl font-black uppercase tracking-widest text-[11px] brand-glow">Deploy Intelligence</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

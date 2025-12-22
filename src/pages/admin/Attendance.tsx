
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  UserCheck, 
  UserX,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle,
  XCircle,
  Download,
  CalendarDays,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/integrations/supabase/types';

type Player = Database['public']['Tables']['profiles']['Row'];
type AttendanceRecord = Database['public']['Tables']['attendance']['Row'] & {
  profiles: {
    username: string;
    ign: string;
    status: string;
  } | null;
  events: {
    name: string;
  } | null;
};

type AttendanceMode = 'MP' | 'BR';

import { useAuth } from '@/contexts/AuthContext';

export const AdminAttendance: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [attendanceMode, setAttendanceMode] = useState<AttendanceMode>('MP');
  const [selectedLobby, setSelectedLobby] = useState<number>(1);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [killsInput, setKillsInput] = useState<{ [playerId: string]: number}>({});

  // Fetch players
  const { data: players = [], isLoading: playersLoading } = useQuery<Player[]>({
    queryKey: ['players'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch attendance records with profiles and events
  const { data: rawAttendanceData, isLoading: attendanceLoading } = useQuery({
    queryKey: ['attendance-raw', attendanceMode, selectedLobby],
    queryFn: async () => {
      const result = await (supabase as any)
        .from('attendance')
        .select('*')
        .eq('attendance_type', attendanceMode)
        .eq('lobby', selectedLobby)
        .order('created_at', { ascending: false});
      
      if (result.error) throw result.error;
      return result.data;
    }
  });

  // Fetch profiles and events separately to avoid type issues
  const { data: profilesData } = useQuery({
    queryKey: ['attendance-profiles'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('profiles')
        .select('id, username, ign, status');
      if (error) throw error;
      return data;
    }
  });

  const { data: eventsData } = useQuery({
    queryKey: ['attendance-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, name');
      if (error) throw error;
      return data;
    }
  });

  // Combine the data
  const attendanceRecords: AttendanceRecord[] = (rawAttendanceData || []).map((record: any) => {
    const profile = profilesData?.find(p => p.id === record.player_id) as any;
    const event = eventsData?.find(e => e.id === record.event_id);
    return {
      ...record,
      profiles: profile ? { username: profile.username, ign: profile.ign, status: profile.status } : null,
      events: event ? { name: event.name } : null
    };
  });

  // Mark attendance mutation
  // TODO: Add a 'lobby' column (integer) to the 'attendance' table in the database.
  const markAttendanceMutation = useMutation({
  mutationFn: async ({ playerId, status, kills, lobby }: { playerId: string; status: 'present' | 'absent'; kills?: number; lobby: number }) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .insert({
          player_id: playerId,
          status,
          attendance_type: attendanceMode,
          date: selectedDate,
          event_kills: kills || 0,
          br_kills: attendanceMode === 'BR' ? (kills || 0) : 0,
          mp_kills: attendanceMode === 'MP' ? (kills || 0) : 0,
          lobby: lobby,
        })
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error: any) {
      if (error.code === '23505') {
        toast({
          title: "Attendance Already Marked",
          description: `Attendance has already been marked for this lobby and mode on this day.`,
          variant: "destructive",
        });
        return null;
      }
      throw error;
    }
  },
  onSuccess: (data) => {
    if (data) { // Only invalidate queries if the mutation was successful
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      queryClient.invalidateQueries({ queryKey: ['attendance-raw'] });
      queryClient.invalidateQueries({ queryKey: ['players'] });
      queryClient.invalidateQueries({ queryKey: ['admin-players'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['player-stats'] });
      queryClient.invalidateQueries({ queryKey: ['weekly-leaderboard'] });
    }
  }
});

const undoAttendanceMutation = useMutation({
  mutationFn: async (attendanceId: string) => {
    const { error } = await supabase
      .from('attendance')
      .delete()
      .eq('id', attendanceId);

    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['attendance'] });
    queryClient.invalidateQueries({ queryKey: ['attendance-raw'] });
    queryClient.invalidateQueries({ queryKey: ['players'] });
    queryClient.invalidateQueries({ queryKey: ['admin-players'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
    queryClient.invalidateQueries({ queryKey: ['player-stats'] });
    queryClient.invalidateQueries({ queryKey: ['weekly-leaderboard'] });
  },
  onError: (error: any) => {
    console.error('Error resetting attendance:', error);
    toast({
      title: "Error",
      description: error.message || "Failed to reset attendance.",
      variant: "destructive",
    });
  },
});

  const handleMarkAttendance = async (
  playerId: string,
  playerIgn: string,
  status: 'present' | 'absent',
  kills?: number
) => {
  try {
    const newAttendance = await markAttendanceMutation.mutateAsync({ playerId, status, kills, lobby: selectedLobby });
    
    if (newAttendance) {
      const { dismiss } = toast({
        title: "Attendance Marked",
        description: `${playerIgn} marked as ${status} (${kills || 0} kills) for ${attendanceMode} - Lobby ${selectedLobby} on ${new Date(selectedDate).toLocaleDateString()}`,
        duration: 60000, // 1 minute
        action: (
          <Button
            variant="outline"
            onClick={() => {
              undoAttendanceMutation.mutate(newAttendance.id);
              dismiss();
            }}
          >
            Undo
          </Button>
        ),
      });
    }

  } catch (error) {
    console.error('Error marking attendance:', error);
    toast({
      title: "Error",
      description: "Failed to mark attendance",
      variant: "destructive",
    });
  }
};


  const setToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const exportData = (format: 'csv' | 'xlsx') => {
    const filteredRecords = attendanceRecords.filter(record => 
      record.profiles?.ign?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Mock export functionality
    toast({
      title: "Export Started",
      description: `Exporting attendance data as ${format.toUpperCase()}...`,
    });
  };

  const scrollToPlayer = (playerIgn: string) => {
    const element = document.getElementById(`player-${playerIgn}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-primary/20');
      setTimeout(() => {
        element.classList.remove('bg-primary/20');
      }, 2000);
    }
  };

  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.ign.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || player.role === roleFilter;
    return matchesSearch && matchesRole && !player.is_banned;
  });

  const filteredRecords = attendanceRecords.filter(record =>
    record.profiles?.ign?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgAttendance = players.length > 0 ? Math.round(players.reduce((sum, p) => sum + (p.attendance || 0), 0) / players.length) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-orbitron mb-2">Attendance Management</h1>
          <p className="text-muted-foreground font-rajdhani">Track and manage player attendance</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1 font-orbitron">{players.length}</div>
            <div className="text-sm text-muted-foreground font-rajdhani">Total Players</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1 font-orbitron">{avgAttendance}%</div>
            <div className="text-sm text-muted-foreground font-rajdhani">Avg Attendance</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1 font-orbitron">
              {attendanceRecords.filter(r => r.status === 'present').length}
            </div>
            <div className="text-sm text-muted-foreground font-rajdhani">Present Records</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-400 mb-1 font-orbitron">
              {attendanceRecords.filter(r => r.status === 'absent').length}
            </div>
            <div className="text-sm text-muted-foreground font-rajdhani">Absent Records</div>
          </CardContent>
        </Card>
      </div>

      {/* Attendance Mode & Lobby Selection */}
      <Card className="bg-card/50 border-border/30">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="grid grid-cols-2 sm:flex rounded-lg bg-background/50 p-1 w-full sm:w-auto gap-1">
              {(['MP', 'BR'] as AttendanceMode[]).map((mode) => (
                <Button
                  key={mode}
                  variant={attendanceMode === mode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setAttendanceMode(mode)}
                  className={`font-rajdhani text-xs sm:text-sm px-2 sm:px-4 ${
                    attendanceMode === mode 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  {mode}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-4 sm:flex rounded-lg bg-background/50 p-1 w-full sm:w-auto gap-1">
              {[1, 2, 3, 4].map((lobby) => (
                <Button
                  key={lobby}
                  variant={selectedLobby === lobby ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedLobby(lobby)}
                  className={`font-rajdhani text-xs sm:text-sm px-2 sm:px-4 ${
                    selectedLobby === lobby 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted/50'
                  }`}
                >
                  Lobby {lobby}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Date Selection & Filters */}
      <Card className="bg-card/50 border-border/30">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex items-center space-x-2">
              <Label className="font-rajdhani">Date:</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-background/50 border-border/50 font-rajdhani"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={setToday}
                className="font-rajdhani"
              >
                Today
              </Button>
            </div>
            
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search players..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 font-rajdhani"
              />
            </div>

            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-40 bg-background/50 border-border/50">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="player">Player</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="clan_master">Clan Master</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportData('csv')}
                className="font-rajdhani"
              >
                <Download className="w-4 h-4 mr-1" />
                CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportData('xlsx')}
                className="font-rajdhani"
              >
                <Download className="w-4 h-4 mr-1" />
                Excel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Players Attendance Table */}
      <Card className="bg-card/50 border-border/30">
        <CardHeader>
          <CardTitle className="text-foreground font-orbitron flex items-center">
            <UserCheck className="w-5 h-5 mr-2 text-primary" />
            {attendanceMode} Lobby {selectedLobby} Attendance - {new Date(selectedDate).toLocaleDateString()}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card/90 backdrop-blur-sm">
                <TableRow className="border-border/30">
                  <TableHead className="text-muted-foreground font-rajdhani">Username</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Kills</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Present</TableHead>
                  <TableHead className="text-muted-foreground font-rajdhani">Absent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {playersLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="text-muted-foreground">Loading players...</div>
                    </TableCell>
                  </TableRow>
                ) : filteredPlayers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      <div className="text-muted-foreground">No players found</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPlayers.map(player => (
                    <TableRow 
                      key={player.id} 
                      id={`player-${player.ign}`}
                      className="border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                            <Users className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground font-rajdhani">
                              {(player as any).status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{player.ign}
                            </div>
                            <div className="text-sm text-muted-foreground font-rajdhani">
                              {player.attendance || 0}% attendance
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
  <Input
    type="number"
    min="0"
    placeholder="Kills"
    value={killsInput[player.id] || ''}
    onChange={(e) =>
      setKillsInput((prev) => ({ ...prev, [player.id]: Number(e.target.value) }))
    }
    className="w-20 font-rajdhani"
  />
</TableCell>

                      <TableCell>
                        <Button
  size="sm"
  onClick={() =>
    handleMarkAttendance(player.id, player.ign, 'present', killsInput[player.id] || 0)
  }
  disabled={markAttendanceMutation.isPending}
  className="bg-green-600 hover:bg-green-700 text-white font-rajdhani"
>
  <CheckCircle className="w-4 h-4 mr-1" />
  Present
</Button>

                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAttendance(player.id, player.ign, 'absent')}
                          disabled={markAttendanceMutation.isPending}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-rajdhani"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Absent
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Attendance Records */}
      <Card className="bg-card/50 border-border/30">
        <CardHeader>
          <CardTitle className="text-foreground font-orbitron flex items-center">
            <CalendarDays className="w-5 h-5 mr-2 text-primary" />
            Recent {attendanceMode} Records
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/30">
                <TableHead className="text-muted-foreground font-rajdhani">Player</TableHead>
                <TableHead className="text-muted-foreground font-rajdhani">Event</TableHead>
                <TableHead className="text-muted-foreground font-rajdhani">Date</TableHead>
                <TableHead className="text-muted-foreground font-rajdhani">Status</TableHead>
                <TableHead className="text-muted-foreground font-rajdhani">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendanceLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-muted-foreground">Loading attendance records...</div>
                  </TableCell>
                </TableRow>
              ) : filteredRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="text-muted-foreground">No attendance records found</div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredRecords.slice(-10).reverse().map(record => (
                  <TableRow key={record.id} className="border-border/30 hover:bg-muted/20">
                    <TableCell 
                      className="font-medium text-foreground font-rajdhani cursor-pointer hover:text-primary"
                      onClick={() => scrollToPlayer(record.profiles?.ign || '')}
                    >
                      {record.profiles ? `${(record.profiles as any).status === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}${record.profiles.ign}` : 'Unknown Player'}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-rajdhani">
                      {record.events?.name || `${attendanceMode} Session`}
                    </TableCell>
                    <TableCell className="text-muted-foreground font-rajdhani">
                      {new Date(record.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Badge className={record.status === 'present' 
                        ? 'bg-green-500/20 text-green-400 border-green-500/50'
                        : 'bg-red-500/20 text-red-400 border-red-500/50'
                      }>
                        {record.status === 'present' ? (
                          <>
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Present
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 mr-1" />
                            Absent
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => undoAttendanceMutation.mutate(record.id)}
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10 font-rajdhani"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Reset
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

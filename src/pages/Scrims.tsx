
import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Crosshair, 
  Calendar, 
  Clock, 
  Users, 
  Trophy, 
  Target,
  Search,
  Filter,
  MapPin,
  Swords,
  Component
} from 'lucide-react';

interface Event {
  id: string;
  name: string;
  type: 'MP' | 'BR' | 'Tournament' | 'Scrims';
  date: string;
  time: string;
  description?: string;
  status: string;
  created_at: string;
  created_by: string;
  profiles?: {
    username: string;
    ign: string;
    role: string;
  };
  event_participants: Array<{
    id: string;
    player_id: string;
    kills?: number;
    verified: boolean;
    profiles: {
      username: string;
      ign: string;
    };
  }>;
  event_groups: Array<{
    id: string;
    name: string;
    max_players: number;
  }>;
}

export const Scrims: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch events/scrims
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      // First, update event status
      await supabase.rpc('update_event_status');
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles!events_created_by_fkey (
            username,
            ign,
            role
          ),
          event_participants (
            id,
            player_id,
            kills,
            verified,
            profiles!event_participants_player_id_fkey (
              username,
              ign
            )
          ),
          event_groups (
            id,
            name,
            max_players
          )
        `)
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
        return [];
      }
      return ((data || []) as Partial<Event>[]).map((event) => ({
        ...event,
        event_participants: Array.isArray(event.event_participants) ? event.event_participants : [],
        event_groups: Array.isArray(event.event_groups) ? event.event_groups : [],
      })) as Event[];
    },
  });

  // Fetch user's participation
  const { data: userParticipation = [] } = useQuery({
    queryKey: ['user-participation', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          *,
          events (
            id,
            name,
            type,
            date,
            time
          )
        `)
        .eq('player_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching user participation:', error);
        return [];
      }
      return data || [];
    },
    enabled: !!user?.id,
  });

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || event.type === filterType;
    const matchesStatus = filterStatus === 'all' || event.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const getEventStatus = (event: Event) => {
    const eventDate = new Date(`${event.date} ${event.time}`);
    const now = new Date();
    
    if (eventDate > now) return 'upcoming';
    if (eventDate.toDateString() === now.toDateString()) return 'ongoing';
    return 'completed';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
      case 'ongoing': return 'bg-green-500/20 border-green-500/50 text-green-300';
      case 'completed': return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
      default: return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MP': return Target;
      case 'BR': return Swords;
      case 'Tournament': return Trophy;
      case 'Scrims': return Component;
      default: return Crosshair;
    }
  };

  const isUserParticipating = (eventId: string) => {
    return (events.find(e => e.id === eventId)?.event_participants ?? []).some((participant) => participant.player_id === user?.id);
  };

  const getUserKills = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    const participation = (event?.event_participants ?? []).find((participant) => participant.player_id === user?.id);
    return participation?.kills || 0;
  };

  const upcomingEvents = filteredEvents.filter(event => getEventStatus(event) === 'upcoming').length;
  const completedEvents = filteredEvents.filter(event => getEventStatus(event) === 'completed').length;
  const totalKills = userParticipation.reduce((acc, p) => acc + (p.kills || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Scrimmages & Events</h1>
          <p className="text-gray-400">Track your performance and upcoming matches</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1">{upcomingEvents}</div>
            <div className="text-sm text-gray-400">Upcoming Events</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-400 mb-1">{completedEvents}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#FF1F44] mb-1">{userParticipation.length}</div>
            <div className="text-sm text-gray-400">Participated</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">{totalKills}</div>
            <div className="text-sm text-gray-400">Total Kills</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search events..."
            className="pl-10 bg-background/50 border-border text-white"
          />
        </div>
        
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48 bg-background/50 border-border text-white">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="MP">Multiplayer</SelectItem>
            <SelectItem value="BR">Battle Royale</SelectItem>
            <SelectItem value="Tournament">Tournament</SelectItem>
            <SelectItem value="Scrims">Scrims</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48 bg-background/50 border-border text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="ongoing">Ongoing</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading events...</div>
        </div>
      ) : filteredEvents.length === 0 ? (
        <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
          <CardContent className="text-center py-12">
            <Crosshair className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No events found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'No events scheduled at the moment'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map((event) => {
            const TypeIcon = getTypeIcon(event.type);
            const status = getEventStatus(event);
            const isParticipating = isUserParticipating(event.id);
            const userKills = getUserKills(event.id);
            
            return (
              <Card key={event.id} className="bg-card/50 border-border/30 backdrop-blur-sm hover:border-[#FF1F44]/30 transition-colors">
                <CardHeader className="p-4 sm:p-8 pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="p-2 bg-[#FF1F44]/20 rounded-lg">
                        <TypeIcon className="w-5 h-5 text-[#FF1F44]" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-white text-base sm:text-lg mb-2">
                          {event.name}
                        </CardTitle>
                        <div className="flex items-center space-x-3 sm:space-x-4 text-xs sm:text-sm text-gray-400">
                          <span className="flex items-center">
                            <Calendar className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1" />
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Clock className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1" />
                            {event.time}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2">
                      <Badge className={`${getStatusColor(status)} text-[10px] sm:text-xs px-2 py-0`}>
                        {status.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="border-border text-muted-foreground text-[10px] sm:text-xs px-2 py-0">
                        {event.type}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-4 sm:p-8 pt-0">
                  {event.description && (
                    <p className="text-gray-300 text-xs sm:text-sm mb-4">{event.description}</p>
                  )}
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center text-xs sm:text-sm text-gray-400">
                        <Users className="w-3.5 sm:w-4 h-3.5 sm:h-4 mr-1" />
                        {(event.event_participants ?? []).length} Players
                      </span>
                      <span className="flex items-center text-sm text-gray-400">
                        <MapPin className="w-4 h-4 mr-1" />
                        {(event.event_groups ?? []).length} groups
                      </span>
                    </div>
                    
                    {isParticipating && (
                      <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-green-300 text-sm font-medium">You're participating!</span>
                          {userKills > 0 && (
                            <span className="text-green-300 text-sm">
                              {userKills} kills recorded
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-gray-500">
  Created by {event.profiles?.ign || 'Admin'}
</span>
                      {status === 'upcoming' && !isParticipating && (
                        <Button size="sm" variant="outline" className="border-[#FF1F44] text-[#FF1F44] hover:bg-[#FF1F44] hover:text-white">
                          Request to Join
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

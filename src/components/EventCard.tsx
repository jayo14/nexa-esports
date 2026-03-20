
import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";
import { Calendar, Users, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { sendEventInvitationEmail } from "@/lib/emailService";

interface Event {
  id: string;
  name: string;
  date: string;
  time?: string;
  end_time?: string;
  type: string;
  status: string;
  description?: string;
  group_id?: string;
}

interface EventCardProps {
  event: Event;
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const { user, profile } = useAuth();
  const { sendNotification } = useNotifications();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: groupInfo, isLoading: isLoadingGroup } = useQuery({
    queryKey: ["event-group", event.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data: participantData, error: participantError } = await supabase
        .from("event_participants")
        .select("group_id")
        .eq("event_id", event.id)
        .eq("player_id", user?.id)
        .maybeSingle();

      if (participantError || !participantData?.group_id) {
        return { is_assigned: false };
      }

      const { data: groupData, error: groupError } = await supabase
        .from("event_participants")
        .select("id, group_id, player_id, role, kills, verified, profiles!event_participants_player_id_fkey(id, username, ign, avatar_url)")
        .eq("event_id", event.id)
        .eq("group_id", participantData.group_id);

      if (groupError) {
        console.error("Error fetching group members:", groupError);
        return { is_assigned: true, members: [], group_name: "Unknown Group" };
      }

      const { data: groupNameData, error: groupNameError } = await supabase
        .from("event_groups")
        .select("name")
        .eq("id", participantData.group_id)
        .single();

      if (groupNameError) {
        console.error("Error fetching group name:", groupNameError);
      }

      return {
        is_assigned: true,
        group_id: participantData.group_id,
        group_name: groupNameData?.name || `Group ${participantData.group_id.substring(0, 8)}`,
        members: groupData.map((p) => ({ ...p.profiles, role: p.role })),
      };
    },
    enabled: !!user?.id,
  });

  const handleRequestAssignment = async () => {
    if (!user || !event) return;

    try {
      const { data: admins, error: adminError } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'admin')
        .limit(1);

      if (adminError || !admins || admins.length === 0) {
        toast({
          title: "Error",
          description: "Failed to find an admin to send the request to.",
          variant: "destructive",
        });
        setIsDialogOpen(false);
        return;
      }

      const adminId = admins[0].id;
      const playerName = profile?.ign || profile?.username || user?.email;

      await sendNotification({
        user_id: adminId,
        title: "Assignment Request",
        message: `Player ${playerName} has requested to join the event: ${event.name}.`,
        type: "assignment_request",
      });

      // Send invitation email if user has an email address
      if (user.email) {
        sendEventInvitationEmail({
          to_email: user.email,
          to_name: playerName ?? "Player",
          event_name: event.name,
          event_date: new Date(event.date).toLocaleDateString(),
          event_time: event.time,
          event_type: event.type,
          description: event.description,
        });
      }

      toast({
        title: "Success",
        description: "Your request has been sent to the admin.",
      });
    } catch (error) {
      console.error("Error sending notification:", error);
      toast({
        title: "Error",
        description: "Failed to send assignment request.",
        variant: "destructive",
      });
    } finally {
      setIsDialogOpen(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'ongoing':
        return <Badge className="bg-green-500/20 text-green-400 hover:bg-green-500/30 border-green-500/50">Ongoing</Badge>;
      case 'completed':
        return <Badge variant="outline" className="text-gray-400 border-gray-600">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-blue-500/50">Upcoming</Badge>;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "MP": return "text-purple-400";
      case "BR": return "text-orange-400";
      case "Tournament": return "text-yellow-400";
      case "Scrims": return "text-indigo-400";
      default: return "text-gray-400";
    }
  };

  return (
    <Card className="group relative overflow-hidden bg-card/40 border-white/5 backdrop-blur-sm transition-all hover:bg-card/60 hover:border-white/10 hover:shadow-lg">
      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#FF1F44] to-transparent opacity-50" />
      
      <CardHeader className="p-4 sm:p-8 pb-3 sm:pb-3">
        <div className="flex justify-between items-start gap-2 sm:gap-4">
          <div className="space-y-1">
            <CardTitle className="text-lg sm:text-xl font-bold text-white group-hover:text-[#FF1F44] transition-colors flex items-center gap-2">
              {event.name}
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-400">
              <span className={`font-semibold ${getTypeColor(event.type)}`}>{event.type}</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                {new Date(event.date).toLocaleDateString()}
              </span>
              {event.time && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                  {event.time}
                  {event.end_time && ` - ${event.end_time}`}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(event.status)}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-8 pt-0 space-y-3 sm:space-y-4">
        {event.description && (
          <p className="text-xs sm:text-sm text-gray-400 line-clamp-2">{event.description}</p>
        )}

        {event.status === 'completed' ? (
           <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20 flex items-center justify-center gap-2 text-gray-400 text-sm">
             <CheckCircle2 className="w-4 h-4" />
             Event Completed
           </div>
        ) : isLoadingGroup ? (
          <div className="h-12 w-full animate-pulse bg-white/5 rounded-lg" />
        ) : groupInfo?.is_assigned ? (
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Assigned to <span className="font-bold">{groupInfo.group_name}</span>
              </span>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full bg-transparent border-green-500/30 text-green-400 hover:bg-green-500/20 hover:text-green-300">
                  <Users className="w-4 h-4 mr-2" />
                  View Team
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900/95 border-gray-800 text-white backdrop-blur-xl">
                <DialogHeader>
                  <DialogTitle>Team Members: {groupInfo.group_name}</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Your squad for this event.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4">
                  {groupInfo.members?.map((member) => (
                    <div key={member.id} className="flex items-center space-x-3 bg-gray-800/50 p-3 rounded-lg border border-white/5">
                      <img
                        src={member.avatar_url || `https://ui-avatars.com/api/?name=${member.username}&background=random`}
                        alt={member.username}
                        className="w-10 h-10 rounded-full object-cover ring-2 ring-white/10"
                      />
                      <div>
                        <p className="font-bold text-white text-sm">
                          {member.ign || member.username}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{member.role || 'Player'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 space-y-3">
            <div className="flex items-center gap-2 text-sm text-yellow-400">
              <AlertTriangle className="w-4 h-4" />
              <span>Not assigned to a team yet.</span>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="w-full bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/50">
                  Request Assignment
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-gray-800">
                <DialogHeader>
                  <DialogTitle className="text-white">Request Assignment</DialogTitle>
                  <DialogDescription className="text-gray-400">
                    Send a request to admins to join a team for {event.name}?
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-gray-400 hover:text-white hover:bg-white/10">
                    Cancel
                  </Button>
                  <Button onClick={handleRequestAssignment} className="bg-[#FF1F44] hover:bg-red-600 text-white">
                    Send Request
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

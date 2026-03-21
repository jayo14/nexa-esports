import React, { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { logEventDelete, logEventStatusUpdate } from "@/lib/activityLogger";
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  Trash2,
  Users,
  Search,
  Activity,
  CalendarDays,
  Trophy,
} from "lucide-react";
import { Event } from "@/types/events";

export const AdminEventsManagement: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch events using useQuery
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select(
          `
          *,
          event_participants (count)
        `
        )
        .order("date", { ascending: false });

      if (error) throw error;
      return data as Event[];
    },
  });

  // Function to check and return the correct status based on time
  const getEventStatus = (
    eventDate: string,
    eventTime: string,
    endTime?: string
  ) => {
    const now = new Date();
    const eventStartDateTime = new Date(`${eventDate}T${eventTime}`);
    const eventEndDateTime = endTime
      ? new Date(`${eventDate}T${endTime}`)
      : null;

    if (now < eventStartDateTime) {
      return "upcoming";
    }

    if (eventEndDateTime && now >= eventEndDateTime) {
      return "completed";
    }

    if (now >= eventStartDateTime) {
      return "ongoing";
    }

    return "upcoming";
  };

  // Function to automatically update event statuses in the database
  const updateEventStatuses = async (eventsToProcess: Event[]) => {
    if (!eventsToProcess || eventsToProcess.length === 0) return;

    const eventsToUpdate = eventsToProcess.filter((event) => {
      // Only auto-update if the status isn't manually set to cancelled
      if (event.status === "cancelled") {
        return false;
      }

      const newStatus = getEventStatus(event.date, event.time, event.end_time);
      return event.status !== newStatus;
    });

    if (eventsToUpdate.length > 0) {
      try {
        await Promise.all(
          eventsToUpdate.map((event) =>
            supabase
              .from("events")
              .update({
                status: getEventStatus(event.date, event.time, event.end_time),
                updated_at: new Date().toISOString(),
              })
              .eq("id", event.id)
          )
        );

        queryClient.invalidateQueries({ queryKey: ["events"] });

        const upcomingToOngoingCount = eventsToUpdate.filter(
          (e) => getEventStatus(e.date, e.time, e.end_time) === "ongoing"
        ).length;
        const ongoingToCompletedCount = eventsToUpdate.filter(
          (e) => getEventStatus(e.date, e.time, e.end_time) === "completed"
        ).length;

        let message = "";
        if (upcomingToOngoingCount > 0)
          message += `${upcomingToOngoingCount} event(s) started. `;
        if (ongoingToCompletedCount > 0)
          message += `${ongoingToCompletedCount} event(s) completed.`;

        if (message) {
          toast({
            title: "Event Status Updated",
            description: message.trim(),
          });
        }
      } catch (error) {
        console.error("Error updating event statuses:", error);
      }
    }
  };

  // Main effect for auto-updates and real-time subscription
  useEffect(() => {
    // Check and update statuses every minute
    if (events.length > 0) {
      updateEventStatuses(events);
    }
    const intervalId = setInterval(() => {
      if (events.length > 0) {
        updateEventStatuses(events);
      }
    }, 60000);

    // Set up real-time subscription
    const subscription = supabase
      .channel("events_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "events" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["events"] });
        }
      )
      .subscribe();

    return () => {
      clearInterval(intervalId);
      subscription.unsubscribe();
    };
  }, [events, queryClient]);

  // Manual status update mutation (for admin override)
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      eventId,
      newStatus,
      eventName,
      oldStatus,
    }: {
      eventId: string;
      newStatus: string;
      eventName: string;
      oldStatus: string;
    }) => {
      const { error } = await supabase
        .from("events")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", eventId);
      if (error) throw error;

      // Log status update
      await logEventStatusUpdate(eventName, oldStatus, newStatus);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      
      // Notify all players about status change
      supabase.functions.invoke('send-notification', {
        body: {
          type: 'event_status_changed',
          title: `Status Update: ${variables.eventName}`,
          message: `Operational status has changed from ${variables.oldStatus.toUpperCase()} to ${variables.newStatus.toUpperCase()}.`,
          data: {
            eventId: variables.eventId,
            eventName: variables.eventName,
            oldStatus: variables.oldStatus,
            newStatus: variables.newStatus,
            type: 'event_status_changed'
          }
        }
      });

      toast({
        title: "Status Updated",
        description: "Event status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete event mutation
  const deleteEventMutation = useMutation({
    mutationFn: async ({ eventId, eventName }: { eventId: string; eventName: string }) => {
      const { error } = await supabase
        .from("events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;

      // Log event deletion
      await logEventDelete(eventName);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
      
      // Notify all players about deletion/cancellation
      supabase.functions.invoke('send-notification', {
        body: {
          type: 'event_deleted',
          title: `Mission Aborted: ${variables.eventName}`,
          message: `Intel suggests that ${variables.eventName} has been cancelled or removed from the operative schedule.`,
          data: {
            eventName: variables.eventName,
            type: 'event_deleted'
          }
        }
      });

      toast({
        title: "Event Deleted",
        description: "Event has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "Failed to delete event",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (event: Event) => {
    if (confirm("Are you sure you want to delete this event?")) {
      deleteEventMutation.mutate({ eventId: event.id, eventName: event.name });
    }
  };

  const handleStatusChange = (event: Event, newStatus: string) => {
    updateStatusMutation.mutate({ 
      eventId: event.id, 
      newStatus, 
      eventName: event.name, 
      oldStatus: event.status 
    });
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || event.type === typeFilter;
    const matchesStatus =
      statusFilter === "all" || event.status === statusFilter;

    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = useMemo(() => {
    const total = events.length;
    const upcoming = events.filter((e) => e.status === "upcoming").length;
    const ongoing = events.filter((e) => e.status === "ongoing").length;
    const completed = events.filter((e) => e.status === "completed").length;

    return { total, upcoming, ongoing, completed };
  }, [events]);

  const C = {
    primary: "#f20d20",
    panel: "rgba(255,255,255,0.03)",
    border: "rgba(255,255,255,0.08)",
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-500/15 text-blue-300 border-blue-500/25";
      case "ongoing":
        return "bg-green-500/15 text-green-300 border-green-500/25";
      case "completed":
        return "bg-slate-500/15 text-slate-300 border-slate-500/25";
      case "cancelled":
        return "bg-red-500/15 text-red-300 border-red-500/25";
      default:
        return "bg-slate-500/15 text-slate-300 border-slate-500/25";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "MP":
        return "bg-purple-500/15 text-purple-300 border-purple-500/25";
      case "BR":
        return "bg-orange-500/15 text-orange-300 border-orange-500/25";
      case "Tournament":
        return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
      case "Scrims":
        return "bg-indigo-500/15 text-indigo-300 border-indigo-500/25";
      default:
        return "bg-slate-500/15 text-slate-300 border-slate-500/25";
    }
  };

  // Helper function to get detailed event time status
  const getEventTimeStatus = (
    eventDate: string,
    eventTime: string,
    endTime?: string
  ) => {
    const now = new Date();
    const eventStartDateTime = new Date(`${eventDate}T${eventTime}`);
    const eventEndDateTime = endTime
      ? new Date(`${eventDate}T${endTime}`)
      : null;

    if (now < eventStartDateTime) {
      const timeDiff = eventStartDateTime.getTime() - now.getTime();
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) return `Starts in ${days}d ${hours}h`;
      return `Starts in ${hours}h ${minutes}m`;
    }

    if (eventEndDateTime && now >= eventEndDateTime) {
      const timeDiff = now.getTime() - eventEndDateTime.getTime();
      const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) return `Ended ${days}d ${hours}h ago`;
      return `Ended ${hours}h ${minutes}m ago`;
    }

    if (now >= eventStartDateTime) {
      if (eventEndDateTime) {
        const timeToEnd = eventEndDateTime.getTime() - now.getTime();
        const hours = Math.floor(timeToEnd / (1000 * 60 * 60));
        const minutes = Math.floor(
          (timeToEnd % (1000 * 60 * 60)) / (1000 * 60)
        );

        if (hours > 0) return `Ends in ${hours}h ${minutes}m`;
        return `Ends in ${minutes}m`;
      } else {
        const timeDiff = now.getTime() - eventStartDateTime.getTime();
        const hours = Math.floor(timeDiff / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        return `Started ${hours}h ${minutes}m ago`;
      }
    }

    return "";
  };

  return (
    <div className="min-h-full space-y-5">
      <Card
        className="border-0"
        style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Events Management
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Create and manage tournament events with auto status updates
              </p>
            </div>

            <Button
              onClick={() => navigate("/admin/events/new")}
              className="w-full sm:w-auto font-bold"
              style={{ background: C.primary }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">Total Events</p>
            <p className="text-2xl font-extrabold text-white">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">Upcoming</p>
            <p className="text-2xl font-extrabold text-blue-300">{stats.upcoming}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">Ongoing</p>
            <p className="text-2xl font-extrabold text-green-300">{stats.ongoing}</p>
          </CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs text-slate-400 mb-1">Completed</p>
            <p className="text-2xl font-extrabold text-slate-200">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      <Card
        className="border-0"
        style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by event name or description..."
                className="pl-10 bg-black/20 border-white/10 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex gap-3">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full lg:w-44 bg-black/20 border-white/10 text-slate-100">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="MP">Multiplayer</SelectItem>
                  <SelectItem value="BR">Battle Royale</SelectItem>
                  <SelectItem value="Tournament">Tournament</SelectItem>
                  <SelectItem value="Scrims">Scrims</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full lg:w-44 bg-black/20 border-white/10 text-slate-100">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {isLoading ? (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm">
            <CardContent className="p-10 text-center text-slate-400">
              Loading events...
            </CardContent>
          </Card>
        ) : filteredEvents.length === 0 ? (
          <Card className="border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-10 sm:p-14 text-center relative">
              <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-red-500/10 blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-red-500/10 blur-3xl" />

              <div className="relative">
                <div className="w-20 h-20 rounded-full mx-auto mb-5 flex items-center justify-center bg-red-500/10 border border-red-500/20">
                  <CalendarDays className="w-10 h-10 text-red-400/60" />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">
                  {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                    ? "No events match your filters"
                    : "No events created yet"}
                </h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                  Start by creating your first event and assigning players.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <Card
              key={event.id}
              className="border-white/10 bg-white/5 backdrop-blur-sm"
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-bold text-white truncate">
                        {event.name}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge className={getTypeColor(event.type)}>{event.type}</Badge>
                        <Badge
                          className={getStatusColor(event.status)}
                          onClick={() => {
                            const statusCycle = {
                              upcoming: "ongoing",
                              ongoing: "completed",
                              completed: "upcoming",
                              cancelled: "upcoming",
                            };
                            handleStatusChange(
                              event,
                              statusCycle[event.status as keyof typeof statusCycle] || "upcoming"
                            );
                          }}
                          style={{ cursor: "pointer" }}
                          title="Click to cycle status"
                        >
                          {event.status}
                        </Badge>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          {new Date(event.date).toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          {event.time}{event.end_time ? ` - ${event.end_time}` : ""}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Users className="w-4 h-4" />
                          {event.event_participants?.[0]?.count || 0} participants
                        </div>
                        <div className="text-xs font-semibold text-red-300">
                          {getEventTimeStatus(event.date, event.time, event.end_time)}
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-sm text-slate-400 mt-3 line-clamp-2">
                          {event.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/events/${event.id}/assign`)}
                        className="border-white/15 bg-black/20 hover:bg-red-500/10 hover:text-red-300"
                      >
                        <Users className="w-4 h-4 mr-1" />
                        Assign Players
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                        className="border-white/15 bg-black/20"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(event)}
                        className="border-red-500/25 bg-red-500/10 text-red-300 hover:text-red-200"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
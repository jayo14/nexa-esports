import React, { useState, useEffect } from "react";
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
import { useAuth } from "@/contexts/AuthContext";
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
} from "lucide-react";
import { Event } from "@/types/events";

export const AdminEventsManagement: React.FC = () => {
  const { profile } = useAuth();
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["activities"] });
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "upcoming":
        return "bg-blue-100 text-blue-800";
      case "ongoing":
        return "bg-green-100 text-green-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "MP":
        return "bg-purple-100 text-purple-800";
      case "BR":
        return "bg-orange-100 text-orange-800";
      case "Tournament":
        return "bg-green-100 text-green-800";
      case "Scrims":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Events Management</h1>
          <p className="text-muted-foreground">
            Create and manage tournament events with auto status updates
          </p>
        </div>
        <Button
          onClick={() => navigate("/admin/events/new")}
          className="bg-primary hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Event
        </Button>
      </div>

      {/* Filters */}
      <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search events..."
                  className="pl-10 bg-background/50"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-40 bg-background/50">
                <SelectValue placeholder="Filter by type" />
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
              <SelectTrigger className="w-full sm:w-40 bg-background/50">
                <SelectValue placeholder="Filter by status" />
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
        </CardContent>
      </Card>

      {/* Events List */}
      <div className="grid gap-4">
        {isLoading ? (
          <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">Loading events...</div>
            </CardContent>
          </Card>
        ) : filteredEvents.length === 0 ? (
          <Card className="bg-card/50 border-border/30 backdrop-blur-sm">
            <CardContent className="p-8 text-center">
              <div className="text-muted-foreground">
                {searchTerm || typeFilter !== "all" || statusFilter !== "all"
                  ? "No events match your filters."
                  : "No events created yet."}
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredEvents.map((event) => (
            <Card
              key={event.id}
              className="bg-card/50 border-border/30 backdrop-blur-sm"
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-2">
                          {event.name}
                        </h3>

                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <Badge className={getTypeColor(event.type)}>
                            {event.type}
                          </Badge>
                          <Badge
                            className={getStatusColor(event.status)}
                            onClick={() => {
                              // Quick status toggle for admin
                              const statusCycle = {
                                upcoming: "ongoing",
                                ongoing: "completed",
                                completed: "upcoming",
                                cancelled: "upcoming",
                              };
                              handleStatusChange(
                                event,
                                statusCycle[
                                  event.status as keyof typeof statusCycle
                                ] || "upcoming"
                              );
                            }}
                            style={{ cursor: "pointer" }}
                            title="Click to cycle status"
                          >
                            {event.status}
                          </Badge>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(event.date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {event.time}
                            {event.end_time && ` - ${event.end_time}`}
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {event.event_participants?.[0]?.count || 0}{" "}
                            participants
                          </div>
                          <div className="text-xs font-medium">
                            {getEventTimeStatus(
                              event.date,
                              event.time,
                              event.end_time
                            )}
                          </div>
                        </div>

                        {event.description && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {event.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        navigate(`/admin/events/${event.id}/assign`)
                      }
                      className="hover:bg-primary/10 hover:text-primary"
                    >
                      <Users className="w-4 h-4 mr-1" />
                      Assign Players
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/admin/events/${event.id}/edit`)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(event)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
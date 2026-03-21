import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import PlayerProfileModal from "@/components/PlayerProfileModal";
import {
  Bell,
  Copy,
  Eye,
  Search,
  UserPlus,
  Key,
  Clock,
  CheckCircle,
  AlertCircle,
  Calendar,
  Target,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';

export const AdminNotifications: React.FC = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<null | {
    name: string;
    id: string;
  }>(null);

  const isAdminOrClanMaster = profile?.role === 'admin' || profile?.role === 'clan_master';

  const { data: notifications = [], isLoading } = useQuery<any[]>({   
    queryKey: ['notifications', currentPage, itemsPerPage, profile?.id], 
    queryFn: async () => {
      const from = currentPage * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("notifications")
        .select("*, user:profiles(ign, status), read_receipts:notification_read_broadcasts(id)")
        .order("created_at", { ascending: false })
        .range(from, to);

      // If not admin, only show their own notifications or broadcasts
      if (!isAdminOrClanMaster && profile?.id) {
        query = query.or(`user_id.eq.${profile.id},user_id.is.null`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching notifications:", error.message);
        return [];
      } else {
        const formatted = data.map((n) => {
          const isRead = n.user_id ? n.read : (n.read_receipts && n.read_receipts.length > 0);
          
          return {
            id: n.id,
            type: n.type,
            message: n.message,
            title: n.title,
            playerName: (n.user as any)?.ign || "Unknown",
            playerStatus: (n.user as any)?.status || "",
            accessCode: (n.data as any)?.accessCode || "",
            timestamp: n.created_at,
            status: isRead ? "read" : "unread",
            action: (n.action_data as any)?.action || "",
            userId: n.user_id,
          };
        });
        return formatted;
      }
    }
  });

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "access_code_request":
        return <Key className="w-5 h-5 text-yellow-400" />;
      case "new_player_joined":
        return <UserPlus className="w-5 h-5 text-green-400" />;
      case "event_created":
      case "event_updated":
      case "scrim_scheduled":
        return <Calendar className="w-5 h-5 text-blue-400" />;
      default:
        return <Bell className="w-5 h-5 text-primary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "unread":
        return "bg-blue-500/20 text-blue-400 border-blue-500/50";
      case "read":
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
      case "responded":
        return "bg-green-500/20 text-green-400 border-green-500/50";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
    }
  };

  const handleCopyCode = (code: string, notificationId: string) => {
    navigator.clipboard.writeText(code);

    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    // Update in database
    supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notificationId);

    toast({
      title: "Code Copied",
      description: `Access code ${code} copied to clipboard`,
    });
  };

  const handleViewPlayer = (playerName: string, notificationId: string) => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] });

    setSelectedPlayer({ name: playerName, id: notificationId });
    setIsModalOpen(true);

    toast({
      title: "Player Profile",
      description: `Viewing profile for ${playerName}`,
    });
  };

  const markAsRead = async (notificationId: string) => {
    if (!profile?.id) return;

    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    if (notification.userId) {
      // Personal notification
      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking personal as read:", error);
        return;
      }
    } else {
      // Broadcast notification
      const { error } = await supabase
        .from("notification_read_broadcasts")
        .upsert({ 
          notification_id: notificationId,
          user_id: profile.id
        });

      if (error) {
        console.error("Error marking broadcast as read:", error);
        return;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  const markAllAsRead = async () => {
    if (!profile?.id) return;

    const unreadPersonalIds = notifications
      .filter(n => n.userId && n.status === 'unread')
      .map(n => n.id);

    const unreadBroadcastIds = notifications
      .filter(n => !n.userId && n.status === 'unread')
      .map(n => n.id);

    if (unreadPersonalIds.length > 0) {
      await supabase
        .from("notifications")
        .update({ read: true })
        .in("id", unreadPersonalIds);
    }

    if (unreadBroadcastIds.length > 0) {
      const inserts = unreadBroadcastIds.map(id => ({
        notification_id: id,
        user_id: profile.id
      }));
      await supabase
        .from("notification_read_broadcasts")
        .upsert(inserts);
    }

    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast({
      title: "All Marked as Read",
      description: "All viewable notifications have been marked as read",
    });
  };

  const clearAllNotifications = async () => {
    if (!isAdminOrClanMaster) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000"); // Delete all

    if (error) {
      console.error("Error clearing notifications:", error);
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['notifications'] });
    toast({
      title: "Notifications Cleared",
      description: "All system notifications have been cleared",
    });
  };

  // Helper function to create a notification for testing
  const createTestNotification = async () => {
    const { error } = await supabase.from("notifications").insert([
      {
        type: "event_created",
        message: "New scrim event has been scheduled for tomorrow",
        title: "Scrim Scheduled",
        data: {
          eventName: "Weekly Scrim",
          eventDate: new Date().toISOString(),
        },
        action_data: { action: "view_event" },
        read: false,
      },
    ]);

    if (error) {
      console.error("Error creating test notification:", error);
    } else {
      toast({
        title: "Test Notification Created",
        description: "A test event notification has been created",
      });
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    const matchesSearch =
      notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notification.playerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = filter === "all" || notification.status === filter;

    return matchesSearch && matchesFilter;
  });

  const unreadCount = notifications.filter((n) => n.status === "unread").length;
  const totalNotifications = notifications.length;

  const formatTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);

    if (diffInSeconds < 1) return "now";
    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;

    const minutes = Math.floor(diffInSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(diffInSeconds / 3600);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(diffInSeconds / 86400);
    if (days < 7) return `${days}d ago`;

    const weeks = Math.floor(diffInSeconds / 604800);
    if (weeks < 5) return `${weeks}w ago`;

    const months = Math.floor(diffInSeconds / 2628000);
    if (months < 12) return `${months}mo ago`;

    const years = Math.floor(diffInSeconds / 31536000);
    return `${years}y ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground font-orbitron mb-2">
            Notifications
          </h1>
          <p className="text-muted-foreground font-rajdhani">
            Manage clan notifications and requests
          </p>
        </div>
        <div className="flex gap-2">
          {/* <Button
            onClick={createTestNotification}
            variant="outline"
            className="font-rajdhani border-green-500 text-green-400 hover:bg-green-500/10"
          >
            <Bell className="w-4 h-4 mr-2" />
            Test Notification
          </Button> */}
          <Button
            onClick={markAllAsRead}
            variant="outline"
            className="font-rajdhani"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark All Read
          </Button>
          {isAdminOrClanMaster && (
            <Button
              onClick={clearAllNotifications}
              variant="outline"
              className="font-rajdhani border-red-500 text-red-400 hover:bg-red-500/10"
            >
              <AlertCircle className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1 font-orbitron">
              {totalNotifications}
            </div>
            <div className="text-sm text-muted-foreground font-rajdhani">
              Total Notifications
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-400 mb-1 font-orbitron">
              {unreadCount}
            </div>
            <div className="text-sm text-muted-foreground font-rajdhani">
              Unread
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1 font-orbitron">
              {
                notifications.filter((n) => n.type === "access_code_request")
                  .length
              }
            </div>
            <div className="text-sm text-muted-foreground font-rajdhani">
              Access Requests
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-border/30">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1 font-orbitron">
              {
                notifications.filter((n) => n.type === "new_player_joined")
                  .length
              }
            </div>
            <div className="text-sm text-muted-foreground font-rajdhani">
              New Joins
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rest of the component remains the same */}
      <Card className="bg-card/50 border-border/30">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-border/50 font-rajdhani"
              />
            </div>

            <div className="flex space-x-2">
              {["all", "unread", "read", "responded"].map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(status)}
                  className="font-rajdhani capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <Card className="bg-card/50 border-border/30">
        <CardHeader>
          <CardTitle className="text-foreground font-orbitron flex items-center">
            <Bell className="w-5 h-5 mr-2 text-primary" />
            Recent Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredNotifications.length > 0 ? (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={`p-4 rounded-lg border transition-all duration-200 cursor-pointer ${
                    notification.status === "unread"
                      ? "bg-primary/5 border-primary/30"
                      : "bg-background/30 border-border/30"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-foreground font-rajdhani">
                            {notification.title || notification.message}
                          </p>
                        </div>
                        {notification.title &&
                          notification.message !== notification.title && (
                            <p className="text-sm text-muted-foreground font-rajdhani mb-1">
                              {notification.message}
                            </p>
                          )}
                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="font-rajdhani">
                            {formatTimeAgo(notification.timestamp)}
                          </span>
                          {notification.userId && (
                            <>
                              <span>•</span>
                              <span className="font-rajdhani">
                                User: {notification.playerStatus === 'beta' ? 'Ɲ・乃' : 'Ɲ・乂'}{notification.playerName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2 ml-4">
                      {notification.type === "access_code_request" &&
                        notification.accessCode && (
                          <Button
                            size="sm"
                            onClick={() =>
                              handleCopyCode(
                                notification.accessCode!,
                                notification.id
                              )
                            }
                            className="bg-yellow-600 hover:bg-yellow-700 font-rajdhani"
                          >
                            <Copy className="w-4 h-4 mr-1" />
                            Copy Code
                          </Button>
                        )}

                      {notification.action === "view_player" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleViewPlayer(
                              notification.playerName,
                              notification.id
                            )
                          }
                          className="font-rajdhani"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View Player
                        </Button>
                      )}

                      {notification.status === "unread" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => markAsRead(notification.id)}
                          className="text-muted-foreground hover:text-foreground font-rajdhani"
                        >
                          Mark Read
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground font-orbitron mb-2">
                  No Notifications Found
                </h3>
                <p className="text-muted-foreground font-rajdhani">
                  {searchTerm || filter !== "all"
                    ? "Try adjusting your search or filter."
                    : "No notifications to display."}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center items-center space-x-4">
        <Button 
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 0))}
          disabled={currentPage === 0}
        >
          Previous
        </Button>
        <span className="text-white">Page {currentPage + 1}</span>
        <Button 
          onClick={() => setCurrentPage(prev => prev + 1)}
          disabled={notifications.length < itemsPerPage}
        >
          Next
        </Button>
      </div>

      <PlayerProfileModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        player={selectedPlayer}
      />
    </div>
  );
};

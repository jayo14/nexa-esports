import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Megaphone,
  Plus,
  Calendar,
  Trophy,
  Target,
  Users,
  AlertCircle,
  Pin,
} from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string;
  created_at: string;
  is_published: boolean;
  scheduled_for?: string;
  profiles?: {
    username: string;
    ign: string;
    role: string;
  };
}

export const Announcements: React.FC = () => {
  const { user, profile } = useAuth();

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select(
          `
          *,
          profiles (
            username,
            ign,
            role
          )
        `
        )
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching announcements:", error);
        return [];
      }
      return data as Announcement[];
    },
  });

  const getPriorityColor = (createdAt: string) => {
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreated <= 1) {
      return "bg-red-500/20 border-red-500/50 text-red-300";
    } else if (daysSinceCreated <= 3) {
      return "bg-yellow-500/20 border-yellow-500/50 text-yellow-300";
    } else {
      return "bg-gray-500/20 border-gray-500/50 text-gray-300";
    }
  };

  const getPriorityText = (createdAt: string) => {
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreated <= 1) return "NEW";
    if (daysSinceCreated <= 3) return "RECENT";
    return "OLD";
  };

  const getCategoryIcon = (title: string) => {
    const titleLower = title.toLowerCase();
    if (
      titleLower.includes("tournament") ||
      titleLower.includes("championship")
    )
      return Trophy;
    if (titleLower.includes("meeting") || titleLower.includes("strategy"))
      return Users;
    if (titleLower.includes("schedule") || titleLower.includes("war"))
      return Calendar;
    if (titleLower.includes("maintenance") || titleLower.includes("server"))
      return AlertCircle;
    if (titleLower.includes("welcome") || titleLower.includes("member"))
      return Target;
    return Megaphone;
  };

  const recentCount = announcements.filter((a) => {
    const daysSince = Math.floor(
      (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince <= 1;
  }).length;

  const weeklyCount = announcements.filter((a) => {
    const daysSince = Math.floor(
      (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysSince <= 7;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Clan Announcements
          </h1>
          <p className="text-gray-400">
            Stay updated with the latest Nexa Esports news
          </p>
        </div>

        {profile?.role === "admin" && (
          <Button
            onClick={() => (window.location.href = "/admin/announcements")}
            className="bg-[#FF1F44] hover:bg-red-600 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Manage Announcements
          </Button>
        )}
      </div>

      {/* Filter/Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#FF1F44] mb-1">
              {announcements.length}
            </div>
            <div className="text-sm text-gray-400">Total Posts</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-400 mb-1">
              {recentCount}
            </div>
            <div className="text-sm text-gray-400">New (24h)</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400 mb-1">
              {weeklyCount}
            </div>
            <div className="text-sm text-gray-400">This Week</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-400 mb-1">
              {announcements.filter((a) => a.profiles?.role === "admin").length}
            </div>
            <div className="text-sm text-gray-400">From Admins</div>
          </CardContent>
        </Card>
      </div>

      {/* Announcements List */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="text-muted-foreground">Loading announcements...</div>
        </div>
      ) : announcements.length === 0 ? (
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="text-center py-12">
            <Megaphone className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              No announcements yet
            </h3>
            <p className="text-muted-foreground">
              Check back later for updates from the team!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const CategoryIcon = getCategoryIcon(announcement.title);
            const daysSinceCreated = Math.floor(
              (Date.now() - new Date(announcement.created_at).getTime()) /
              (1000 * 60 * 60 * 24)
            );
            const isPinned = daysSinceCreated <= 1; // Pin new announcements

            return (
              <Card
                key={announcement.id}
                className={`bg-white/5 border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all duration-200 ${isPinned ? "border-[#FF1F44]/30 bg-[#FF1F44]/5" : ""
                  }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="p-2 bg-[#FF1F44]/20 rounded-lg">
                        <CategoryIcon className="w-5 h-5 text-[#FF1F44]" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {isPinned && (
                            <Pin className="w-4 h-4 text-[#FF1F44]" />
                          )}
                          <CardTitle className="text-white text-lg">
                            {announcement.title}
                          </CardTitle>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-400">
                          <span>
                            By Ɲ・乂{announcement.profiles?.role || "Admin"}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {new Date(
                              announcement.created_at
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Badge
                      className={getPriorityColor(announcement.created_at)}
                    >
                      {getPriorityText(announcement.created_at)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <p className="text-gray-300 leading-relaxed mb-4">
                    {announcement.content}
                  </p>

                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className="border-white/30 text-gray-400"
                    >
                      {announcement.profiles?.role === "admin"
                        ? "Official"
                        : "Community"}
                    </Badge>

                    {profile?.role === "admin" && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </Button>
                      </div>
                    )}
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

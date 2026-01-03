
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Calendar, Target, TrendingUp, Trophy, Gamepad2, Activity, Bell, FileText, Settings, Shield, BarChart3 } from 'lucide-react';
import { useAdminStats } from '@/hooks/useAdminStats';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useAdminStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-white">Loading dashboard stats...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-red-400">Error loading dashboard stats</div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Players",
      value: stats?.total_players || 0,
      description: "Active clan members",
      icon: Users,
      color: "from-blue-500 to-cyan-500",
      iconColor: "text-blue-400"
    },
    {
      title: "Total Events",
      value: stats?.total_events || 0,
      description: "Scrims & tournaments",
      icon: Calendar,
      color: "from-green-500 to-emerald-500",
      iconColor: "text-green-400"
    },
    {
      title: "Total Kills",
      value: stats?.total_kills || 0,
      description: "Across all events",
      icon: Target,
      color: "from-red-500 to-pink-500",
      iconColor: "text-red-400"
    },
    {
      title: "Avg Attendance",
      value: `${Math.round(stats?.avg_attendance || 0)}%`,
      description: "Player participation",
      icon: TrendingUp,
      color: "from-yellow-500 to-orange-500",
      iconColor: "text-yellow-400"
    },
    {
      title: "Weapon Layouts",
      value: stats?.total_loadouts || 0,
      description: "Shared loadouts",
      icon: Gamepad2,
      color: "from-purple-500 to-indigo-500",
      iconColor: "text-purple-400"
    }
  ];

  const quickActions = [
    {
      title: "Manage Players",
      description: "View and edit player profiles",
      icon: Users,
      color: "from-blue-600 to-cyan-600",
      path: "/admin/players"
    },
    {
      title: "Create Event",
      description: "Schedule new scrims or tournaments",
      icon: Calendar,
      color: "from-green-600 to-emerald-600",
      path: "/admin/events"
    },
    {
      title: "Mark Attendance",
      description: "Record player attendance",
      icon: Activity,
      color: "from-purple-600 to-indigo-600",
      path: "/admin/attendance"
    },
    {
      title: "Send Announcement",
      description: "Broadcast to all members",
      icon: Bell,
      color: "from-orange-600 to-red-600",
      path: "/admin/announcements"
    },
    {
      title: "View Reports",
      description: "Analytics and statistics",
      icon: BarChart3,
      color: "from-pink-600 to-rose-600",
      path: "/admin/activities"
    },
    {
      title: "System Config",
      description: "Manage system settings",
      icon: Settings,
      color: "from-gray-600 to-slate-600",
      path: "/admin/config"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF1F44]/10 to-red-600/5 rounded-lg blur-xl"></div>
        <div className="relative bg-gradient-to-r from-[#FF1F44]/10 to-red-600/5 border border-[#FF1F44]/30 rounded-lg p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 font-orbitron flex items-center gap-3">
                <Shield className="w-10 h-10 text-[#FF1F44]" />
                Admin Command Center
              </h1>
              <p className="text-gray-400 text-lg">NeXa Esports Clan Management System</p>
            </div>
            <div className="hidden md:block">
              <div className="bg-black/30 backdrop-blur-sm border border-[#FF1F44]/30 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-semibold">System Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className="bg-gradient-to-br from-background/40 via-background/20 to-background/40 backdrop-blur-xl border border-white/10 shadow-xl hover:shadow-2xl hover:border-[#FF1F44]/30 transition-all duration-300 relative overflow-hidden group"
            >
              {/* Animated gradient background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
              
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-sm font-medium text-gray-300">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg bg-gradient-to-br ${stat.color} bg-opacity-10`}>
                  <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-3xl font-bold text-white font-mono">{stat.value}</div>
                {stat.title === 'Total Kills' ? (
                  <p className="text-xs text-gray-400 mt-2">
                    <span className="text-blue-400">BR: {stats?.total_br_kills || 0}</span> • <span className="text-green-400">MP: {stats?.total_mp_kills || 0}</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-2">{stat.description}</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card className="bg-gradient-to-br from-background/40 via-background/20 to-background/40 backdrop-blur-xl border border-[#FF1F44]/20 shadow-2xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center text-2xl font-orbitron">
            <Trophy className="w-6 h-6 mr-3 text-[#FF1F44]" />
            Quick Actions
          </CardTitle>
          <CardDescription className="text-gray-400">
            Common administrative tasks and shortcuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  onClick={() => navigate(action.path)}
                  className={`h-auto p-6 flex flex-col items-start gap-3 bg-gradient-to-br ${action.color} hover:opacity-90 transition-all duration-300 shadow-lg hover:shadow-xl group relative overflow-hidden`}
                >
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
                  
                  <div className="flex items-center gap-3 w-full relative z-10">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-white text-lg">{action.title}</div>
                      <div className="text-white/80 text-sm">{action.description}</div>
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card className="bg-gradient-to-br from-background/40 via-background/20 to-background/40 backdrop-blur-xl border border-white/10 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white font-orbitron">System Status</CardTitle>
          <CardDescription className="text-gray-400">
            Real-time clan system monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-green-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-gray-300 font-medium">Database Connection</span>
              </div>
              <span className="text-green-400 font-semibold">Operational</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-green-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-gray-300 font-medium">Player Management</span>
              </div>
              <span className="text-green-400 font-semibold">Active</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-green-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-gray-300 font-medium">Event Scheduler</span>
              </div>
              <span className="text-green-400 font-semibold">Running</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-blue-500/20">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-gray-300 font-medium">Notification Service</span>
              </div>
              <span className="text-blue-400 font-semibold">Ready</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

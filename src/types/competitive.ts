export interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url?: string;
  created_by: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'captain' | 'member';
  joined_at: string;
  profile?: {
    username: string;
    ign: string;
    avatar_url?: string;
    tier?: string;
  };
}

export interface Season {
  id: string;
  name: string;
  season_number?: number;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface MatchDay {
  id: string;
  season_id: string;
  name: string;
  match_date: string;
  is_finalized: boolean;
  created_by: string;
  created_at: string;
  updated_at?: string;
  // Legacy compatibility fields still referenced by older admin pages
  date?: string;
  status?: string;
}

export interface Lobby {
  id: string;
  match_day_id: string;
  lobby_number: number;
  recording_url?: string;
  notes?: string;
  created_at: string;
  // Legacy compatibility field still referenced by older admin pages
  status?: string;
}

export interface LobbyResult {
  id: string;
  lobby_id: string;
  user_id: string;
  team_id?: string;
  kills: number;
  placement: number;
  placement_pts: number;
  kill_pts: number;
  total_pts: number;
  created_at?: string;
  updated_at?: string;
}

export interface SeasonTeamLeaderboard {
  season_id: string;
  team_id: string;
  team_name: string;
  team_tag: string;
  logo_url?: string;
  season_points: number;
  season_kills: number;
  match_days_played: number;
  rank: number;
}

export interface MatchDayTeamScore {
  match_day_id: string;
  season_id: string;
  match_day_name: string;
  match_date: string;
  team_id: string;
  team_name: string;
  team_tag: string;
  team_total_pts: number;
  team_total_kills: number;
  team_kill_pts?: number;
  team_placement_pts?: number;
  player_count?: number;
  match_day_rank: number;
  // Legacy compatibility aliases used by older leaderboard pages
  total_points?: number;
  total_kills?: number;
}

export interface SeasonPlayerStats {
  season_id: string;
  user_id: string;
  username: string;
  ign: string;
  avatar_url?: string;
  team_id?: string;
  team_name?: string;
  season_points: number;
  season_kills: number;
  lobbies_played: number;
  rank: number;
  // Legacy compatibility aliases used by older leaderboard pages
  total_points?: number;
  total_kills?: number;
}

export interface TeamMessage {
  id: string;
  team_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url?: string;
  };
}

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
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

export interface MatchDay {
  id: string;
  season_id: string;
  name: string;
  date: string;
  status: 'upcoming' | 'in_progress' | 'completed';
}

export interface Lobby {
  id: string;
  match_day_id: string;
  lobby_number: number;
  recording_url?: string;
  recording_label?: string;
  status: 'pending' | 'submitted' | 'verified';
}

export interface LobbyResult {
  id: string;
  lobby_id: string;
  user_id: string;
  team_id: string;
  kills: number;
  placement: number;
  kill_points: number;
  placement_points: number;
  total_points: number;
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

export interface LobbyTeamScore {
  lobby_id: string;
  match_day_id: string;
  team_id: string;
  team_name: string;
  team_tag: string;
  logo_url?: string;
  total_kills: number;
  total_kill_points: number;
  total_placement_points: number;
  total_points: number;
}

export interface MatchDayTeamScore {
  match_day_id: string;
  match_day_name: string;
  match_date: string;
  season_id: string;
  team_id: string;
  team_name: string;
  team_tag: string;
  logo_url?: string;
  total_kills: number;
  total_kill_points: number;
  total_placement_points: number;
  total_points: number;
}

export interface SeasonTeamLeaderboard {
  season_id: string;
  season_name: string;
  team_id: string;
  team_name: string;
  team_tag: string;
  logo_url?: string;
  season_kills: number;
  season_points: number;
  rank: number;
}

export interface SeasonPlayerStats {
  season_id: string;
  user_id: string;
  team_id: string;
  team_name: string;
  username: string;
  ign: string;
  avatar_url?: string;
  total_kills: number;
  total_kill_points: number;
  total_placement_points: number;
  total_points: number;
  lobbies_played: number;
  rank: number;
}

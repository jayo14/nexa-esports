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

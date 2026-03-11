export interface Event {
  id: string;
  name: string;
  slug?: string;
  type: "MP" | "BR" | "Tournament" | "Scrims";
  season?: string;
  date: string;
  time: string;
  end_time?: string;
  description?: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  created_at: string;
  updated_at?: string;
  created_by?: string;
  host_id?: string;
  lobbies?: number;
  teams?: string | any; // JSONB in DB
  room_link?: string;
  room_code?: string;
  password?: string;
  compulsory?: boolean;
  public?: boolean;
  thumbnail_url?: string;
  highlight_reel?: string;
  event_participants?: any[];
  host?: {
    username: string;
    avatar_url: string;
  };
}

export interface EventFormData {
  name: string;
  slug?: string;
  type: "MP" | "BR" | "Tournament" | "Scrims";
  season: string;
  date: string;
  time: string;
  end_time: string;
  description: string;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  host_id: string;
  lobbies: number;
  teams: string;
  room_link: string;
  room_code: string;
  password: string;
  compulsory: boolean;
  public: boolean;
  thumbnail_url: string;
  highlight_reel: string;
}
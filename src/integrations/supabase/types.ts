export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      access_codes: {
        Row: {
          code: string
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          requested_by: string | null
          used: boolean | null
        }
        Insert: {
          code: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          requested_by?: string | null
          used?: boolean | null
        }
        Update: {
          code?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          requested_by?: string | null
          used?: boolean | null
        }
        Relationships: []
      }
      activities: {
        Row: {
          action_type: string
          category: string | null
          created_at: string | null
          details: Json | null
          id: string
          performed_by: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          category?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          category?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          performed_by?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_pinned: boolean | null
          is_published: boolean | null
          scheduled_for: string | null
          target_users: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          scheduled_for?: string | null
          target_users?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_pinned?: boolean | null
          is_published?: boolean | null
          scheduled_for?: string | null
          target_users?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_type: Database["public"]["Enums"]["event_type"]
          br_kills: number | null
          created_at: string | null
          date: string
          event_id: string | null
          event_kills: number | null
          id: string
          lobby: number | null
          marked_by: string | null
          mp_kills: number | null
          player_id: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Insert: {
          attendance_type: Database["public"]["Enums"]["event_type"]
          br_kills?: number | null
          created_at?: string | null
          date?: string
          event_id?: string | null
          event_kills?: number | null
          id?: string
          lobby?: number | null
          marked_by?: string | null
          mp_kills?: number | null
          player_id?: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }
        Update: {
          attendance_type?: Database["public"]["Enums"]["event_type"]
          br_kills?: number | null
          created_at?: string | null
          date?: string
          event_id?: string | null
          event_kills?: number | null
          id?: string
          lobby?: number | null
          marked_by?: string | null
          mp_kills?: number | null
          player_id?: string | null
          status?: Database["public"]["Enums"]["attendance_status"]
        }
        Relationships: [
          {
            foreignKeyName: "attendance_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bug_reports: {
        Row: {
          category: Database["public"]["Enums"]["bug_category"]
          created_at: string | null
          description: string
          file_url: string | null
          id: string
          reporter_id: string | null
          status: Database["public"]["Enums"]["bug_status"]
        }
        Insert: {
          category: Database["public"]["Enums"]["bug_category"]
          created_at?: string | null
          description: string
          file_url?: string | null
          id?: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["bug_status"]
        }
        Update: {
          category?: Database["public"]["Enums"]["bug_category"]
          created_at?: string | null
          description?: string
          file_url?: string | null
          id?: string
          reporter_id?: string | null
          status?: Database["public"]["Enums"]["bug_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bug_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bug_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clan_settings: {
        Row: {
          id: string
          key: string
          value: boolean
          description: string | null
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          key: string
          value?: boolean
          description?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: boolean
          description?: string | null
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clan_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_type: string | null
          attachment_url: string | null
          channel: string
          created_at: string | null
          id: string
          message: string
          reply_to_id: string | null
          user_id: string | null
        }
        Insert: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel?: string
          created_at?: string | null
          id?: string
          message: string
          reply_to_id?: string | null
          user_id?: string | null
        }
        Update: {
          attachment_name?: string | null
          attachment_type?: string | null
          attachment_url?: string | null
          channel?: string
          created_at?: string | null
          id?: string
          message?: string
          reply_to_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          created_at: string
          id: string
          source: string | null
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          source?: string | null
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          source?: string | null
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "earnings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      event_groups: {
        Row: {
          created_at: string | null
          event_id: string | null
          id: string
          max_players: number | null
          name: string
        }
        Insert: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          max_players?: number | null
          name: string
        }
        Update: {
          created_at?: string | null
          event_id?: string | null
          id?: string
          max_players?: number | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          br_kills: number | null
          created_at: string | null
          event_id: string | null
          group_id: string | null
          id: string
          kills: number | null
          mp_kills: number | null
          player_id: string | null
          role: string | null
          verified: boolean | null
        }
        Insert: {
          br_kills?: number | null
          created_at?: string | null
          event_id?: string | null
          group_id?: string | null
          id?: string
          kills?: number | null
          mp_kills?: number | null
          player_id?: string | null
          role?: string | null
          verified?: boolean | null
        }
        Update: {
          br_kills?: number | null
          created_at?: string | null
          event_id?: string | null
          group_id?: string | null
          id?: string
          kills?: number | null
          mp_kills?: number | null
          player_id?: string | null
          role?: string | null
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "event_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_participants_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          end_time: string | null
          id: string
          name: string
          status: string | null
          time: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          id?: string
          name: string
          status?: string | null
          time: string
          type: Database["public"]["Enums"]["event_type"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          name?: string
          status?: string | null
          time?: string
          type?: Database["public"]["Enums"]["event_type"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      giveaway_codes: {
        Row: {
          code: string
          created_at: string
          expires_at: string
          giveaway_id: string
          id: string
          is_redeemed: boolean
          redeemed_at: string | null
          redeemed_by: string | null
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          expires_at: string
          giveaway_id: string
          id?: string
          is_redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
          value: number
        }
        Update: {
          code?: string
          created_at?: string
          expires_at?: string
          giveaway_id?: string
          id?: string
          is_redeemed?: boolean
          redeemed_at?: string | null
          redeemed_by?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "giveaway_codes_giveaway_id_fkey"
            columns: ["giveaway_id"]
            isOneToOne: false
            referencedRelation: "giveaways"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giveaway_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giveaway_codes_redeemed_by_fkey"
            columns: ["redeemed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      giveaways: {
        Row: {
          code_value: number
          created_at: string
          created_by: string
          expires_at: string
          id: string
          is_private: boolean | null
          message: string | null
          redeemed_amount: number
          redeemed_count: number
          title: string
          total_amount: number
          total_codes: number
          updated_at: string
        }
        Insert: {
          code_value: number
          created_at?: string
          created_by: string
          expires_at: string
          id?: string
          is_private?: boolean | null
          message?: string | null
          redeemed_amount?: number
          redeemed_count?: number
          title: string
          total_amount: number
          total_codes: number
          updated_at?: string
        }
        Update: {
          code_value?: number
          created_at?: string
          created_by?: string
          expires_at?: string
          id?: string
          is_private?: boolean | null
          message?: string | null
          redeemed_amount?: number
          redeemed_count?: number
          title?: string
          total_amount?: number
          total_codes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "giveaways_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "giveaways_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loadouts: {
        Row: {
          attachments: Json | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_public: boolean | null
          mode: string
          player_id: string
          updated_at: string | null
          weapon_name: string
          weapon_type: string
        }
        Insert: {
          attachments?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_public?: boolean | null
          mode: string
          player_id: string
          updated_at?: string | null
          weapon_name: string
          weapon_type: string
        }
        Update: {
          attachments?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_public?: boolean | null
          mode?: string
          player_id?: string
          updated_at?: string | null
          weapon_name?: string
          weapon_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "loadouts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loadouts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_data: Json | null
          created_at: string | null
          data: Json | null
          expires_at: string | null
          id: string
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          action_data?: Json | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          action_data?: Json | null
          created_at?: string | null
          data?: Json | null
          expires_at?: string | null
          id?: string
          message?: string
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_attempts: {
        Row: {
          attempt_time: string
          created_at: string | null
          id: string
          locked_until: string | null
          success: boolean
          user_id: string
        }
        Insert: {
          attempt_time?: string
          created_at?: string | null
          id?: string
          locked_until?: string | null
          success?: boolean
          user_id: string
        }
        Update: {
          attempt_time?: string
          created_at?: string | null
          id?: string
          locked_until?: string | null
          success?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          attendance: number | null
          avatar_url: string | null
          ban_reason: string | null
          banking_info: Json | null
          banned_at: string | null
          banned_by: string | null
          best_gun: string | null
          br_class: string | null
          br_kills: number | null
          created_at: string | null
          date_joined: string | null
          device: string | null
          grade: string | null
          id: string
          ign: string
          is_banned: boolean | null
          kills: number | null
          last_giveaway_redeemed_at: string | null
          mp_class: string | null
          mp_kills: number | null
          pin_created_at: string | null
          pin_last_changed_at: string | null
          player_type: Database["public"]["Enums"]["player_type"] | null
          player_uid: string | null
          preferred_mode: string | null
          role: Database["public"]["Enums"]["user_role"]
          social_links: Json | null
          status: string
          tier: string | null
          tiktok_handle: string | null
          transaction_pin_hash: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          attendance?: number | null
          avatar_url?: string | null
          ban_reason?: string | null
          banking_info?: Json | null
          banned_at?: string | null
          banned_by?: string | null
          best_gun?: string | null
          br_class?: string | null
          br_kills?: number | null
          created_at?: string | null
          date_joined?: string | null
          device?: string | null
          grade?: string | null
          id: string
          ign?: string
          is_banned?: boolean | null
          kills?: number | null
          last_giveaway_redeemed_at?: string | null
          mp_class?: string | null
          mp_kills?: number | null
          pin_created_at?: string | null
          pin_last_changed_at?: string | null
          player_type?: Database["public"]["Enums"]["player_type"] | null
          player_uid?: string | null
          preferred_mode?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          social_links?: Json | null
          status?: string
          tier?: string | null
          tiktok_handle?: string | null
          transaction_pin_hash?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          attendance?: number | null
          avatar_url?: string | null
          ban_reason?: string | null
          banking_info?: Json | null
          banned_at?: string | null
          banned_by?: string | null
          best_gun?: string | null
          br_class?: string | null
          br_kills?: number | null
          created_at?: string | null
          date_joined?: string | null
          device?: string | null
          grade?: string | null
          id?: string
          ign?: string
          is_banned?: boolean | null
          kills?: number | null
          last_giveaway_redeemed_at?: string | null
          mp_class?: string | null
          mp_kills?: number | null
          pin_created_at?: string | null
          pin_last_changed_at?: string | null
          player_type?: Database["public"]["Enums"]["player_type"] | null
          player_uid?: string | null
          preferred_mode?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          social_links?: Json | null
          status?: string
          tier?: string | null
          tiktok_handle?: string | null
          transaction_pin_hash?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          p256dh_key: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh_key: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh_key?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      taxes: {
        Row: {
          amount: number
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string | null
          id: string
          reference: string
          status: string
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string | null
          id?: string
          reference: string
          status: string
          type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string | null
          id?: string
          reference?: string
          status?: string
          type?: Database["public"]["Enums"]["transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weapon_layouts: {
        Row: {
          created_at: string | null
          id: string
          image_name: string | null
          image_url: string | null
          is_featured: boolean | null
          mode: string
          player_id: string
          updated_at: string | null
          view_count: number | null
          weapon_code: string | null
          weapon_name: string
          weapon_type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_name?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          mode: string
          player_id: string
          updated_at?: string | null
          view_count?: number | null
          weapon_code?: string | null
          weapon_name: string
          weapon_type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          image_name?: string | null
          image_url?: string | null
          is_featured?: boolean | null
          mode?: string
          player_id?: string
          updated_at?: string | null
          view_count?: number | null
          weapon_code?: string | null
          weapon_name?: string
          weapon_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "weapon_layouts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "leaderboard"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weapon_layouts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_dashboard_stats: {
        Row: {
          avg_attendance: number | null
          total_br_kills: number | null
          total_events: number | null
          total_kills: number | null
          total_loadouts: number | null
          total_mp_kills: number | null
          total_players: number | null
        }
        Relationships: []
      }
      leaderboard: {
        Row: {
          avatar_url: string | null
          br_kills: number | null
          grade: string | null
          id: string | null
          ign: string | null
          mp_kills: number | null
          status: string | null
          tier: string | null
          total_kills: number | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          br_kills?: number | null
          grade?: string | null
          id?: string | null
          ign?: string | null
          mp_kills?: number | null
          status?: string | null
          tier?: string | null
          total_kills?: number | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          br_kills?: number | null
          grade?: string | null
          id?: string | null
          ign?: string | null
          mp_kills?: number | null
          status?: string | null
          tier?: string | null
          total_kills?: number | null
          username?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_redeem_giveaway: {
        Args: { p_user_id: string }
        Returns: {
          can_redeem: boolean
          cooldown_seconds: number
          last_redeemed_at: string
        }[]
      }
      create_giveaway_with_codes:
        | {
            Args: {
              p_code_value: number
              p_expires_in_hours: number
              p_is_private?: boolean
              p_message: string
              p_title: string
              p_total_codes: number
            }
            Returns: {
              giveaway_id: string
            }[]
          }
        | {
            Args: {
              p_code_value: number
              p_expires_in_hours: number
              p_message: string
              p_title: string
              p_total_codes: number
            }
            Returns: {
              giveaway_id: string
            }[]
          }
      credit_wallet: {
        Args: {
          p_amount: number
          p_currency: string
          p_reference: string
          p_user_id: string
        }
        Returns: number
      }
      delete_user_completely: {
        Args: { user_id_to_delete: string }
        Returns: boolean
      }
      execute_user_transfer: {
        Args: { amount: number; recipient_ign: string; sender_id: string }
        Returns: Json
      }
      expire_giveaway_codes: { Args: never; Returns: undefined }
      get_public_profiles: {
        Args: never
        Returns: {
          attendance: number
          avatar_url: string
          best_gun: string
          br_class: string
          created_at: string
          date_joined: string
          device: string
          grade: string
          id: string
          ign: string
          kills: number
          mp_class: string
          player_uid: string
          preferred_mode: string
          role: Database["public"]["Enums"]["user_role"]
          tier: string
          tiktok_handle: string
          updated_at: string
          username: string
        }[]
      }
      get_user_role: {
        Args: { user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      immutable_date: { Args: { t: string }; Returns: string }
      mark_access_code_used: {
        Args: { code_input: string; email_input: string }
        Returns: boolean
      }
      redeem_giveaway_code: { Args: { p_code: string }; Returns: Json }
      update_event_status: { Args: never; Returns: undefined }
      update_wallet_and_create_transaction: {
        Args: {
          p_new_balance: number
          p_transaction_amount: number
          p_transaction_reference: string
          p_transaction_status: string
          p_transaction_type: string
          p_wallet_id: string
        }
        Returns: string
      }
      validate_access_code: {
        Args: { code_input: string; email_input: string }
        Returns: boolean
      }
    }
    Enums: {
      attendance_status: "present" | "absent"
      bug_category: "gameplay" | "ui" | "performance" | "other"
      bug_status: "new" | "in_progress" | "resolved" | "not_a_bug"
      event_type: "MP" | "BR" | "Mixed" | "Tournament" | "Scrims"
      player_type: "main" | "beta"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "transfer_in"
        | "transfer_out"
        | "giveaway_created"
        | "giveaway_redeemed"
        | "giveaway_refund"
        | "tax_deduction"
      user_role: "admin" | "player" | "moderator" | "clan_master"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      attendance_status: ["present", "absent"],
      bug_category: ["gameplay", "ui", "performance", "other"],
      bug_status: ["new", "in_progress", "resolved", "not_a_bug"],
      event_type: ["MP", "BR", "Mixed", "Tournament", "Scrims"],
      player_type: ["main", "beta"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "transfer_in",
        "transfer_out",
        "giveaway_created",
        "giveaway_redeemed",
        "giveaway_refund",
        "tax_deduction",
      ],
      user_role: ["admin", "player", "moderator", "clan_master"],
    },
  },
} as const

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: { Row: { id: string; username: string | null; display_name: string | null; avatar_url: string | null; role: string; created_at: string; updated_at: string }; Insert: { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; role?: string; created_at?: string; updated_at?: string }; Update: Partial<Database['public']['Tables']['profiles']['Insert']> };
      maps: { Row: { id: string; author_id: string; title: string; description: string; youtube_video_id: string; tags: string[]; visibility: string; lines: Json; play_count: number; favorite_count: number; created_at: string; updated_at: string }; Insert: { id: string; author_id: string; title: string; description?: string; youtube_video_id: string; tags?: string[]; visibility?: string; lines?: Json; play_count?: number; favorite_count?: number; created_at?: string; updated_at?: string }; Update: Partial<Database['public']['Tables']['maps']['Insert']> };
      favorites: { Row: { user_id: string; map_id: string; created_at: string }; Insert: { user_id: string; map_id: string; created_at?: string }; Update: Partial<Database['public']['Tables']['favorites']['Insert']> };
      play_history: { Row: { id: number; user_id: string; map_id: string; accuracy: number | null; miss_count: number; kpm: number | null; played_at: string }; Insert: { id?: never; user_id: string; map_id: string; accuracy?: number | null; miss_count?: number; kpm?: number | null; played_at?: string }; Update: Partial<Database['public']['Tables']['play_history']['Insert']> };
      reports: { Row: { id: number; reporter_id: string; map_id: string; reason: string; details: string; status: string; created_at: string; resolved_at: string | null }; Insert: { id?: never; reporter_id: string; map_id: string; reason: string; details?: string; status?: string; created_at?: string; resolved_at?: string | null }; Update: Partial<Database['public']['Tables']['reports']['Insert']> };
    };
    Views: Record<string, never>;
    Functions: { is_admin: { Args: Record<string, never>; Returns: boolean }; record_play: { Args: { p_map_id: string; p_accuracy?: number; p_miss_count?: number; p_kpm?: number }; Returns: number } };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

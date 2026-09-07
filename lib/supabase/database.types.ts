export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; username: string | null; display_name: string | null; avatar_url: string | null; role: string; created_at: string; updated_at: string };
        Insert: { id: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; role?: string; created_at?: string; updated_at?: string };
        Update: { id?: string; username?: string | null; display_name?: string | null; avatar_url?: string | null; role?: string; created_at?: string; updated_at?: string };
        Relationships: [];
      };
      maps: {
        Row: { id: string; author_id: string; title: string; description: string; youtube_video_id: string; tags: string[]; visibility: string; lines: Json; play_count: number; favorite_count: number; created_at: string; updated_at: string };
        Insert: { id: string; author_id: string; title: string; description?: string; youtube_video_id: string; tags?: string[]; visibility?: string; lines?: Json; play_count?: number; favorite_count?: number; created_at?: string; updated_at?: string };
        Update: { id?: string; author_id?: string; title?: string; description?: string; youtube_video_id?: string; tags?: string[]; visibility?: string; lines?: Json; play_count?: number; favorite_count?: number; created_at?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: 'maps_author_id_fkey'; columns: ['author_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
      };
      favorites: {
        Row: { user_id: string; map_id: string; created_at: string };
        Insert: { user_id: string; map_id: string; created_at?: string };
        Update: { user_id?: string; map_id?: string; created_at?: string };
        Relationships: [{ foreignKeyName: 'favorites_map_id_fkey'; columns: ['map_id']; isOneToOne: false; referencedRelation: 'maps'; referencedColumns: ['id'] }, { foreignKeyName: 'favorites_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
      };
      play_history: {
        Row: { id: number; user_id: string; map_id: string; accuracy: number | null; miss_count: number; kpm: number | null; played_at: string };
        Insert: { id?: never; user_id: string; map_id: string; accuracy?: number | null; miss_count?: number; kpm?: number | null; played_at?: string };
        Update: { id?: never; user_id?: string; map_id?: string; accuracy?: number | null; miss_count?: number; kpm?: number | null; played_at?: string };
        Relationships: [{ foreignKeyName: 'play_history_map_id_fkey'; columns: ['map_id']; isOneToOne: false; referencedRelation: 'maps'; referencedColumns: ['id'] }, { foreignKeyName: 'play_history_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
      };
      reports: {
        Row: { id: number; reporter_id: string; map_id: string; reason: string; details: string; status: string; created_at: string; resolved_at: string | null };
        Insert: { id?: never; reporter_id: string; map_id: string; reason: string; details?: string; status?: string; created_at?: string; resolved_at?: string | null };
        Update: { id?: never; reporter_id?: string; map_id?: string; reason?: string; details?: string; status?: string; created_at?: string; resolved_at?: string | null };
        Relationships: [{ foreignKeyName: 'reports_map_id_fkey'; columns: ['map_id']; isOneToOne: false; referencedRelation: 'maps'; referencedColumns: ['id'] }, { foreignKeyName: 'reports_reporter_id_fkey'; columns: ['reporter_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      record_play: { Args: { p_accuracy?: number; p_kpm?: number; p_map_id: string; p_miss_count?: number }; Returns: number };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

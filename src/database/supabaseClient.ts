import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env ?? {};

const SUPABASE_URL = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = env.SUPABASE_PUBLISHABLE_KEY ?? env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SUPABASE_SECRET_KEY = env.SUPABASE_SECRET_KEY;

function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Role = 'player' | 'dm';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          role: Role;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role?: Role;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          role?: Role;
          display_name?: string | null;
          updated_at?: string;
        };
      };
      character_sheets: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          is_active: boolean;
          sheet_data: Json;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          is_active?: boolean;
          sheet_data: Json;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          is_active?: boolean;
          sheet_data?: Json;
          image_url?: string | null;
          updated_at?: string;
        };
      };
      npc_sheets: {
        Row: {
          id: string;
          created_by: string;
          name: string;
          sheet_data: Json;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by: string;
          name: string;
          sheet_data: Json;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          sheet_data?: Json;
          image_url?: string | null;
          updated_at?: string;
        };
      };
      images: {
        Row: {
          id: string;
          owner_id: string;
          sheet_type: 'character' | 'npc';
          sheet_id: string;
          storage_path: string;
          public_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          sheet_type: 'character' | 'npc';
          sheet_id: string;
          storage_path: string;
          public_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          storage_path?: string;
          public_url?: string | null;
          updated_at?: string;
        };
      };
    };
  };
}

export function createBrowserSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(
    requireEnv('SUPABASE_URL', SUPABASE_URL),
    requireEnv('SUPABASE_PUBLISHABLE_KEY', SUPABASE_PUBLISHABLE_KEY),
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }
  );
}

export function createServiceSupabaseClient(): SupabaseClient<Database> {
  return createClient<Database>(
    requireEnv('SUPABASE_URL', SUPABASE_URL),
    requireEnv('SUPABASE_SECRET_KEY', SUPABASE_SECRET_KEY),
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    }
  );
}

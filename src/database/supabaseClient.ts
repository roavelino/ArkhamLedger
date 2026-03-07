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
export type Visibility = 'dm_only' | 'shared_all' | 'shared_player';
export type CharacterSheetType = 'player_character' | 'npc';
export type CampaignRole = 'dm' | 'player';
export type CampaignStatus = 'draft' | 'active' | 'archived';

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
          owner_user_id: string | null;
          name: string;
          type: CharacterSheetType;
          campaign_id: string | null;
          is_active: boolean;
          age: number | null;
          occupation: string | null;
          description: string | null;
          intro_video_url: string | null;
          notes: string | null;
          sheet_data: Json;
          image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          owner_user_id?: string | null;
          name: string;
          type?: CharacterSheetType;
          campaign_id?: string | null;
          is_active?: boolean;
          age?: number | null;
          occupation?: string | null;
          description?: string | null;
          intro_video_url?: string | null;
          notes?: string | null;
          sheet_data: Json;
          image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          owner_user_id?: string | null;
          type?: CharacterSheetType;
          campaign_id?: string | null;
          is_active?: boolean;
          age?: number | null;
          occupation?: string | null;
          description?: string | null;
          intro_video_url?: string | null;
          notes?: string | null;
          sheet_data?: Json;
          image_url?: string | null;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          owner_user_id: string;
          title: string;
          public_summary: string;
          cover_image_url: string | null;
          status: CampaignStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          title: string;
          public_summary?: string;
          cover_image_url?: string | null;
          status?: CampaignStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          public_summary?: string;
          cover_image_url?: string | null;
          status?: CampaignStatus;
          updated_at?: string;
        };
      };
      campaign_members: {
        Row: {
          id: string;
          campaign_id: string;
          user_id: string;
          role: CampaignRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          user_id: string;
          role?: CampaignRole;
          created_at?: string;
        };
        Update: {
          role?: CampaignRole;
        };
      };
      session_summaries: CampaignContentTable<'summary_markdown'>;
      timeline_entries: CampaignContentTable<'description', {
        event_type: string;
        event_date: string | null;
        date_label: string | null;
      }>;
      clues: CampaignContentTable<'description', {
        image_url: string | null;
        file_url: string | null;
        status: 'hidden' | 'available' | 'found';
      }>;
      handouts: CampaignContentTable<'content_text', {
        type: 'text' | 'markdown' | 'image' | 'pdf';
        file_url: string | null;
      }>;
      maps: CampaignContentTable<'image_url', {
        description: string | null;
      }>;
      map_pins: {
        Row: {
          id: string;
          map_id: string;
          label: string;
          x_position: number;
          y_position: number;
          description: string | null;
          visibility: Visibility;
          shared_with_user_id: string | null;
          linked_npc_id: string | null;
          linked_clue_id: string | null;
          linked_handout_id: string | null;
          linked_timeline_entry_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          map_id: string;
          label: string;
          x_position: number;
          y_position: number;
          description?: string | null;
          visibility?: Visibility;
          shared_with_user_id?: string | null;
          linked_npc_id?: string | null;
          linked_clue_id?: string | null;
          linked_handout_id?: string | null;
          linked_timeline_entry_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          label?: string;
          x_position?: number;
          y_position?: number;
          description?: string | null;
          visibility?: Visibility;
          shared_with_user_id?: string | null;
          linked_npc_id?: string | null;
          linked_clue_id?: string | null;
          linked_handout_id?: string | null;
          linked_timeline_entry_id?: string | null;
          updated_at?: string;
        };
      };
      markdown_documents: CampaignContentTable<'markdown_content'>;
      relationship_diagrams: CampaignContentTable<'mermaid_source'>;
      npc_gallery_assets: {
        Row: {
          id: string;
          owner_user_id: string;
          image_url: string;
          label: string | null;
          tags_json: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_user_id: string;
          image_url: string;
          label?: string | null;
          tags_json?: Json | null;
          created_at?: string;
        };
        Update: {
          image_url?: string;
          label?: string | null;
          tags_json?: Json | null;
        };
      };
      dm_screen_pages: CampaignContentTable<'content_json_or_text', {
        content_type: string;
        sort_order: number;
      }>;
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

type CampaignContentBase<BodyKey extends string, ExtraRow extends Record<string, unknown> = Record<string, never>> = {
  Row: {
    id: string;
    campaign_id: string;
    title: string;
    visibility: Visibility;
    shared_with_user_id: string | null;
    created_at: string;
    updated_at: string;
  } & Record<BodyKey, string | null> & ExtraRow;
  Insert: {
    id?: string;
    campaign_id: string;
    title: string;
    visibility?: Visibility;
    shared_with_user_id?: string | null;
    created_at?: string;
    updated_at?: string;
  } & Partial<Record<BodyKey, string | null>> & Partial<ExtraRow>;
  Update: {
    title?: string;
    visibility?: Visibility;
    shared_with_user_id?: string | null;
    updated_at?: string;
  } & Partial<Record<BodyKey, string | null>> & Partial<ExtraRow>;
};

type CampaignContentTable<BodyKey extends string, ExtraRow extends Record<string, unknown> = Record<string, never>> =
  CampaignContentBase<BodyKey, ExtraRow>;

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

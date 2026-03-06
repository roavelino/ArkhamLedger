import { createBrowserSupabaseClient, type Json } from '../database/supabaseClient.js';
import {
  assertPermission,
  canCreateNpc,
  canDeleteNpc,
  canEditNpc,
  canViewNpc,
  type AppUser
} from '../permissions/accessControl.js';

const supabase = createBrowserSupabaseClient();

export interface NpcSheet {
  id: string;
  created_by: string;
  name: string;
  sheet_data: Json;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateNpcInput {
  name: string;
  sheet_data: Json;
}

export interface UpdateNpcInput {
  name?: string;
  sheet_data?: Json;
  image_url?: string | null;
}

export async function createNpcSheet(user: AppUser, payload: CreateNpcInput): Promise<NpcSheet> {
  assertPermission(canCreateNpc(user), 'Only DMs can create NPC sheets.');

  const { data, error } = await supabase
    .from('npc_sheets')
    .insert({
      created_by: user.id,
      name: payload.name,
      sheet_data: payload.sheet_data
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to create NPC sheet.');
  }

  return data as NpcSheet;
}

export async function getNpcSheetById(user: AppUser, sheetId: string): Promise<NpcSheet> {
  assertPermission(canViewNpc(user), 'Only DMs can view NPC sheets.');

  const { data, error } = await supabase.from('npc_sheets').select('*').eq('id', sheetId).single();

  if (error || !data) {
    throw new Error(error?.message ?? 'NPC sheet not found.');
  }

  return data as NpcSheet;
}

export async function updateNpcSheet(user: AppUser, sheetId: string, updates: UpdateNpcInput): Promise<NpcSheet> {
  assertPermission(canEditNpc(user), 'Only DMs can edit NPC sheets.');

  const { data, error } = await supabase
    .from('npc_sheets')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', sheetId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to update NPC sheet.');
  }

  return data as NpcSheet;
}

export async function deleteNpcSheet(user: AppUser, sheetId: string): Promise<void> {
  assertPermission(canDeleteNpc(user), 'Only DMs can delete NPC sheets.');

  const { error } = await supabase.from('npc_sheets').delete().eq('id', sheetId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listNpcSheets(user: AppUser): Promise<NpcSheet[]> {
  assertPermission(canViewNpc(user), 'Only DMs can list NPC sheets.');

  const { data, error } = await supabase.from('npc_sheets').select('*').order('updated_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as NpcSheet[];
}

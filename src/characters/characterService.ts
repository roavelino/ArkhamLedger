import { createBrowserSupabaseClient, type Json } from '../database/supabaseClient.js';
import {
  assertPermission,
  canCreateCharacter,
  canDeleteCharacter,
  canEditCharacter,
  canViewCharacter,
  type AppUser
} from '../permissions/accessControl.js';

const supabase = createBrowserSupabaseClient();

export interface CharacterSheet {
  id: string;
  owner_id: string;
  name: string;
  sheet_data: Json;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCharacterInput {
  name: string;
  sheet_data: Json;
}

export interface UpdateCharacterInput {
  name?: string;
  sheet_data?: Json;
  image_url?: string | null;
}

export async function createCharacterSheet(user: AppUser, payload: CreateCharacterInput): Promise<CharacterSheet> {
  assertPermission(canCreateCharacter(user), 'User is not allowed to create character sheets.');

  const { data, error } = await supabase
    .from('character_sheets')
    .insert({
      owner_id: user.id,
      name: payload.name,
      sheet_data: payload.sheet_data
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to create character sheet.');
  }

  return data as CharacterSheet;
}

export async function getCharacterSheetById(user: AppUser, sheetId: string): Promise<CharacterSheet> {
  const { data, error } = await supabase.from('character_sheets').select('*').eq('id', sheetId).single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Character sheet not found.');
  }

  assertPermission(canViewCharacter(user, data), 'User is not allowed to view this character sheet.');
  return data as CharacterSheet;
}

export async function updateCharacterSheet(
  user: AppUser,
  sheetId: string,
  updates: UpdateCharacterInput
): Promise<CharacterSheet> {
  const existing = await getCharacterSheetById(user, sheetId);
  assertPermission(canEditCharacter(user, existing), 'User is not allowed to edit this character sheet.');

  const { data, error } = await supabase
    .from('character_sheets')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', sheetId)
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to update character sheet.');
  }

  return data as CharacterSheet;
}

export async function deleteCharacterSheet(user: AppUser, sheetId: string): Promise<void> {
  const existing = await getCharacterSheetById(user, sheetId);
  assertPermission(canDeleteCharacter(user, existing), 'User is not allowed to delete this character sheet.');

  const { error } = await supabase.from('character_sheets').delete().eq('id', sheetId);
  if (error) {
    throw new Error(error.message);
  }
}

export async function listCharacterSheets(user: AppUser): Promise<CharacterSheet[]> {
  const query = supabase.from('character_sheets').select('*').order('updated_at', { ascending: false });
  const { data, error } = user.role === 'dm' ? await query : await query.eq('owner_id', user.id);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CharacterSheet[];
}

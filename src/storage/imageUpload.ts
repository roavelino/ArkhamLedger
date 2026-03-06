import { createBrowserSupabaseClient } from '../database/supabaseClient.js';
import { getCharacterSheetById, updateCharacterSheet } from '../characters/characterService.js';
import { getNpcSheetById, updateNpcSheet } from '../npcs/npcService.js';
import { assertPermission, canEditCharacter, canEditNpc, type AppUser } from '../permissions/accessControl.js';

const BUCKET_NAME = 'sheet-images';
const supabase = createBrowserSupabaseClient();

function extension(fileName: string): string {
  const ext = fileName.split('.').pop();
  return ext ? ext.toLowerCase() : 'bin';
}

async function upsertImageRecord(payload: {
  ownerId: string;
  sheetType: 'character' | 'npc';
  sheetId: string;
  storagePath: string;
  publicUrl: string;
}) {
  const { error } = await supabase.from('images').upsert(
    {
      owner_id: payload.ownerId,
      sheet_type: payload.sheetType,
      sheet_id: payload.sheetId,
      storage_path: payload.storagePath,
      public_url: payload.publicUrl,
      updated_at: new Date().toISOString()
    },
    { onConflict: 'sheet_type,sheet_id' }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function uploadCharacterImage(user: AppUser, characterId: string, file: File) {
  const character = await getCharacterSheetById(user, characterId);
  assertPermission(canEditCharacter(user, character), 'User is not allowed to upload this character image.');

  const path = `characters/${character.owner_id}/${characterId}/${crypto.randomUUID()}.${extension(file.name)}`;
  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
    upsert: false,
    cacheControl: '3600'
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  await updateCharacterSheet(user, characterId, { image_url: data.publicUrl });

  await upsertImageRecord({
    ownerId: character.owner_id,
    sheetType: 'character',
    sheetId: characterId,
    storagePath: path,
    publicUrl: data.publicUrl
  });

  return data.publicUrl;
}

export async function uploadNpcImage(user: AppUser, npcId: string, file: File) {
  assertPermission(canEditNpc(user), 'Only DMs can upload NPC images.');

  const npc = await getNpcSheetById(user, npcId);
  const path = `npcs/${npcId}/${crypto.randomUUID()}.${extension(file.name)}`;

  const { error } = await supabase.storage.from(BUCKET_NAME).upload(path, file, {
    upsert: false,
    cacheControl: '3600'
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
  await updateNpcSheet(user, npcId, { image_url: data.publicUrl });

  await upsertImageRecord({
    ownerId: user.id,
    sheetType: 'npc',
    sheetId: npcId,
    storagePath: path,
    publicUrl: data.publicUrl
  });

  return data.publicUrl;
}

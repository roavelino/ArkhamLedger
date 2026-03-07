const IMAGE_BUCKET = 'sheet-images';

function isMissingColumnError(error, columnName) {
  return error?.code === '42703' && String(error?.message || '').includes(columnName);
}

export async function fetchProfile(client, userId) {
  const { data, error } = await client
    .from('users')
    .select('id, role, display_name')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
}

export async function listCharacterSheets(client) {
  const initial = await client
    .from('character_sheets')
    .select('*')
    .is('archived_at', null)
    .order('updated_at', { ascending: false });

  if (!initial.error) {
    return initial.data || [];
  }

  if (!isMissingColumnError(initial.error, 'archived_at')) {
    throw initial.error;
  }

  const fallback = await client.from('character_sheets').select('*').order('updated_at', { ascending: false });
  if (fallback.error) throw fallback.error;
  return fallback.data || [];
}

export async function upsertCharacterSheet(client, payload) {
  const { data, error } = await client
    .from('character_sheets')
    .upsert(payload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function updateCharacterSheetImage(client, sheetId, imagePath) {
  const { data, error } = await client
    .from('character_sheets')
    .update({ image_url: imagePath })
    .eq('id', sheetId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCharacterSheet(client, sheetId) {
  const { error } = await client.from('character_sheets').delete().eq('id', sheetId);
  if (error) throw error;
}

export async function createSignedSheetImageUrl(client, imagePath, expiresInSeconds = 3600) {
  if (!imagePath) return null;
  if (/^https?:\/\//i.test(imagePath)) return imagePath;

  const { data, error } = await client.storage.from(IMAGE_BUCKET).createSignedUrl(imagePath, expiresInSeconds);
  if (error) throw error;
  return data?.signedUrl || null;
}

export async function uploadCharacterSheetImage(client, ownerId, sheetId, file) {
  const extension = String(file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `characters/${ownerId}/${sheetId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(IMAGE_BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: '3600'
  });

  if (error) throw error;
  return path;
}

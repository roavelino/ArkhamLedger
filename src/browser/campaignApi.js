const CAMPAIGN_ASSET_BUCKET = 'campaign-assets';
const SHEET_MEDIA_BUCKET = 'sheet-media';

export const CAMPAIGN_CONTENT_TABLES = [
  'session_summaries',
  'timeline_entries',
  'clues',
  'handouts',
  'maps',
  'markdown_documents',
  'relationship_diagrams',
  'dm_screen_pages'
];

export async function listCampaignsForUser(client, userId, role) {
  if (role === 'dm') {
    const { data, error } = await client.from('campaigns').select('*').order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }

  const { data: memberships, error: membershipError } = await client
    .from('campaign_members')
    .select('campaign_id')
    .eq('user_id', userId);

  if (membershipError) throw membershipError;

  const ids = [...new Set((memberships || []).map((row) => row.campaign_id).filter(Boolean))];
  if (!ids.length) {
    return [];
  }

  const { data, error } = await client
    .from('campaigns')
    .select('*')
    .in('id', ids)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertCampaign(client, payload) {
  const { data, error } = await client.from('campaigns').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  return data;
}

export async function listCampaignMembers(client, campaignId) {
  const { data, error } = await client
    .from('campaign_members')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function upsertCampaignMember(client, payload) {
  const { data, error } = await client
    .from('campaign_members')
    .upsert(payload, { onConflict: 'campaign_id,user_id' })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function removeCampaignMember(client, memberId) {
  const { error } = await client.from('campaign_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function listCampaignContentRows(client, table, campaignId) {
  let query = client.from(table).select('*').eq('campaign_id', campaignId).order('updated_at', { ascending: false });
  if (table === 'clues' || table === 'handouts') {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function listMapPins(client, mapId) {
  const { data, error } = await client
    .from('map_pins')
    .select('*')
    .eq('map_id', mapId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function upsertMapPin(client, payload) {
  const { data, error } = await client.from('map_pins').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteMapPin(client, pinId) {
  const { error } = await client.from('map_pins').delete().eq('id', pinId);
  if (error) throw error;
}

export async function listNpcGalleryAssets(client, ownerUserId) {
  const { data, error } = await client
    .from('npc_gallery_assets')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertNpcGalleryAsset(client, payload) {
  const { data, error } = await client.from('npc_gallery_assets').upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  return data;
}

export async function upsertCampaignContentRow(client, table, payload) {
  const { data, error } = await client.from(table).upsert(payload, { onConflict: 'id' }).select('*').single();
  if (error) throw error;
  return data;
}

export async function deleteCampaignContentRow(client, table, rowId) {
  const { error } = await client.from(table).delete().eq('id', rowId);
  if (error) throw error;
}

export async function createSignedAssetUrl(client, bucketName, assetPath, expiresInSeconds = 3600) {
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;

  const { data, error } = await client.storage.from(bucketName).createSignedUrl(assetPath, expiresInSeconds);
  if (error) throw error;
  return data?.signedUrl || null;
}

export async function uploadCampaignAsset(client, campaignId, file, assetKind = 'generic') {
  const extension = String(file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${campaignId}/${assetKind}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(CAMPAIGN_ASSET_BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: '3600'
  });

  if (error) throw error;
  return path;
}

export async function uploadNpcGalleryAsset(client, ownerUserId, file) {
  const extension = String(file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `npc-gallery/${ownerUserId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(CAMPAIGN_ASSET_BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: '3600'
  });

  if (error) throw error;
  return path;
}

export async function uploadSheetMedia(client, ownerId, sheetId, file) {
  const extension = String(file.name.split('.').pop() || 'bin').toLowerCase();
  const path = `${ownerId}/${sheetId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await client.storage.from(SHEET_MEDIA_BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: '3600'
  });

  if (error) throw error;
  return path;
}

export function campaignAssetBucket() {
  return CAMPAIGN_ASSET_BUCKET;
}

export function sheetMediaBucket() {
  return SHEET_MEDIA_BUCKET;
}

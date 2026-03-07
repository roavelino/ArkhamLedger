import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = `${readFileSync('src/database/migrations.sql', 'utf8')}\n${readFileSync(
  'src/database/migrations_character_state.sql',
  'utf8'
)}`;

function includes(fragment) {
  return sql.toLowerCase().includes(fragment.toLowerCase());
}

test('required tables are declared', () => {
  assert.equal(includes('create table if not exists public.users'), true);
  assert.equal(includes('create table if not exists public.character_sheets'), true);
  assert.equal(includes('create table if not exists public.npc_sheets'), true);
  assert.equal(includes('create table if not exists public.images'), true);
  assert.equal(includes('create table if not exists public.campaigns'), true);
  assert.equal(includes('create table if not exists public.campaign_members'), true);
  assert.equal(includes('create table if not exists public.session_summaries'), true);
  assert.equal(includes('create table if not exists public.clues'), true);
  assert.equal(includes('create table if not exists public.markdown_documents'), true);
});

test('rls enabled and policies exist', () => {
  assert.equal(includes('alter table public.users enable row level security'), true);
  assert.equal(includes('alter table public.character_sheets enable row level security'), true);
  assert.equal(includes('alter table public.npc_sheets enable row level security'), true);
  assert.equal(includes('alter table public.images enable row level security'), true);
  assert.equal(includes('alter table public.campaigns enable row level security'), true);
  assert.equal(includes('alter table public.session_summaries enable row level security'), true);
  assert.equal(includes('create policy "character_select_owner_or_dm"'), true);
  assert.equal(includes('create policy "character_delete_owner_or_dm"'), true);
  assert.equal(includes('create policy "npc_select_dm"'), true);
  assert.equal(includes('create policy "images_insert_owner_or_dm"'), true);
  assert.equal(includes('create policy "campaign_select_member_or_owner"'), true);
  assert.equal(includes('create policy "session_summaries_select_visibility"'), true);
});

test('storage bucket and storage policies are declared', () => {
  assert.equal(includes("insert into storage.buckets"), true);
  assert.equal(includes("values ('sheet-images', 'sheet-images', false)"), true);
  assert.equal(includes("update storage.buckets"), true);
  assert.equal(includes('create policy "sheet_images_upload_player_own_character"'), true);
  assert.equal(includes('create policy "sheet_images_read"'), true);
  assert.equal(includes("values ('campaign-assets', 'campaign-assets', false)"), true);
  assert.equal(includes("values ('sheet-media', 'sheet-media', false)"), true);
  assert.equal(includes('create policy "campaign_assets_read_scoped"'), true);
  assert.equal(includes('create policy "campaign_assets_write_scoped"'), true);
  assert.equal(includes('create policy "sheet_media_read_scoped"'), true);
  assert.equal(includes('create policy "sheet_media_write_scoped"'), true);
});

test('extended character sheet schema and visibility helpers exist', () => {
  assert.equal(includes('add column if not exists type text not null default \'player_character\''), true);
  assert.equal(includes('add column if not exists campaign_id uuid references public.campaigns'), true);
  assert.equal(includes('add column if not exists archived_at timestamptz'), true);
  assert.equal(includes('alter table public.clues'), true);
  assert.equal(includes('alter table public.handouts'), true);
  assert.equal(includes('create or replace function public.can_view_character_sheet'), true);
  assert.equal(includes('create or replace function public.can_read_campaign_content'), true);
  assert.equal(includes('create or replace function public.can_access_campaign_asset_path'), true);
  assert.equal(includes('create or replace function public.can_manage_sheet_media_path'), true);
  assert.equal(includes('shared_player rows require shared_with_user_id'), true);
});

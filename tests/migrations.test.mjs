import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sql = readFileSync('src/database/migrations.sql', 'utf8');

function includes(fragment) {
  return sql.toLowerCase().includes(fragment.toLowerCase());
}

test('required tables are declared', () => {
  assert.equal(includes('create table if not exists public.users'), true);
  assert.equal(includes('create table if not exists public.character_sheets'), true);
  assert.equal(includes('create table if not exists public.npc_sheets'), true);
  assert.equal(includes('create table if not exists public.images'), true);
});

test('rls enabled and policies exist', () => {
  assert.equal(includes('alter table public.users enable row level security'), true);
  assert.equal(includes('alter table public.character_sheets enable row level security'), true);
  assert.equal(includes('alter table public.npc_sheets enable row level security'), true);
  assert.equal(includes('alter table public.images enable row level security'), true);
  assert.equal(includes('create policy "character_select_owner_or_dm"'), true);
  assert.equal(includes('create policy "npc_select_dm"'), true);
  assert.equal(includes('create policy "images_insert_owner_or_dm"'), true);
});

test('storage bucket and storage policies are declared', () => {
  assert.equal(includes("insert into storage.buckets"), true);
  assert.equal(includes("values ('sheet-images', 'sheet-images', false)"), true);
  assert.equal(includes("update storage.buckets"), true);
  assert.equal(includes('create policy "sheet_images_upload_player_own_character"'), true);
  assert.equal(includes('create policy "sheet_images_read"'), true);
});

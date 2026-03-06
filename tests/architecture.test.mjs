import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const expectedFiles = [
  'src/auth/login.ts',
  'src/auth/authClient.ts',
  'src/database/supabaseClient.ts',
  'src/database/migrations.sql',
  'src/characters/characterService.ts',
  'src/characters/characterController.ts',
  'src/npcs/npcService.ts',
  'src/npcs/npcController.ts',
  'src/storage/imageUpload.ts',
  'src/permissions/accessControl.ts'
];

test('modular architecture files exist', () => {
  for (const file of expectedFiles) {
    assert.equal(existsSync(file), true, `Missing expected file: ${file}`);
  }
});

test('index.html is GitHub Pages compatible (loads JS entrypoint)', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /<script\s+type="module"\s+src="\.\/src\/main\.js"><\/script>/);
  assert.doesNotMatch(html, /src="\.\/src\/main\.ts"/);
});

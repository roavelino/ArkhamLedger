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

test('main browser app exposes DM screen and printable export flows', () => {
  const src = readFileSync('src/main.js', 'utf8');
  assert.match(src, /CAMPAIGN_MODE_DM_SCREEN/);
  assert.match(src, /CAMPAIGN_MODE_MAPS/);
  assert.match(src, /renderDmScreen\(/);
  assert.match(src, /renderCampaignMaps\(/);
  assert.match(src, /exportSheetAsPdf\(/);
  assert.match(src, /buildPrintableSheetHtml\(/);
  assert.match(src, /buildPrintableLoadingHtml\(/);
  assert.match(src, /window\.open\('', '_blank'/);
});

test('browser app includes archive handling for campaign content and NPCs', () => {
  const src = readFileSync('src/main.js', 'utf8');
  assert.match(src, /Campanha arquivada/);
  assert.match(src, /NPC arquivado/);
  assert.match(src, /Item arquivado/);
  assert.match(src, /archivedAt/);
});

test('main browser app includes Mermaid graph parsing helpers', () => {
  const src = readFileSync('src/main.js', 'utf8');
  assert.match(src, /parseMermaidGraph\(/);
  assert.match(src, /renderMermaidSvg\(/);
  assert.match(src, /normalizeMermaidNode\(/);
});

test('browser entrypoints expose language switch and shared i18n support', () => {
  const indexHtml = readFileSync('index.html', 'utf8');
  const loginHtml = readFileSync('login.html', 'utf8');
  const loginSrc = readFileSync('src/login.js', 'utf8');
  const i18nSrc = readFileSync('src/i18n.js', 'utf8');

  assert.match(indexHtml, /id="languageSelect"/);
  assert.match(loginHtml, /id="languageSelect"/);
  assert.match(loginSrc, /applyTranslations\(/);
  assert.match(i18nSrc, /DEFAULT_LOCALE = 'pt-BR'/);
});

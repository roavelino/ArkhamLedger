import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync('src/permissions/accessControl.ts', 'utf8');

test('permissions implement expected player and dm rules', () => {
  assert.match(src, /canCreateCharacter\(user: AppUser\): boolean\s*{[\s\S]*user\.role === 'player'[\s\S]*isDm\(user\)/);
  assert.match(src, /canViewCharacter\(user: AppUser, character: OwnedResource\): boolean\s*{[\s\S]*isDm\(user\)[\s\S]*character\.owner_id === user\.id/);
  assert.match(src, /canDeleteCharacter\(user: AppUser, character: OwnedResource\): boolean\s*{[\s\S]*canEditCharacter\(user, character\)/);
  assert.match(src, /canCreateNpc\(user: AppUser\): boolean\s*{[\s\S]*isDm\(user\)/);
  assert.match(src, /canEditNpc\(user: AppUser\): boolean\s*{[\s\S]*isDm\(user\)/);
  assert.match(src, /canManageCampaign\(user: AppUser, campaign: CampaignOwnedResource\): boolean\s*{[\s\S]*campaign\.owner_user_id === user\.id/);
  assert.match(src, /canReadVisibleResource\(user: AppUser, resource: VisibleResource\): boolean\s*{[\s\S]*resource\.visibility === 'shared_all'[\s\S]*resource\.shared_with_user_id === user\.id/);
  assert.match(src, /canRevealNpc\(user: AppUser, sheetType: CharacterSheetType\): boolean\s*{[\s\S]*sheetType === 'npc'/);
});

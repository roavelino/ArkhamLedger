export type Role = 'player' | 'dm';
export type Visibility = 'dm_only' | 'shared_all' | 'shared_player';
export type CharacterSheetType = 'player_character' | 'npc';

export interface AppUser {
  id: string;
  role: Role;
}

export interface OwnedResource {
  owner_id: string;
  is_active?: boolean;
}

export interface CampaignOwnedResource {
  owner_user_id: string;
}

export interface VisibleResource {
  visibility: Visibility;
  shared_with_user_id?: string | null;
}

export function isDm(user: AppUser): boolean {
  return user.role === 'dm';
}

export function canCreateCharacter(user: AppUser): boolean {
  return user.role === 'player' || isDm(user);
}

export function canViewCharacter(user: AppUser, character: OwnedResource): boolean {
  return isDm(user) || character.owner_id === user.id;
}

export function canEditCharacter(user: AppUser, character: OwnedResource): boolean {
  return isDm(user) || character.owner_id === user.id;
}

export function canDeleteCharacter(user: AppUser, character: OwnedResource): boolean {
  return canEditCharacter(user, character);
}

export function canCreateNpc(user: AppUser): boolean {
  return isDm(user);
}

export function canViewNpc(user: AppUser): boolean {
  return isDm(user);
}

export function canEditNpc(user: AppUser): boolean {
  return isDm(user);
}

export function canDeleteNpc(user: AppUser): boolean {
  return isDm(user);
}

export function canManageCampaign(user: AppUser, campaign: CampaignOwnedResource): boolean {
  return isDm(user) && campaign.owner_user_id === user.id;
}

export function canReadVisibleResource(user: AppUser, resource: VisibleResource): boolean {
  if (isDm(user)) {
    return true;
  }

  if (resource.visibility === 'shared_all') {
    return true;
  }

  if (resource.visibility === 'shared_player') {
    return resource.shared_with_user_id === user.id;
  }

  return false;
}

export function canRevealNpc(user: AppUser, sheetType: CharacterSheetType): boolean {
  return isDm(user) && sheetType === 'npc';
}

export function assertPermission(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

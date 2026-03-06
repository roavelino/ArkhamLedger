export type Role = 'player' | 'dm';

export interface AppUser {
  id: string;
  role: Role;
}

export interface OwnedResource {
  owner_id: string;
  is_active?: boolean;
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
  return isDm(user) || (character.owner_id === user.id && character.is_active !== false);
}

export function canDeleteCharacter(user: AppUser, character: OwnedResource): boolean {
  return canViewCharacter(user, character);
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

export function assertPermission(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

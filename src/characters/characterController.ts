import type { AppUser } from '../permissions/accessControl.js';
import {
  createCharacterSheet,
  deleteCharacterSheet,
  getCharacterSheetById,
  listCharacterSheets,
  updateCharacterSheet,
  type CreateCharacterInput,
  type UpdateCharacterInput
} from './characterService.js';

export async function createCharacter(user: AppUser, input: CreateCharacterInput) {
  return createCharacterSheet(user, input);
}

export async function viewCharacter(user: AppUser, characterId: string) {
  return getCharacterSheetById(user, characterId);
}

export async function editCharacter(user: AppUser, characterId: string, input: UpdateCharacterInput) {
  return updateCharacterSheet(user, characterId, input);
}

export async function removeCharacter(user: AppUser, characterId: string) {
  return deleteCharacterSheet(user, characterId);
}

export async function listCharacters(user: AppUser) {
  return listCharacterSheets(user);
}

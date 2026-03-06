import type { AppUser } from '../permissions/accessControl.js';
import {
  createNpcSheet,
  deleteNpcSheet,
  getNpcSheetById,
  listNpcSheets,
  updateNpcSheet,
  type CreateNpcInput,
  type UpdateNpcInput
} from './npcService.js';

export async function createNpc(user: AppUser, input: CreateNpcInput) {
  return createNpcSheet(user, input);
}

export async function viewNpc(user: AppUser, npcId: string) {
  return getNpcSheetById(user, npcId);
}

export async function editNpc(user: AppUser, npcId: string, input: UpdateNpcInput) {
  return updateNpcSheet(user, npcId, input);
}

export async function removeNpc(user: AppUser, npcId: string) {
  return deleteNpcSheet(user, npcId);
}

export async function listNpcs(user: AppUser) {
  return listNpcSheets(user);
}

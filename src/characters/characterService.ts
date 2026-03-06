export const STORAGE_KEY = 'arkham-ledger-coc-sheets-v1';

export function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function persistState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function createCharacterId() {
  return 'id_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
}

export function rollD100() {
  return Math.floor(Math.random() * 100) + 1;
}

import { createRuntimeBrowserClient } from './browser/supabaseBrowserClient.js';
import {
  createSignedSheetImageUrl,
  deleteCharacterSheet,
  fetchProfile,
  listCharacterSheets,
  updateCharacterSheetImage,
  uploadCharacterSheetImage,
  upsertCharacterSheet
} from './browser/characterSheetsApi.js';

const STORAGE_KEY = 'arkham-ledger:sheets:v1';

const state = {
  sheets: [],
  selectedId: null,
  search: '',
  dirty: false,
  sync: {
    client: null,
    user: null,
    profile: null,
    connected: false
  }
};

const el = {
  statusTag: document.getElementById('statusTag'),
  autosaveTag: document.getElementById('autosaveTag'),
  selectedTag: document.getElementById('selectedTag'),
  newSheetBtn: document.getElementById('newSheetBtn'),
  importBtn: document.getElementById('importBtn'),
  importFile: document.getElementById('importFile'),
  exportAllBtn: document.getElementById('exportAllBtn'),
  quickRollBtn: document.getElementById('quickRollBtn'),
  viewMode: document.getElementById('viewMode'),
  expandAllBtn: document.getElementById('expandAllBtn'),
  collapseAllBtn: document.getElementById('collapseAllBtn'),
  sheetSearch: document.getElementById('sheetSearch'),
  searchContainer: document.querySelector('.search'),
  sheetList: document.getElementById('sheetList'),
  duplicateBtn: document.getElementById('duplicateBtn'),
  exportBtn: document.getElementById('exportBtn'),
  deleteBtn: document.getElementById('deleteBtn'),
  viewRoot: document.getElementById('viewRoot'),
  topTags: document.querySelector('.toolbar .top-actions:first-child'),
  topActions: document.querySelector('.toolbar .top-actions:last-child'),
  toast: document.getElementById('toast')
};

void initialize();

async function initialize() {
  try {
    state.sync.client = createRuntimeBrowserClient();
  } catch (error) {
    setStatus(error?.message || 'Supabase nao configurado');
    return;
  }

  const {
    data: { session }
  } = await state.sync.client.auth.getSession();

  if (!session?.user) {
    window.location.href = './login.html';
    return;
  }

  state.sync.user = session.user;
  await loadProfile();
  await loadSheetsFromSupabase();
  state.sync.connected = true;

  injectToolbarButtons();
  bindEvents();
  applyRoleVisibility();
  render();
}

function injectToolbarButtons() {
  if (!el.topActions) return;

  const saveButton = document.createElement('button');
  saveButton.className = 'btn ok';
  saveButton.id = 'saveSheetBtn';
  saveButton.textContent = 'Salvar';
  el.topActions.prepend(saveButton);
  el.saveSheetBtn = saveButton;

  const toggleButton = document.createElement('button');
  toggleButton.className = 'btn ghost';
  toggleButton.id = 'toggleActiveBtn';
  toggleButton.textContent = 'Inativar';
  el.topActions.prepend(toggleButton);
  el.toggleActiveBtn = toggleButton;

  const logoutButton = document.createElement('button');
  logoutButton.className = 'btn ghost';
  logoutButton.id = 'logoutBtn';
  logoutButton.textContent = 'Sair';
  if (el.topTags) {
    el.topTags.appendChild(logoutButton);
  }
  el.logoutBtn = logoutButton;
}

function bindEvents() {
  el.newSheetBtn?.addEventListener('click', () => {
    if (!canCreateSheet()) {
      showToast('Players so podem criar ficha sem personagem ativo.');
      return;
    }

    const sheet = createBlankSheet(state.sync.user?.id ?? null);
    state.sheets.unshift(sheet);
    state.selectedId = sheet.id;
    state.dirty = true;
    render();
  });

  el.saveSheetBtn?.addEventListener('click', async () => {
    await saveSelectedSheet();
  });

  el.toggleActiveBtn?.addEventListener('click', async () => {
    if (!isCurrentUserDm()) return;
    const selected = getSelectedSheet();
    if (!selected) return;

    selected.isActive = !selected.isActive;
    selected.updatedAt = new Date().toISOString();
    state.dirty = true;
    await saveSelectedSheet(selected.isActive ? 'Ficha ativada' : 'Ficha inativada');
  });

  el.duplicateBtn?.addEventListener('click', () => {
    if (!isCurrentUserDm()) return;
    const selected = getSelectedSheet();
    if (!selected) return;

    const copy = {
      ...selected,
      id: crypto.randomUUID(),
      name: `${selected.name} (copia)`,
      ownerId: selected.ownerId,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    state.sheets.unshift(copy);
    state.selectedId = copy.id;
    state.dirty = true;
    render();
  });

  el.deleteBtn?.addEventListener('click', async () => {
    if (!canEditSheet(getSelectedSheet())) return;
    const selected = getSelectedSheet();
    if (!selected) return;

    if (!confirm(`Excluir ficha "${selected.name}"?`)) return;

    state.sheets = state.sheets.filter((sheet) => sheet.id !== selected.id);
    state.selectedId = state.sheets[0]?.id || null;

    if (state.sync.connected && selected.id) {
      await deleteRemoteSheet(selected.id);
    }

    state.dirty = false;
    showToast('Ficha excluida');
    render();
  });

  el.exportBtn?.addEventListener('click', () => {
    const selected = getSelectedSheet();
    if (!selected) return;

    downloadJson(`${slugify(selected.name)}.json`, selected);
    showToast('Ficha exportada');
  });

  el.importBtn?.addEventListener('click', () => {
    if (!isCurrentUserDm()) return;
    el.importFile?.click();
  });

  el.importFile?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const imported = normalizeImportedSheets(parsed, state.sync.user?.id ?? null);
      if (!imported.length) {
        throw new Error('Nenhuma ficha valida encontrada no JSON.');
      }

      state.sheets = imported;
      state.selectedId = imported[0].id;
      state.dirty = true;
      render();
      showToast('Importacao concluida. Clique em salvar para persistir.');
    } catch (error) {
      showToast(error?.message || 'Falha ao importar');
    } finally {
      event.target.value = '';
    }
  });

  el.exportAllBtn?.addEventListener('click', () => {
    if (!isCurrentUserDm()) return;
    downloadJson('arkham-ledger-backup.json', state.sheets);
    showToast('Backup exportado');
  });

  el.sheetSearch?.addEventListener('input', (event) => {
    state.search = String(event.target.value || '').toLowerCase().trim();
    renderList();
  });

  el.logoutBtn?.addEventListener('click', async () => {
    await state.sync.client.auth.signOut();
    window.location.href = './login.html';
  });
}

async function loadProfile() {
  state.sync.profile = await fetchProfile(state.sync.client, state.sync.user.id);
}

async function loadSheetsFromSupabase() {
  const rows = await listCharacterSheets(state.sync.client);
  state.sheets = rows.map(deserializeSheet);
  state.selectedId = state.sheets[0]?.id || null;
  state.dirty = false;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sheets));
}

function render() {
  renderList();
  renderSheet();
  updateTags();
  updateActionVisibility();
}

function renderList() {
  if (!el.sheetList) return;

  const filtered = state.sheets.filter((sheet) => {
    if (!state.search) return true;
    return sheet.name.toLowerCase().includes(state.search);
  });

  el.sheetList.innerHTML = '';
  for (const sheet of filtered) {
    const item = document.createElement('button');
    item.className = `sheet-item${sheet.id === state.selectedId ? ' active' : ''}`;
    item.type = 'button';
    item.innerHTML = `<div class="title">${escapeHtml(sheet.name)}</div>
      <div class="meta">
        <span>${escapeHtml(sheet.occupation)}</span>
        <span>${sheet.isActive ? 'Ativa' : 'Inativa'}</span>
      </div>`;
    item.addEventListener('click', () => {
      state.selectedId = sheet.id;
      state.dirty = false;
      render();
    });
    el.sheetList.appendChild(item);
  }
}

function renderSheet() {
  if (!el.viewRoot) return;

  const selected = getSelectedSheet();
  if (!selected) {
    el.viewRoot.innerHTML = '<article class="sheet-card"><div class="sheet-body"><p>Nenhuma ficha encontrada.</p></div></article>';
    return;
  }

  const editable = canEditSheet(selected);
  const disabled = editable ? '' : 'disabled';

  el.viewRoot.className = 'view-root focus-view';
  el.viewRoot.innerHTML = `<article class="sheet-card" style="width:min(1200px,100%)">
    <header class="card-header">
      <h2>${escapeHtml(selected.name)}</h2>
      <div class="subtitle">Investigador · ${selected.isActive ? 'Ativa' : 'Inativa'}</div>
    </header>
    <div class="sheet-body">
      <section class="section">
        <h3>Dados Principais</h3>
        <div class="portrait-panel">
          <div class="portrait-preview">
            ${renderSheetImage(selected)}
          </div>
          <div class="portrait-actions">
            ${editable ? '<div class="field"><label>Foto do investigador</label><input id="fieldImage" type="file" accept="image/*"></div>' : ''}
            <div class="helper">A imagem e enviada ao Supabase somente ao clicar em salvar.</div>
          </div>
        </div>
        <div class="grid-2">
          <div class="field"><label>Nome</label><input id="fieldName" value="${escapeHtml(selected.name)}" ${disabled}></div>
          <div class="field"><label>Ocupacao</label><input id="fieldOccupation" value="${escapeHtml(selected.occupation)}" ${disabled}></div>
          <div class="field"><label>Origem</label><input id="fieldHome" value="${escapeHtml(selected.home)}" ${disabled}></div>
          <div class="field"><label>Idade</label><input id="fieldAge" type="number" value="${selected.age}" ${disabled}></div>
        </div>
      </section>
      <section class="section">
        <h3>Anotacoes</h3>
        <textarea id="fieldNotes" ${disabled}>${escapeHtml(selected.notes)}</textarea>
      </section>
      <section class="section">
        <h3>Pericias (CoC 7e)</h3>
        <div class="skills">${selected.skills.map((skill, idx) => renderSkill(skill, idx, editable)).join('')}</div>
      </section>
      ${editable ? '<button id="saveInsideBtn" class="btn ok">Salvar Ficha</button>' : ''}
    </div>
  </article>`;

  if (editable) {
    bindSheetFields(selected.id);
    document.getElementById('saveInsideBtn')?.addEventListener('click', async () => {
      await saveSelectedSheet();
    });
  }
}

function bindSheetFields(sheetId) {
  const bind = (id, key, cast = (v) => v) => {
    const input = document.getElementById(id);
    input?.addEventListener('input', () => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (!sheet) return;
      sheet[key] = cast(input.value);
      sheet.updatedAt = new Date().toISOString();
      state.dirty = true;
      updateTags();
    });
  };

  bind('fieldName', 'name');
  bind('fieldOccupation', 'occupation');
  bind('fieldHome', 'home');
  bind('fieldAge', 'age', (v) => Number(v || 0));
  bind('fieldNotes', 'notes');

  const imageInput = document.getElementById('fieldImage');
  imageInput?.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!file) return;

    const sheet = state.sheets.find((s) => s.id === sheetId);
    if (!sheet) return;

    setSheetPreviewUrl(sheet, URL.createObjectURL(file));
    sheet.pendingImageFile = file;
    sheet.updatedAt = new Date().toISOString();
    state.dirty = true;
    updateTags();
    render();
  });

  for (const skillInput of document.querySelectorAll('[data-skill-value]')) {
    skillInput.addEventListener('input', () => {
      const sheet = state.sheets.find((s) => s.id === sheetId);
      if (!sheet) return;
      const skillIndex = Number(skillInput.getAttribute('data-skill-value'));
      if (!sheet.skills[skillIndex]) return;
      sheet.skills[skillIndex].value = clampPercent(Number(skillInput.value));
      sheet.updatedAt = new Date().toISOString();
      state.dirty = true;
      updateTags();
    });
  }
}

function renderSkill(skill, index, editable) {
  const disabled = editable ? '' : 'disabled';
  return `<details class="skill-group">
    <summary>${escapeHtml(skill.name)} <span class="base-badge">Base ${skill.base}</span></summary>
    <div class="skill-group-body">
      <div class="skill-row">
        <div class="name"><span class="skill-label">Valor atual</span></div>
        <input class="mini" type="number" min="0" max="99" value="${skill.value}" data-skill-value="${index}" ${disabled}>
        <div class="mini">-</div>
        <div class="mini">Dif: ${Math.floor(skill.value / 2)}</div>
        <div class="mini">Ext: ${Math.floor(skill.value / 5)}</div>
      </div>
    </div>
  </details>`;
}

async function saveSelectedSheet(successMessage = 'Ficha salva') {
  const selected = getSelectedSheet();
  if (!selected || !canEditSheet(selected)) return;

  if (!state.sync.connected) {
    showToast('Sessao nao conectada.');
    return;
  }

  try {
    const payload = serializeSheet(selected, state.sync.user.id);
    let refreshed = deserializeSheet(await upsertCharacterSheet(state.sync.client, payload));

    if (selected.pendingImageFile) {
      const imagePath = await uploadCharacterSheetImage(
        state.sync.client,
        refreshed.ownerId || state.sync.user.id,
        refreshed.id,
        selected.pendingImageFile
      );
      refreshed = deserializeSheet(await updateCharacterSheetImage(state.sync.client, refreshed.id, imagePath));
      selected.pendingImageFile = null;
    }

    const index = state.sheets.findIndex((item) => item.id === refreshed.id);
    if (index >= 0) {
      releasePreviewUrl(state.sheets[index]);
      state.sheets[index] = refreshed;
    } else {
      state.sheets.unshift(refreshed);
      state.selectedId = refreshed.id;
    }

    await ensureSheetImageUrl(refreshed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sheets));
    state.dirty = false;
    showToast(successMessage);
    render();
  } catch (error) {
    showToast(error?.message || 'Falha ao salvar');
  }
}

async function deleteRemoteSheet(sheetId) {
  await deleteCharacterSheet(state.sync.client, sheetId);
}

function applyRoleVisibility() {
  const isDm = isCurrentUserDm();

  if (el.searchContainer) {
    el.searchContainer.classList.toggle('hidden', !isDm);
  }
  if (el.topActions) {
    el.topActions.classList.toggle('hidden', !isDm);
  }

  if (el.importBtn) el.importBtn.classList.toggle('hidden', !isDm);
  if (el.exportAllBtn) el.exportAllBtn.classList.toggle('hidden', !isDm);
  if (el.quickRollBtn) el.quickRollBtn.classList.add('hidden');
  if (el.viewMode) el.viewMode.closest('.switch')?.classList.add('hidden');
  if (el.expandAllBtn) el.expandAllBtn.closest('.row')?.classList.add('hidden');
}

function updateActionVisibility() {
  const selected = getSelectedSheet();
  const editable = canEditSheet(selected);

  if (el.newSheetBtn) el.newSheetBtn.disabled = !canCreateSheet();
  if (el.saveSheetBtn) el.saveSheetBtn.disabled = !editable || !state.dirty;
  if (el.toggleActiveBtn) {
    el.toggleActiveBtn.disabled = !(isCurrentUserDm() && selected);
    if (selected) {
      el.toggleActiveBtn.textContent = selected.isActive ? 'Inativar' : 'Ativar';
    }
  }
  if (el.deleteBtn) el.deleteBtn.disabled = !editable;
  if (el.duplicateBtn) el.duplicateBtn.disabled = !isCurrentUserDm();
}

function getSelectedSheet() {
  return state.sheets.find((sheet) => sheet.id === state.selectedId) || null;
}

function isCurrentUserDm() {
  return state.sync.profile?.role === 'dm';
}

function isOwnedByCurrentUser(sheet) {
  return Boolean(state.sync.user && sheet?.ownerId === state.sync.user.id);
}

function canEditSheet(sheet) {
  if (!sheet || !state.sync.connected) return false;
  if (isCurrentUserDm()) return true;
  return isOwnedByCurrentUser(sheet);
}

function playerHasActiveCharacter() {
  if (!state.sync.user) return false;
  return state.sheets.some((sheet) => sheet.ownerId === state.sync.user.id && sheet.isActive);
}

function canCreateSheet() {
  if (!state.sync.connected) return false;
  if (isCurrentUserDm()) return true;
  return !playerHasActiveCharacter();
}

function updateTags() {
  const selected = getSelectedSheet();
  if (el.selectedTag) {
    el.selectedTag.textContent = selected ? selected.name : 'Nenhuma ficha';
  }

  if (el.autosaveTag) {
    if (!state.sync.connected) {
      el.autosaveTag.textContent = 'Sem sessao';
    } else if (state.dirty) {
      el.autosaveTag.textContent = 'Alteracoes pendentes';
    } else {
      el.autosaveTag.textContent = 'Tudo salvo';
    }
  }

  setStatus(isCurrentUserDm() ? 'Perfil DM' : 'Perfil Player');
}

function setStatus(message) {
  if (el.statusTag) el.statusTag.textContent = message;
}

function serializeSheet(sheet, userId) {
  return {
    id: sheet.id,
    owner_id: sheet.ownerId || userId,
    name: sheet.name,
    is_active: sheet.isActive !== false,
    image_url: sheet.imagePath || null,
    sheet_data: {
      occupation: sheet.occupation,
      home: sheet.home,
      age: sheet.age,
      notes: sheet.notes,
      skills: sheet.skills
    }
  };
}

function deserializeSheet(row) {
  const data = row?.sheet_data && typeof row.sheet_data === 'object' ? row.sheet_data : {};
  return {
    id: typeof row.id === 'string' ? row.id : crypto.randomUUID(),
    ownerId: typeof row.owner_id === 'string' ? row.owner_id : null,
    name: String(row.name || 'Novo Investigador'),
    isActive: row.is_active !== false,
    imagePath: typeof row.image_url === 'string' ? row.image_url : null,
    imageSignedUrl: null,
    imagePreviewUrl: null,
    pendingImageFile: null,
    occupation: String(data.occupation || 'Sem ocupacao'),
    home: String(data.home || 'Arkham'),
    age: Number(data.age || 30),
    notes: String(data.notes || ''),
    skills: normalizeSkills(Array.isArray(data.skills) ? data.skills : null),
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString()
  };
}

function normalizeImportedSheets(data, fallbackOwnerId) {
  const list = Array.isArray(data) ? data : [data];
  return list
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      id: typeof item.id === 'string' ? item.id : crypto.randomUUID(),
      ownerId: typeof item.ownerId === 'string' ? item.ownerId : fallbackOwnerId,
      name: String(item.name || 'Novo Investigador'),
      isActive: item.isActive !== false,
      imagePath: typeof item.imagePath === 'string' ? item.imagePath : null,
      imageSignedUrl: null,
      imagePreviewUrl: null,
      pendingImageFile: null,
      occupation: String(item.occupation || 'Sem ocupacao'),
      home: String(item.home || 'Arkham'),
      age: Number(item.age || 30),
      notes: String(item.notes || ''),
      skills: normalizeSkills(Array.isArray(item.skills) ? item.skills : null),
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
      updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString()
    }));
}

function createBlankSheet(ownerId) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    ownerId,
    name: 'Novo Investigador',
    isActive: true,
    imagePath: null,
    imageSignedUrl: null,
    imagePreviewUrl: null,
    pendingImageFile: null,
    occupation: 'Antiquario',
    home: 'Arkham',
    age: 32,
    notes: '',
    skills: defaultCoc7eSkills(),
    createdAt: now,
    updatedAt: now
  };
}

function normalizeSkills(skills) {
  const defaults = defaultCoc7eSkills();
  if (!Array.isArray(skills) || !skills.length) return defaults;

  const byName = new Map();
  for (const skill of skills) {
    if (!skill || typeof skill !== 'object') continue;
    const name = String(skill.name || '').trim();
    if (!name) continue;
    byName.set(name.toLowerCase(), {
      name,
      base: Number(skill.base || skill.value || 1),
      value: clampPercent(Number(skill.value || skill.base || 1))
    });
  }

  const merged = [];
  for (const def of defaults) {
    const existing = byName.get(def.name.toLowerCase());
    merged.push(existing ? { ...def, ...existing } : def);
  }

  for (const value of byName.values()) {
    const exists = merged.some((item) => item.name.toLowerCase() === value.name.toLowerCase());
    if (!exists) merged.push(value);
  }

  return merged;
}

function defaultCoc7eSkills() {
  return [
    { name: 'Accounting', base: 5, value: 5 },
    { name: 'Anthropology', base: 1, value: 1 },
    { name: 'Appraise', base: 5, value: 5 },
    { name: 'Archaeology', base: 1, value: 1 },
    { name: 'Art/Craft (Any)', base: 5, value: 5 },
    { name: 'Charm', base: 15, value: 15 },
    { name: 'Climb', base: 20, value: 20 },
    { name: 'Credit Rating', base: 0, value: 0 },
    { name: 'Cthulhu Mythos', base: 0, value: 0 },
    { name: 'Disguise', base: 5, value: 5 },
    { name: 'Dodge', base: 20, value: 20 },
    { name: 'Drive Auto', base: 20, value: 20 },
    { name: 'Electrical Repair', base: 10, value: 10 },
    { name: 'Fast Talk', base: 5, value: 5 },
    { name: 'Fighting (Brawl)', base: 25, value: 25 },
    { name: 'Firearms (Handgun)', base: 20, value: 20 },
    { name: 'Firearms (Rifle/Shotgun)', base: 25, value: 25 },
    { name: 'First Aid', base: 30, value: 30 },
    { name: 'History', base: 5, value: 5 },
    { name: 'Intimidate', base: 15, value: 15 },
    { name: 'Jump', base: 20, value: 20 },
    { name: 'Language (Other)', base: 1, value: 1 },
    { name: 'Language (Own)', base: 70, value: 70 },
    { name: 'Law', base: 5, value: 5 },
    { name: 'Library Use', base: 20, value: 20 },
    { name: 'Listen', base: 20, value: 20 },
    { name: 'Locksmith', base: 1, value: 1 },
    { name: 'Mechanical Repair', base: 10, value: 10 },
    { name: 'Medicine', base: 1, value: 1 },
    { name: 'Natural World', base: 10, value: 10 },
    { name: 'Navigate', base: 10, value: 10 },
    { name: 'Occult', base: 5, value: 5 },
    { name: 'Operate Heavy Machinery', base: 1, value: 1 },
    { name: 'Persuade', base: 10, value: 10 },
    { name: 'Pilot (Any)', base: 1, value: 1 },
    { name: 'Psychology', base: 10, value: 10 },
    { name: 'Psychoanalysis', base: 1, value: 1 },
    { name: 'Ride', base: 5, value: 5 },
    { name: 'Science (Any)', base: 1, value: 1 },
    { name: 'Sleight of Hand', base: 10, value: 10 },
    { name: 'Spot Hidden', base: 25, value: 25 },
    { name: 'Stealth', base: 20, value: 20 },
    { name: 'Survival (Any)', base: 10, value: 10 },
    { name: 'Swim', base: 20, value: 20 },
    { name: 'Throw', base: 20, value: 20 },
    { name: 'Track', base: 10, value: 10 }
  ];
}

function clampPercent(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 99) return 99;
  return Math.floor(value);
}

function showToast(message) {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.toast.classList.remove('show'), 2200);
}
showToast.timer = 0;

function renderSheetImage(sheet) {
  const imageUrl = sheet.imagePreviewUrl || sheet.imageSignedUrl;

  if (sheet.imagePath && !imageUrl) {
    void ensureSheetImageUrl(sheet);
  }

  if (!imageUrl) {
    return '<span>Sem retrato cadastrado</span>';
  }

  return `<img src="${escapeAttribute(imageUrl)}" alt="Retrato de ${escapeAttribute(sheet.name)}">`;
}

async function ensureSheetImageUrl(sheet) {
  if (!sheet?.imagePath || sheet.imagePreviewUrl || sheet.imageSignedUrl || !state.sync.client) return;

  try {
    sheet.imageSignedUrl = await createSignedSheetImageUrl(state.sync.client, sheet.imagePath, 3600);
  } catch {
    return;
  }

  if (sheet.id === state.selectedId) render();
}

function setSheetPreviewUrl(sheet, nextUrl) {
  releasePreviewUrl(sheet);
  sheet.imagePreviewUrl = nextUrl;
}

function releasePreviewUrl(sheet) {
  if (sheet?.imagePreviewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(sheet.imagePreviewUrl);
  }
  if (sheet) {
    sheet.imagePreviewUrl = null;
  }
}

function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(value) {
  return (
    String(value || 'sheet')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'sheet'
  );
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/'/g, '&#39;');
}

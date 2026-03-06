const STORAGE_KEY = 'arkham-ledger-lite-v2';

const elements = {
  newSheetBtn: document.getElementById('newSheetBtn'),
  duplicateBtn: document.getElementById('duplicateBtn'),
  deleteBtn: document.getElementById('deleteBtn'),
  exportBtn: document.getElementById('exportBtn'),
  exportAllBtn: document.getElementById('exportAllBtn'),
  importBtn: document.getElementById('importBtn'),
  importFile: document.getElementById('importFile'),
  quickRollBtn: document.getElementById('quickRollBtn'),
  sheetSearch: document.getElementById('sheetSearch'),
  sheetList: document.getElementById('sheetList'),
  viewRoot: document.getElementById('viewRoot'),
  selectedTag: document.getElementById('selectedTag'),
  statusTag: document.getElementById('statusTag'),
  rollDialog: document.getElementById('rollDialog'),
  rollTitle: document.getElementById('rollTitle'),
  rollMeta: document.getElementById('rollMeta'),
  rollNumber: document.getElementById('rollNumber'),
  rollBadge: document.getElementById('rollBadge'),
  rollThresholds: document.getElementById('rollThresholds')
};

function uid() {
  return `sheet_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function defaultSheet(name = 'Investigador sem nome') {
  return {
    id: uid(),
    name,
    occupation: '',
    notes: '',
    updatedAt: nowIso()
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

const state = (() => {
  const loaded = loadState();
  if (loaded?.sheets?.length) {
    return {
      sheets: loaded.sheets,
      selectedId: loaded.selectedId ?? loaded.sheets[0].id,
      filter: ''
    };
  }

  const first = defaultSheet();
  return { sheets: [first], selectedId: first.id, filter: '' };
})();

function selectedSheet() {
  return state.sheets.find((s) => s.id === state.selectedId) ?? null;
}

function setStatus(text) {
  if (elements.statusTag) elements.statusTag.textContent = text;
}

function renderList() {
  if (!elements.sheetList) return;

  const q = state.filter.trim().toLowerCase();
  const visible = state.sheets.filter((sheet) => {
    if (!q) return true;
    return `${sheet.name} ${sheet.occupation} ${sheet.notes}`.toLowerCase().includes(q);
  });

  elements.sheetList.innerHTML = visible
    .map((sheet) => {
      const activeClass = sheet.id === state.selectedId ? 'active' : '';
      return `
        <div class="sheet-item ${activeClass}" data-sheet-id="${sheet.id}">
          <div class="title">${sheet.name || 'Investigador sem nome'}</div>
          <div class="meta">
            <span>${sheet.occupation || 'Sem ocupação'}</span>
            <span>${new Date(sheet.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      `;
    })
    .join('');

  for (const item of elements.sheetList.querySelectorAll('.sheet-item')) {
    item.addEventListener('click', () => {
      state.selectedId = item.dataset.sheetId;
      saveState();
      render();
    });
  }
}

function renderSheetEditor(sheet) {
  if (!elements.viewRoot) return;

  elements.viewRoot.innerHTML = `
    <div class="sheet-card" style="max-width:900px;margin:0 auto;">
      <div class="card-header">
        <h2 contenteditable="true" id="sheetName">${sheet.name}</h2>
        <div class="subtitle">Editor rápido</div>
      </div>
      <div class="sheet-body">
        <div class="section">
          <h3>Ocupação</h3>
          <input id="sheetOccupation" value="${sheet.occupation ?? ''}" placeholder="Ex.: Arqueólogo" />
        </div>
        <div class="section">
          <h3>Anotações</h3>
          <textarea id="sheetNotes" placeholder="Histórico, contatos, pistas...">${sheet.notes ?? ''}</textarea>
        </div>
      </div>
    </div>
  `;

  const name = elements.viewRoot.querySelector('#sheetName');
  const occupation = elements.viewRoot.querySelector('#sheetOccupation');
  const notes = elements.viewRoot.querySelector('#sheetNotes');

  function persist() {
    const target = selectedSheet();
    if (!target) return;
    target.name = (name?.textContent || '').trim() || 'Investigador sem nome';
    target.occupation = occupation?.value ?? '';
    target.notes = notes?.value ?? '';
    target.updatedAt = nowIso();
    saveState();
    renderList();
  }

  name?.addEventListener('input', persist);
  occupation?.addEventListener('input', persist);
  notes?.addEventListener('input', persist);
}

function render() {
  const current = selectedSheet();
  if (!current) {
    if (elements.viewRoot) elements.viewRoot.innerHTML = '<p>Nenhuma ficha disponível.</p>';
    if (elements.selectedTag) elements.selectedTag.textContent = 'Nenhuma ficha';
    return;
  }

  if (elements.selectedTag) {
    elements.selectedTag.textContent = current.name || 'Investigador sem nome';
  }

  renderList();
  renderSheetEditor(current);
}

function downloadJson(obj, fileName) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 300);
}

function quickRoll() {
  const roll = Math.floor(Math.random() * 100) + 1;
  if (!elements.rollDialog) return;
  if (elements.rollTitle) elements.rollTitle.textContent = 'D100 livre';
  if (elements.rollMeta) elements.rollMeta.textContent = 'Alvo 0';
  if (elements.rollNumber) elements.rollNumber.textContent = String(roll).padStart(2, '0');
  if (elements.rollBadge) elements.rollBadge.textContent = roll === 1 ? 'Crítico' : 'Rolagem';
  if (elements.rollThresholds) elements.rollThresholds.textContent = 'Sem limiares';
  elements.rollDialog.showModal();
}

function setupEvents() {
  elements.newSheetBtn?.addEventListener('click', () => {
    const sheet = defaultSheet(`Investigador ${state.sheets.length + 1}`);
    state.sheets.unshift(sheet);
    state.selectedId = sheet.id;
    saveState();
    setStatus('Nova ficha criada');
    render();
  });

  elements.duplicateBtn?.addEventListener('click', () => {
    const current = selectedSheet();
    if (!current) return;
    const clone = { ...current, id: uid(), name: `${current.name} (cópia)`, updatedAt: nowIso() };
    state.sheets.unshift(clone);
    state.selectedId = clone.id;
    saveState();
    setStatus('Ficha duplicada');
    render();
  });

  elements.deleteBtn?.addEventListener('click', () => {
    if (state.sheets.length <= 1) {
      setStatus('Mínimo de uma ficha');
      return;
    }
    const index = state.sheets.findIndex((s) => s.id === state.selectedId);
    if (index < 0) return;
    state.sheets.splice(index, 1);
    state.selectedId = state.sheets[Math.max(0, index - 1)].id;
    saveState();
    setStatus('Ficha excluída');
    render();
  });

  elements.exportBtn?.addEventListener('click', () => {
    const current = selectedSheet();
    if (!current) return;
    downloadJson(current, `${current.name || 'ficha'}.json`);
    setStatus('Ficha exportada');
  });

  elements.exportAllBtn?.addEventListener('click', () => {
    downloadJson({ app: 'Arkham Ledger', sheets: state.sheets, exportedAt: nowIso() }, 'arkham-ledger-backup.json');
    setStatus('Backup exportado');
  });

  elements.importBtn?.addEventListener('click', () => elements.importFile?.click());
  elements.importFile?.addEventListener('change', (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const imported = Array.isArray(parsed.sheets)
          ? parsed.sheets
          : Array.isArray(parsed)
            ? parsed
            : [parsed];

        const normalized = imported.map((entry, idx) => ({
          id: uid(),
          name: entry.name || `Importada ${idx + 1}`,
          occupation: entry.occupation || '',
          notes: entry.notes || '',
          updatedAt: nowIso()
        }));

        state.sheets.unshift(...normalized);
        state.selectedId = normalized[0]?.id ?? state.selectedId;
        saveState();
        setStatus('Importação concluída');
        render();
      } catch {
        setStatus('Importação falhou');
      }
    };
    reader.readAsText(file, 'utf-8');
    event.target.value = '';
  });

  elements.quickRollBtn?.addEventListener('click', quickRoll);
  elements.sheetSearch?.addEventListener('input', (event) => {
    state.filter = event.target.value ?? '';
    renderList();
  });

  for (const btn of document.querySelectorAll('[data-close-roll]')) {
    btn.addEventListener('click', () => elements.rollDialog?.close());
  }
}

setupEvents();
setStatus('Pronto');
saveState();
render();

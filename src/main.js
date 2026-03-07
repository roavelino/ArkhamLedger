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
import {
  CAMPAIGN_CONTENT_TABLES,
  campaignAssetBucket,
  createSignedAssetUrl,
  deleteMapPin,
  listMapPins,
  listCampaignContentRows,
  listCampaignMembers,
  listCampaignsForUser,
  listNpcGalleryAssets,
  removeCampaignMember,
  sheetMediaBucket,
  upsertMapPin,
  uploadCampaignAsset,
  uploadNpcGalleryAsset,
  uploadSheetMedia,
  upsertNpcGalleryAsset,
  upsertCampaign,
  upsertCampaignContentRow,
  upsertCampaignMember,
  deleteCampaignContentRow
} from './browser/campaignApi.js';

const STORAGE_KEY = 'arkham-ledger:sheets:v2';
const VIEW_SHEETS = 'sheets';
const VIEW_CAMPAIGNS = 'campaigns';
const CAMPAIGN_MODE_DASHBOARD = 'dashboard';
const CAMPAIGN_MODE_DM_SCREEN = 'dm_screen';
const CAMPAIGN_MODE_MAPS = 'maps';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOCUMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/markdown'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 20 * 1024 * 1024;
const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

function isMissingColumnError(error, columnName) {
  return error?.code === '42703' && String(error?.message || '').includes(columnName);
}

const CONTENT_DEFINITIONS = [
  {
    table: 'session_summaries',
    label: 'Resumos de Sessao',
    bodyKey: 'summary_markdown',
    bodyLabel: 'Resumo em markdown',
    supportsFile: false,
    supportsType: false,
    supportsStatus: false
  },
  {
    table: 'timeline_entries',
    label: 'Linha do Tempo',
    bodyKey: 'description',
    bodyLabel: 'Descricao',
    supportsFile: false,
    supportsType: true,
    typeLabel: 'Tipo do evento',
    supportsStatus: false
  },
  {
    table: 'clues',
    label: 'Pistas',
    bodyKey: 'description',
    bodyLabel: 'Descricao',
    supportsFile: true,
    fileLabel: 'Imagem ou PDF',
    supportsType: false,
    supportsStatus: true
  },
  {
    table: 'handouts',
    label: 'Handouts',
    bodyKey: 'content_text',
    bodyLabel: 'Conteudo',
    supportsFile: true,
    fileLabel: 'Arquivo opcional',
    supportsType: true,
    typeLabel: 'Tipo',
    typeOptions: ['text', 'markdown', 'image', 'pdf'],
    supportsStatus: false
  },
  {
    table: 'maps',
    label: 'Mapas',
    bodyKey: 'description',
    bodyLabel: 'Descricao',
    supportsFile: true,
    fileLabel: 'Imagem do mapa',
    fileKey: 'image_url',
    supportsType: false,
    supportsStatus: false
  },
  {
    table: 'markdown_documents',
    label: 'Documentos Markdown',
    bodyKey: 'markdown_content',
    bodyLabel: 'Markdown',
    supportsFile: false,
    supportsType: false,
    supportsStatus: false
  },
  {
    table: 'relationship_diagrams',
    label: 'Diagramas',
    bodyKey: 'mermaid_source',
    bodyLabel: 'Codigo Mermaid',
    supportsFile: false,
    supportsType: false,
    supportsStatus: false
  },
  {
    table: 'dm_screen_pages',
    label: 'Tela do Mestre',
    bodyKey: 'content_json_or_text',
    bodyLabel: 'Conteudo',
    supportsFile: false,
    supportsType: true,
    typeLabel: 'Tipo de pagina',
    typeOptions: ['markdown', 'quick rules', 'session notes', 'npc list reference', 'clue list reference'],
    supportsStatus: false,
    supportsSort: true
  }
];

const state = {
  view: VIEW_SHEETS,
  sheets: [],
  campaigns: [],
  selectedId: null,
  selectedCampaignId: null,
  selectedDmScreenPageId: null,
  selectedMapId: null,
  campaignMode: CAMPAIGN_MODE_DASHBOARD,
  search: '',
  dirty: false,
  campaignDirty: false,
  campaignMembers: {},
  campaignContent: {},
  mapPins: {},
  npcGallery: [],
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
  sheetSearch: document.getElementById('sheetSearch'),
  searchContainer: document.querySelector('.search'),
  sheetList: document.getElementById('sheetList'),
  duplicateBtn: document.getElementById('duplicateBtn'),
  exportBtn: document.getElementById('exportBtn'),
  deleteBtn: document.getElementById('deleteBtn'),
  viewRoot: document.getElementById('viewRoot'),
  topTags: document.querySelector('.toolbar .top-actions:first-child'),
  topActions: document.querySelector('.toolbar .top-actions:last-child'),
  sidebarControls: document.querySelector('.sidebar-controls'),
  toast: document.getElementById('toast'),
  brandSub: document.querySelector('.brand .sub')
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
  await Promise.all([loadSheetsFromSupabase(), loadCampaignsFromSupabase()]);
  state.sync.connected = true;

  injectToolbarButtons();
  bindEvents();
  applyRoleVisibility();
  render();
}

function injectToolbarButtons() {
  if (!el.topTags || !el.topActions || document.getElementById('viewSwitch')) {
    return;
  }

  const viewSwitch = document.createElement('div');
  viewSwitch.className = 'top-actions';
  viewSwitch.id = 'viewSwitch';
  viewSwitch.innerHTML = `
    <button class="btn secondary" id="switchSheetsBtn" type="button">Fichas</button>
    <button class="btn secondary" id="switchCampaignsBtn" type="button">Campanhas</button>
  `;
  el.topTags.prepend(viewSwitch);

  const saveButton = document.createElement('button');
  saveButton.className = 'btn ok';
  saveButton.id = 'saveSheetBtn';
  saveButton.textContent = 'Salvar';
  el.topActions.prepend(saveButton);
  el.saveSheetBtn = saveButton;

  const pdfButton = document.createElement('button');
  pdfButton.className = 'btn secondary';
  pdfButton.id = 'exportPdfBtn';
  pdfButton.textContent = 'PDF';
  el.topActions.prepend(pdfButton);
  el.exportPdfBtn = pdfButton;

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
  el.topTags.appendChild(logoutButton);
  el.logoutBtn = logoutButton;
}

function bindEvents() {
  document.getElementById('switchSheetsBtn')?.addEventListener('click', () => {
    state.view = VIEW_SHEETS;
    render();
  });

  document.getElementById('switchCampaignsBtn')?.addEventListener('click', async () => {
    state.view = VIEW_CAMPAIGNS;
    state.campaignMode = CAMPAIGN_MODE_DASHBOARD;
    await ensureSelectedCampaignLoaded();
    render();
  });

  el.newSheetBtn?.addEventListener('click', async () => {
    if (state.view === VIEW_CAMPAIGNS) {
      if (!isCurrentUserDm()) return;
      const campaign = createBlankCampaign();
      state.campaigns.unshift(campaign);
      state.selectedCampaignId = campaign.id;
      state.campaignDirty = true;
      render();
      return;
    }

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

  el.importBtn?.addEventListener('click', async () => {
    if (state.view !== VIEW_SHEETS || !isCurrentUserDm()) return;
    const npc = createQuickNpcDraft();
    state.sheets.unshift(npc);
    state.selectedId = npc.id;
    state.dirty = true;
    render();
  });

  el.exportAllBtn?.addEventListener('click', async () => {
    if (state.view !== VIEW_SHEETS || !isCurrentUserDm()) return;
    const generated = createGeneratedNpc();
    state.sheets.unshift(generated);
    state.selectedId = generated.id;
    state.dirty = true;
    render();
    showToast('Rascunho de NPC gerado');
  });

  el.saveSheetBtn?.addEventListener('click', async () => {
    if (state.view === VIEW_CAMPAIGNS) {
      await saveSelectedCampaign();
      return;
    }
    await saveSelectedSheet();
  });

  el.toggleActiveBtn?.addEventListener('click', async () => {
    if (state.view !== VIEW_SHEETS || !isCurrentUserDm()) return;
    const selected = getSelectedSheet();
    if (!selected) return;

    selected.isActive = !selected.isActive;
    selected.updatedAt = new Date().toISOString();
    state.dirty = true;
    await saveSelectedSheet(selected.isActive ? 'Ficha ativada' : 'Ficha inativada');
  });

  el.duplicateBtn?.addEventListener('click', () => {
    if (state.view !== VIEW_SHEETS || !isCurrentUserDm()) return;
    const selected = getSelectedSheet();
    if (!selected) return;

    const copy = {
      ...selected,
      id: crypto.randomUUID(),
      name: `${selected.name} (copia)`,
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
    if (state.view === VIEW_CAMPAIGNS) {
      const campaign = getSelectedCampaign();
      if (!campaign || !canEditCampaign(campaign)) return;
      campaign.status = 'archived';
      campaign.updatedAt = new Date().toISOString();
      state.campaignDirty = true;
      await saveSelectedCampaign();
      showToast('Campanha arquivada');
      return;
    }

    const selected = getSelectedSheet();
    if (!selected || !canEditSheet(selected)) return;
    if (selected.type === 'npc') {
      if (!confirm(`Arquivar NPC "${selected.name}"?`)) return;
      selected.archivedAt = new Date().toISOString();
      selected.updatedAt = new Date().toISOString();
      try {
        await saveSelectedSheet('NPC arquivado', true);
        state.sheets = state.sheets.filter((sheet) => sheet.id !== selected.id);
        state.selectedId = state.sheets[0]?.id || null;
        render();
      } catch (error) {
        if (isMissingColumnError(error, 'archived_at')) {
          selected.archivedAt = null;
          if (state.sync.connected && selected.id) {
            await deleteCharacterSheet(state.sync.client, selected.id);
          }
          state.sheets = state.sheets.filter((sheet) => sheet.id !== selected.id);
          state.selectedId = state.sheets[0]?.id || null;
          state.dirty = false;
          showToast('NPC removido. A migracao de arquivo ainda nao foi aplicada.');
          render();
          return;
        }
        throw error;
      }
      return;
    }

    if (!confirm(`Excluir ficha "${selected.name}"?`)) return;

    state.sheets = state.sheets.filter((sheet) => sheet.id !== selected.id);
    state.selectedId = state.sheets[0]?.id || null;

    if (state.sync.connected && selected.id) {
      await deleteCharacterSheet(state.sync.client, selected.id);
    }

    state.dirty = false;
    showToast('Ficha excluida');
    render();
  });

  el.exportBtn?.addEventListener('click', () => {
    if (state.view === VIEW_CAMPAIGNS) {
      const campaign = getSelectedCampaign();
      if (!campaign) return;
      downloadJson(`${slugify(campaign.title)}-campanha.json`, {
        campaign,
        members: state.campaignMembers[campaign.id] || [],
        content: state.campaignContent[campaign.id] || {}
      });
      showToast('Campanha exportada');
      return;
    }

    const selected = getSelectedSheet();
    if (!selected) return;

    downloadJson(`${slugify(selected.name)}.json`, selected);
    showToast('Ficha exportada');
  });

  el.exportPdfBtn?.addEventListener('click', async () => {
    if (state.view !== VIEW_SHEETS) return;
    const selected = getSelectedSheet();
    if (!selected) return;
    await exportSheetAsPdf(selected);
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

async function loadCampaignsFromSupabase() {
  const rows = await listCampaignsForUser(state.sync.client, state.sync.user.id, state.sync.profile.role);
  state.campaigns = rows.map(deserializeCampaign);
  state.selectedCampaignId = state.campaigns[0]?.id || null;
  await ensureSelectedCampaignLoaded();
}

async function ensureSelectedCampaignLoaded() {
  const selected = getSelectedCampaign();
  if (!selected || state.campaignContent[selected.id]) {
    return;
  }

  const [members, ...contentLists] = await Promise.all([
    listCampaignMembers(state.sync.client, selected.id),
    ...CAMPAIGN_CONTENT_TABLES.map((table) => listCampaignContentRows(state.sync.client, table, selected.id))
  ]);

  state.campaignMembers[selected.id] = members;
  state.campaignContent[selected.id] = {};
  CAMPAIGN_CONTENT_TABLES.forEach((table, index) => {
    state.campaignContent[selected.id][table] = contentLists[index];
  });

  const maps = state.campaignContent[selected.id].maps || [];
  if (maps.length) {
    const pinLists = await Promise.all(maps.map((mapRow) => listMapPins(state.sync.client, mapRow.id)));
    maps.forEach((mapRow, index) => {
      state.mapPins[mapRow.id] = pinLists[index];
    });
  }

  ensureSelectedDmScreenPage();
  ensureSelectedMap();
}

async function ensureNpcGalleryLoaded() {
  if (!isCurrentUserDm() || state.npcGallery.length) {
    return;
  }

  const rows = await listNpcGalleryAssets(state.sync.client, state.sync.user.id);
  state.npcGallery = rows.map((row) => ({
    ...row,
    signedUrl: null
  }));

  await Promise.all(
    state.npcGallery.map(async (asset) => {
      asset.signedUrl = await resolveAssetUrl(asset.image_url);
    })
  );
}

function render() {
  renderSidebarControls();
  renderList();
  renderMain();
  updateTags();
  updateActionVisibility();
}

function renderSidebarControls() {
  if (!el.newSheetBtn || !el.importBtn || !el.exportAllBtn || !el.brandSub) return;

  if (state.view === VIEW_CAMPAIGNS) {
    el.brandSub.textContent = 'Campanhas, jogadores e investigacao';
    el.newSheetBtn.textContent = 'Nova campanha';
    el.newSheetBtn.classList.toggle('hidden', !isCurrentUserDm());
    el.importBtn.classList.add('hidden');
    el.exportAllBtn.classList.add('hidden');
    el.sheetSearch.placeholder = 'Buscar campanha...';
    return;
  }

  el.brandSub.textContent = 'Fichas, NPCs e revelacoes';
  el.newSheetBtn.textContent = 'Nova ficha';
  el.newSheetBtn.classList.remove('hidden');
  el.importBtn.textContent = 'NPC rapido';
  el.exportAllBtn.textContent = 'Gerar NPC';
  el.importBtn.classList.toggle('hidden', !isCurrentUserDm());
  el.exportAllBtn.classList.toggle('hidden', !isCurrentUserDm());
  el.sheetSearch.placeholder = 'Buscar ficha...';
}

function renderList() {
  if (!el.sheetList) return;
  if (state.view === VIEW_CAMPAIGNS) {
    renderCampaignList();
    return;
  }

  const filtered = state.sheets.filter((sheet) => {
    if (!state.search) return true;
    return [sheet.name, sheet.occupation, getCampaignTitle(sheet.campaignId)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(state.search);
  });

  el.sheetList.innerHTML = '';
  for (const sheet of filtered) {
    const item = document.createElement('button');
    item.className = `sheet-item${sheet.id === state.selectedId ? ' active' : ''}`;
    item.type = 'button';
    item.innerHTML = `<div class="title">${escapeHtml(sheet.name)}</div>
      <div class="meta">
        <span>${sheet.type === 'npc' ? 'NPC' : 'Investigador'}</span>
        <span>${escapeHtml(sheet.occupation || 'Sem ocupacao')}</span>
        <span>${escapeHtml(getCampaignTitle(sheet.campaignId) || 'Sem campanha')}</span>
      </div>`;
    item.addEventListener('click', () => {
      state.selectedId = sheet.id;
      state.dirty = false;
      render();
    });
    el.sheetList.appendChild(item);
  }
}

function renderCampaignList() {
  const filtered = state.campaigns.filter((campaign) => {
    if (!state.search) return true;
    return [campaign.title, campaign.publicSummary, campaign.status].join(' ').toLowerCase().includes(state.search);
  });

  el.sheetList.innerHTML = '';
  for (const campaign of filtered) {
    const item = document.createElement('button');
    item.className = `sheet-item${campaign.id === state.selectedCampaignId ? ' active' : ''}`;
    item.type = 'button';
    item.innerHTML = `<div class="title">${escapeHtml(campaign.title)}</div>
      <div class="meta">
        <span>${escapeHtml(campaign.status)}</span>
        <span>${campaign.ownerUserId === state.sync.user.id ? 'Mestre' : 'Jogador'}</span>
      </div>`;
    item.addEventListener('click', async () => {
      state.selectedCampaignId = campaign.id;
      state.campaignMode = CAMPAIGN_MODE_DASHBOARD;
      await ensureSelectedCampaignLoaded();
      ensureSelectedDmScreenPage();
      ensureSelectedMap();
      render();
    });
    el.sheetList.appendChild(item);
  }
}

function renderMain() {
  if (!el.viewRoot) return;
  if (state.view === VIEW_CAMPAIGNS) {
    if (state.campaignMode === CAMPAIGN_MODE_DM_SCREEN) {
      renderDmScreen();
      return;
    }
    if (state.campaignMode === CAMPAIGN_MODE_MAPS) {
      renderCampaignMaps();
      return;
    }
    renderCampaign();
    return;
  }
  renderSheet();
}

function renderSheet() {
  const selected = getSelectedSheet();
  if (!selected) {
    el.viewRoot.className = 'view-root focus-view';
    el.viewRoot.innerHTML = '<article class="sheet-card"><div class="sheet-body"><p>Nenhuma ficha encontrada.</p></div></article>';
    return;
  }

  if (selected.type === 'npc' && !canEditSheet(selected) && !isCurrentUserDm()) {
    renderNpcMiniProfile(selected);
    return;
  }

  const editable = canEditSheet(selected);
  const disabled = editable ? '' : 'disabled';
  const videoUrl = selected.videoPreviewUrl || selected.videoSignedUrl || selected.introVideoUrl;
  const galleryMarkup =
    editable && isCurrentUserDm() && selected.type === 'npc'
      ? renderNpcGallerySection(selected)
      : '';

  el.viewRoot.className = 'view-root focus-view';
  el.viewRoot.innerHTML = `<article class="sheet-card" style="width:min(1200px,100%)">
    <header class="card-header">
      <h2>${escapeHtml(selected.name)}</h2>
      <div class="subtitle">${selected.type === 'npc' ? 'NPC' : 'Investigador'} · ${selected.isActive ? 'Ativa' : 'Inativa'}</div>
    </header>
    <div class="sheet-body">
      <section class="section">
        <h3>Dados Principais</h3>
        <div class="portrait-panel">
          <div class="portrait-preview">${renderSheetImage(selected)}</div>
          <div class="portrait-actions">
            ${editable ? '<div class="field"><label>Retrato</label><input id="fieldImage" type="file" accept="image/*"></div>' : ''}
            ${editable ? '<div class="field"><label>Video curto</label><input id="fieldVideo" type="file" accept="video/*"></div>' : ''}
            <div class="helper">Imagens aceitas: JPG, PNG, WEBP, GIF ate 5 MB. Videos: MP4, WEBM ou MOV ate 20 MB.</div>
          </div>
        </div>
        ${videoUrl ? `<div class="section"><h3>Intro</h3><video controls style="width:100%;border-radius:12px;max-height:260px" src="${escapeAttribute(videoUrl)}"></video></div>` : ''}
        <div class="grid-2">
          <div class="field"><label>Nome</label><input id="fieldName" value="${escapeHtml(selected.name)}" ${disabled}></div>
          <div class="field"><label>Ocupacao</label><input id="fieldOccupation" value="${escapeHtml(selected.occupation || '')}" ${disabled}></div>
          <div class="field"><label>Origem</label><input id="fieldHome" value="${escapeHtml(selected.home)}" ${disabled}></div>
          <div class="field"><label>Idade</label><input id="fieldAge" type="number" value="${selected.age || ''}" ${disabled}></div>
          <div class="field">
            <label>Tipo</label>
            <select id="fieldType" ${!isCurrentUserDm() ? 'disabled' : ''}>
              <option value="player_character" ${selected.type === 'player_character' ? 'selected' : ''}>Investigador</option>
              <option value="npc" ${selected.type === 'npc' ? 'selected' : ''}>NPC</option>
            </select>
          </div>
          <div class="field">
            <label>Campanha</label>
            <select id="fieldCampaign" ${!isCurrentUserDm() ? 'disabled' : ''}>
              <option value="">Sem campanha</option>
              ${state.campaigns
                .map(
                  (campaign) =>
                    `<option value="${escapeAttribute(campaign.id)}" ${selected.campaignId === campaign.id ? 'selected' : ''}>${escapeHtml(campaign.title)}</option>`
                )
                .join('')}
            </select>
          </div>
        </div>
        <div class="grid-2">
          <div class="field"><label>Descricao Curta</label><textarea id="fieldDescription" ${disabled}>${escapeHtml(selected.description || '')}</textarea></div>
          <div class="field"><label>Anotacoes</label><textarea id="fieldNotes" ${disabled}>${escapeHtml(selected.notes || '')}</textarea></div>
        </div>
        ${
          isCurrentUserDm()
            ? `<label class="tag"><input id="fieldPlayerVisible" type="checkbox" ${selected.playerVisible ? 'checked' : ''}> Revelar mini perfil do NPC para jogadores</label>`
            : ''
        }
      </section>
      ${galleryMarkup}
      ${
        selected.type === 'npc'
          ? ''
          : `<section class="section">
        <h3>Pericias (CoC 7e)</h3>
        <div class="skills">${selected.skills.map((skill, idx) => renderSkill(skill, idx, editable)).join('')}</div>
      </section>`
      }
      ${editable ? '<button id="saveInsideBtn" class="btn ok">Salvar</button>' : ''}
    </div>
  </article>`;

  if (editable) {
    if (selected.type === 'npc' && isCurrentUserDm()) {
      void ensureNpcGalleryLoaded().then(() => {
        if (state.selectedId === selected.id) {
          render();
        }
      });
    }
    bindSheetFields(selected.id);
    document.getElementById('saveInsideBtn')?.addEventListener('click', async () => {
      await saveSelectedSheet();
    });
  }
}

function renderNpcGallerySection(sheet) {
  return `<section class="section">
    <h3>Galeria de Retratos de NPC</h3>
    <div class="helper">Use uma imagem reutilizavel para criar NPCs mais rapido ou envie um novo retrato para a biblioteca.</div>
    <div class="row" style="margin:10px 0 14px">
      <input id="npcGalleryUpload" type="file" accept="image/*" style="flex:1;min-width:220px">
      <input id="npcGalleryLabel" placeholder="Rotulo opcional" style="flex:1;min-width:180px">
      <button id="saveNpcGalleryAssetBtn" class="btn secondary" type="button">Salvar na galeria</button>
    </div>
    ${
      state.npcGallery.length
        ? `<div class="grid-4">${state.npcGallery.map((asset) => renderNpcGalleryAsset(asset, sheet)).join('')}</div>`
        : '<p class="muted">Nenhum retrato salvo na galeria.</p>'
    }
  </section>`;
}

function renderNpcGalleryAsset(asset, sheet) {
  return `<button class="section" type="button" data-pick-gallery-image="${escapeAttribute(asset.id)}" style="text-align:left">
    <div class="portrait-preview" style="width:100%;aspect-ratio:1/1;margin-bottom:10px">
      ${asset.signedUrl ? `<img src="${escapeAttribute(asset.signedUrl)}" alt="">` : '<span>Carregando</span>'}
    </div>
    <strong>${escapeHtml(asset.label || 'Retrato sem rotulo')}</strong>
    <div class="helper">${escapeHtml(formatGalleryTags(asset.tags_json))}</div>
    <div class="helper">${sheet.imagePath === asset.image_url ? 'Selecionado neste NPC' : 'Toque para aplicar ao NPC atual'}</div>
  </button>`;
}

function renderNpcMiniProfile(sheet) {
  const videoUrl = sheet.videoPreviewUrl || sheet.videoSignedUrl || sheet.introVideoUrl;
  el.viewRoot.className = 'view-root focus-view';
  el.viewRoot.innerHTML = `<article class="sheet-card" style="width:min(760px,100%)">
    <header class="card-header">
      <h2>${escapeHtml(sheet.name)}</h2>
      <div class="subtitle">NPC revelado</div>
    </header>
    <div class="sheet-body">
      <div class="portrait-panel">
        <div class="portrait-preview">${renderSheetImage(sheet)}</div>
        <div class="portrait-actions">
          <div class="field"><label>Descricao</label><textarea disabled>${escapeHtml(sheet.description || 'Sem descricao revelada.')}</textarea></div>
          <div class="helper">A ficha completa permanece restrita ao mestre. Jogadores veem apenas este mini perfil.</div>
        </div>
      </div>
      ${videoUrl ? `<video controls style="width:100%;border-radius:12px;max-height:260px" src="${escapeAttribute(videoUrl)}"></video>` : ''}
    </div>
  </article>`;
}

function bindSheetFields(sheetId) {
  const bind = (id, key, cast = (value) => value) => {
    const input = document.getElementById(id);
    input?.addEventListener('input', () => {
      const sheet = state.sheets.find((item) => item.id === sheetId);
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
  bind('fieldAge', 'age', (value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  });
  bind('fieldDescription', 'description');
  bind('fieldNotes', 'notes');

  document.getElementById('fieldType')?.addEventListener('change', (event) => {
    const sheet = state.sheets.find((item) => item.id === sheetId);
    if (!sheet) return;
    sheet.type = event.target.value;
    sheet.updatedAt = new Date().toISOString();
    state.dirty = true;
    render();
  });

  document.getElementById('fieldCampaign')?.addEventListener('change', (event) => {
    const sheet = state.sheets.find((item) => item.id === sheetId);
    if (!sheet) return;
    sheet.campaignId = event.target.value || null;
    sheet.updatedAt = new Date().toISOString();
    state.dirty = true;
    renderList();
    updateTags();
  });

  document.getElementById('fieldPlayerVisible')?.addEventListener('change', (event) => {
    const sheet = state.sheets.find((item) => item.id === sheetId);
    if (!sheet) return;
    sheet.playerVisible = event.target.checked;
    sheet.updatedAt = new Date().toISOString();
    state.dirty = true;
    updateTags();
  });

  const imageInput = document.getElementById('fieldImage');
  imageInput?.addEventListener('change', () => {
    const file = imageInput.files?.[0];
    if (!file) return;

    const validation = validateUpload(file, IMAGE_TYPES, MAX_IMAGE_SIZE, 'imagem');
    if (validation) {
      showToast(validation);
      imageInput.value = '';
      return;
    }

    const sheet = state.sheets.find((item) => item.id === sheetId);
    if (!sheet) return;

    setSheetPreviewUrl(sheet, URL.createObjectURL(file));
    sheet.pendingImageFile = file;
    sheet.updatedAt = new Date().toISOString();
    state.dirty = true;
    render();
  });

  const videoInput = document.getElementById('fieldVideo');
  videoInput?.addEventListener('change', () => {
    const file = videoInput.files?.[0];
    if (!file) return;

    const validation = validateUpload(file, VIDEO_TYPES, MAX_VIDEO_SIZE, 'video');
    if (validation) {
      showToast(validation);
      videoInput.value = '';
      return;
    }

    const sheet = state.sheets.find((item) => item.id === sheetId);
    if (!sheet) return;

    setSheetVideoPreviewUrl(sheet, URL.createObjectURL(file));
    sheet.pendingVideoFile = file;
    sheet.updatedAt = new Date().toISOString();
    state.dirty = true;
    render();
  });

  document.getElementById('saveNpcGalleryAssetBtn')?.addEventListener('click', async () => {
    const uploadInput = document.getElementById('npcGalleryUpload');
    const labelInput = document.getElementById('npcGalleryLabel');
    const file = uploadInput?.files?.[0];
    if (!file) {
      showToast('Escolha uma imagem para a galeria.');
      return;
    }

    const validation = validateUpload(file, IMAGE_TYPES, MAX_IMAGE_SIZE, 'imagem');
    if (validation) {
      showToast(validation);
      return;
    }

    try {
      const imageUrl = await uploadNpcGalleryAsset(state.sync.client, state.sync.user.id, file);
      const asset = await upsertNpcGalleryAsset(state.sync.client, {
        owner_user_id: state.sync.user.id,
        image_url: imageUrl,
        label: labelInput?.value?.trim() || null,
        tags_json: labelInput?.value?.trim() ? [labelInput.value.trim()] : null
      });
      state.npcGallery.unshift({
        ...asset,
        signedUrl: await resolveAssetUrl(asset.image_url)
      });
      render();
      showToast('Retrato salvo na galeria');
    } catch (error) {
      showToast(error?.message || 'Falha ao salvar retrato na galeria');
    }
  });

  for (const button of document.querySelectorAll('[data-pick-gallery-image]')) {
    button.addEventListener('click', async () => {
      const asset = state.npcGallery.find((item) => item.id === button.getAttribute('data-pick-gallery-image'));
      const sheet = state.sheets.find((item) => item.id === sheetId);
      if (!asset || !sheet) return;

      sheet.imagePath = asset.image_url;
      sheet.imageSignedUrl = asset.signedUrl || (await resolveAssetUrl(asset.image_url));
      releasePreviewUrl(sheet);
      sheet.pendingImageFile = null;
      sheet.updatedAt = new Date().toISOString();
      state.dirty = true;
      render();
      showToast('Retrato aplicado ao NPC');
    });
  }

  for (const skillInput of document.querySelectorAll('[data-skill-value]')) {
    skillInput.addEventListener('input', () => {
      const sheet = state.sheets.find((item) => item.id === sheetId);
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

function renderCampaign() {
  const selected = getSelectedCampaign();
  if (!selected) {
    el.viewRoot.className = 'view-root focus-view';
    el.viewRoot.innerHTML = '<article class="sheet-card"><div class="sheet-body"><p>Nenhuma campanha encontrada.</p></div></article>';
    return;
  }

  const editable = canEditCampaign(selected);
  const disabled = editable ? '' : 'disabled';
  if (selected.coverImageUrl && !selected.coverSignedUrl) {
    void ensureCampaignCoverUrl(selected);
  }
  const signedCover = selected.coverSignedUrl || selected.coverImageUrl;
  const members = state.campaignMembers[selected.id] || [];
  const campaignSheets = state.sheets.filter((sheet) => sheet.campaignId === selected.id && (isCurrentUserDm() || sheet.type !== 'npc' || sheet.playerVisible));
  const content = state.campaignContent[selected.id] || {};

  el.viewRoot.className = 'view-root';
  el.viewRoot.innerHTML = `<div class="grid-view">
    <article class="sheet-card">
      <header class="card-header">
        <h2>${escapeHtml(selected.title)}</h2>
        <div class="subtitle">Painel da campanha</div>
      </header>
      <div class="sheet-body">
        ${
          signedCover
            ? `<div class="portrait-preview" style="width:100%;max-width:none;aspect-ratio:16/7"><img src="${escapeAttribute(signedCover)}" alt="Capa"></div>`
            : ''
        }
        <div class="grid-2">
          <div class="field"><label>Titulo</label><input id="campaignTitle" value="${escapeHtml(selected.title)}" ${disabled}></div>
          <div class="field">
            <label>Status</label>
            <select id="campaignStatus" ${disabled}>
              ${['draft', 'active', 'archived']
                .map((status) => `<option value="${status}" ${selected.status === status ? 'selected' : ''}>${status}</option>`)
                .join('')}
            </select>
          </div>
        </div>
        <div class="field"><label>Resumo Publico</label><textarea id="campaignSummary" ${disabled}>${escapeHtml(selected.publicSummary)}</textarea></div>
        ${editable ? '<div class="field"><label>Capa</label><input id="campaignCoverFile" type="file" accept="image/*"></div>' : ''}
        <div class="helper">A campanha organiza fichas, pistas, documentos e pagina da tela do mestre em um unico painel mobile-first.</div>
        <div class="row">
          <button id="openMapsViewBtn" class="btn secondary" type="button">Abrir Mapas</button>
          ${isCurrentUserDm() ? '<button id="openDmScreenBtn" class="btn secondary" type="button">Abrir Tela do Mestre</button>' : ''}
        </div>
      </div>
    </article>

    <article class="sheet-card">
      <header class="card-header">
        <h2>Jogadores</h2>
        <div class="subtitle">${members.length} membros</div>
      </header>
      <div class="sheet-body">
        ${members.length ? members.map((member) => renderMemberCard(member, editable)).join('') : '<p class="muted">Nenhum membro registrado.</p>'}
        ${
          editable
            ? `<div class="section">
          <h3>Adicionar jogador</h3>
          <div class="grid-2">
            <div class="field"><label>User ID</label><input id="newMemberUserId" placeholder="uuid do usuario"></div>
            <div class="field">
              <label>Papel</label>
              <select id="newMemberRole">
                <option value="player">player</option>
                <option value="dm">dm</option>
              </select>
            </div>
          </div>
          <button id="addMemberBtn" class="btn ok" type="button">Adicionar membro</button>
        </div>`
            : ''
        }
      </div>
    </article>

    <article class="sheet-card">
      <header class="card-header">
        <h2>Galeria</h2>
        <div class="subtitle">${campaignSheets.length} personagens vinculados</div>
      </header>
      <div class="sheet-body">
        ${
          campaignSheets.length
            ? `<div class="grid-2">${campaignSheets.map((sheet) => renderGalleryCard(sheet)).join('')}</div>`
            : '<p class="muted">Nenhuma ficha vinculada a esta campanha.</p>'
        }
      </div>
    </article>

    ${CONTENT_DEFINITIONS.map((definition) => renderContentSection(selected.id, definition, content[definition.table] || [], editable)).join('')}
  </div>`;

  bindCampaignFields(selected.id);
}

function renderDmScreen() {
  const campaign = getSelectedCampaign();
  if (!campaign) {
    state.campaignMode = CAMPAIGN_MODE_DASHBOARD;
    renderCampaign();
    return;
  }

  const pages = getSortedDmScreenPages(campaign.id);
  const page = pages.find((item) => item.id === state.selectedDmScreenPageId) || pages[0] || null;
  if (!page && state.selectedDmScreenPageId !== null) {
    state.selectedDmScreenPageId = null;
  }

  el.viewRoot.className = 'view-root focus-view';
  el.viewRoot.innerHTML = `<article class="sheet-card" style="width:min(1380px,100%)">
    <header class="card-header">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div>
          <h2>${escapeHtml(campaign.title)}</h2>
          <div class="subtitle">Tela do Mestre</div>
        </div>
        <button id="backToCampaignBtn" class="btn secondary" type="button">Voltar ao painel</button>
      </div>
    </header>
    <div class="sheet-body">
      ${
        pages.length
          ? `<div class="row">${pages
              .map(
                (item) =>
                  `<button class="btn ${item.id === page?.id ? 'ok' : 'secondary'}" type="button" data-open-dm-page="${escapeAttribute(item.id)}">${escapeHtml(item.title)}</button>`
              )
              .join('')}</div>`
          : '<p class="muted">Nenhuma pagina cadastrada. Crie uma em Campanhas > Tela do Mestre.</p>'
      }
      ${
        page
          ? `<section class="section">
          <div class="row" style="justify-content:space-between;align-items:flex-start">
            <div>
              <h3>${escapeHtml(page.title)}</h3>
              <div class="helper">${escapeHtml(page.content_type || 'markdown')} · ordem ${Number(page.sort_order || 0)}</div>
            </div>
          </div>
          ${renderDmScreenPageBody(page, campaign.id)}
        </section>`
          : ''
      }
    </div>
  </article>`;

  document.getElementById('backToCampaignBtn')?.addEventListener('click', () => {
    state.campaignMode = CAMPAIGN_MODE_DASHBOARD;
    render();
  });

  for (const button of document.querySelectorAll('[data-open-dm-page]')) {
    button.addEventListener('click', () => {
      state.selectedDmScreenPageId = button.getAttribute('data-open-dm-page');
      render();
    });
  }
}

function renderCampaignMaps() {
  const campaign = getSelectedCampaign();
  if (!campaign) {
    state.campaignMode = CAMPAIGN_MODE_DASHBOARD;
    renderCampaign();
    return;
  }

  const maps = getCampaignMaps(campaign.id);
  const selectedMap = maps.find((row) => row.id === state.selectedMapId) || maps[0] || null;
  if (selectedMap && state.selectedMapId !== selectedMap.id) {
    state.selectedMapId = selectedMap.id;
  }

  el.viewRoot.className = 'view-root focus-view';
  el.viewRoot.innerHTML = `<article class="sheet-card" style="width:min(1380px,100%)">
    <header class="card-header">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <div>
          <h2>${escapeHtml(campaign.title)}</h2>
          <div class="subtitle">Mapas da Campanha</div>
        </div>
        <button id="backToCampaignMapsBtn" class="btn secondary" type="button">Voltar ao painel</button>
      </div>
    </header>
    <div class="sheet-body">
      ${
        maps.length
          ? `<div class="row">${maps
              .map(
                (row) =>
                  `<button class="btn ${row.id === selectedMap?.id ? 'ok' : 'secondary'}" type="button" data-open-map-view="${escapeAttribute(row.id)}">${escapeHtml(row.title)}</button>`
              )
              .join('')}</div>`
          : '<p class="muted">Nenhum mapa compartilhado nesta campanha.</p>'
      }
      ${
        selectedMap
          ? `<section class="section">
          <h3>${escapeHtml(selectedMap.title)}</h3>
          <div class="helper">${escapeHtml(selectedMap.description || 'Sem descricao')}</div>
          ${renderMapDetail(selectedMap, true)}
        </section>`
          : ''
      }
    </div>
  </article>`;

  document.getElementById('backToCampaignMapsBtn')?.addEventListener('click', () => {
    state.campaignMode = CAMPAIGN_MODE_DASHBOARD;
    render();
  });

  for (const button of document.querySelectorAll('[data-open-map-view]')) {
    button.addEventListener('click', () => {
      state.selectedMapId = button.getAttribute('data-open-map-view');
      render();
    });
  }
}

function renderDmScreenPageBody(page, campaignId) {
  if (page.content_type === 'npc list reference') {
    const visibleSheets = state.sheets.filter((sheet) => sheet.campaignId === campaignId);
    return visibleSheets.length
      ? `<div class="grid-2">${visibleSheets.map((sheet) => renderGalleryCard(sheet)).join('')}</div>`
      : '<p class="muted">Nenhum NPC ou personagem vinculado.</p>';
  }

  if (page.content_type === 'clue list reference') {
    const clues = state.campaignContent[campaignId]?.clues || [];
    return clues.length
      ? clues
          .map(
            (clue) => `<div class="section">
            <strong>${escapeHtml(clue.title)}</strong>
            <div class="helper">${escapeHtml(clue.status || 'hidden')}</div>
            <div>${escapeHtml(clue.description || '')}</div>
          </div>`
          )
          .join('')
      : '<p class="muted">Nenhuma pista cadastrada.</p>';
  }

  if (page.content_type === 'markdown') {
    return `<div class="section">${renderMarkdown(page.content_json_or_text || '')}</div>`;
  }

  return `<div style="white-space:pre-wrap;font-size:1.05rem;line-height:1.7">${escapeHtml(page.content_json_or_text || '')}</div>`;
}

function renderMemberCard(member, editable) {
  return `<div class="section">
    <div class="row" style="justify-content:space-between;align-items:flex-start">
      <div>
        <div><strong>${escapeHtml(member.user_id)}</strong></div>
        <div class="helper">${escapeHtml(member.role)}</div>
      </div>
      ${editable ? `<button class="btn danger" data-remove-member="${escapeAttribute(member.id)}" type="button">Remover</button>` : ''}
    </div>
  </div>`;
}

function renderGalleryCard(sheet) {
  if (sheet.imagePath && !sheet.imageSignedUrl && !sheet.imagePreviewUrl) {
    void ensureSheetMediaUrls(sheet);
  }
  const image = sheet.imagePreviewUrl || sheet.imageSignedUrl;
  return `<button class="section" type="button" data-open-sheet="${escapeAttribute(sheet.id)}" style="text-align:left">
    <div class="row">
      <div class="portrait-preview" style="width:92px;aspect-ratio:3/4;flex:none">${image ? `<img src="${escapeAttribute(image)}" alt="">` : '<span>Sem retrato</span>'}</div>
      <div>
        <h3>${escapeHtml(sheet.name)}</h3>
        <div class="helper">${sheet.type === 'npc' ? 'NPC' : 'Investigador'}</div>
        <div class="small">${escapeHtml(sheet.description || sheet.occupation || 'Sem resumo')}</div>
      </div>
    </div>
  </button>`;
}

function renderContentSection(campaignId, definition, rows, editable) {
  return `<article class="sheet-card">
    <header class="card-header">
      <h2>${escapeHtml(definition.label)}</h2>
      <div class="subtitle">${rows.length} registros</div>
    </header>
    <div class="sheet-body">
      ${
        rows.length
          ? rows
              .map((row) => {
                const body = row[definition.bodyKey] || '';
                const fileValue = row.file_url || row.image_url || '';
                return `<div class="section">
                  <div class="row" style="justify-content:space-between;align-items:flex-start">
                    <div>
                      <h3>${escapeHtml(row.title)}</h3>
                      <div class="helper">${escapeHtml(row.visibility || 'dm_only')}</div>
                    </div>
                    ${editable ? `<button class="btn danger" type="button" data-delete-content="${definition.table}:${row.id}">Excluir</button>` : ''}
                  </div>
                  ${definition.supportsType && row.content_type ? `<div class="helper">${escapeHtml(row.content_type)}</div>` : ''}
                  ${definition.supportsType && row.type ? `<div class="helper">${escapeHtml(row.type)}</div>` : ''}
                  ${definition.supportsSort ? `<div class="helper">Ordem: ${Number(row.sort_order || 0)}</div>` : ''}
                  ${definition.supportsStatus && row.status ? `<div class="helper">Status: ${escapeHtml(row.status)}</div>` : ''}
                  ${renderContentAttachment(definition, row, fileValue)}
                  ${renderContentBody(definition, row, body)}
                </div>`;
              })
              .join('')
          : '<p class="muted">Nada compartilhado ainda.</p>'
      }
      ${
        editable
          ? renderContentForm(campaignId, definition)
          : ''
      }
    </div>
  </article>`;
}

function renderContentForm(campaignId, definition) {
  return `<div class="section">
    <h3>Novo item</h3>
    <div class="field"><label>Titulo</label><input data-content-title="${definition.table}" placeholder="Titulo"></div>
    ${
      definition.supportsType
        ? `<div class="field">
      <label>${escapeHtml(definition.typeLabel || 'Tipo')}</label>
      <select data-content-type="${definition.table}">
        ${(definition.typeOptions || ['event']).map((value) => `<option value="${escapeAttribute(value)}">${escapeHtml(value)}</option>`).join('')}
      </select>
    </div>`
        : ''
    }
    ${
      definition.supportsStatus
        ? `<div class="field">
      <label>Status</label>
      <select data-content-status="${definition.table}">
        <option value="hidden">hidden</option>
        <option value="available">available</option>
        <option value="found">found</option>
      </select>
    </div>`
        : ''
    }
    ${
      definition.supportsSort
        ? `<div class="field"><label>Ordem</label><input data-content-sort="${definition.table}" type="number" value="0"></div>`
        : ''
    }
    <div class="field">
      <label>Visibilidade</label>
      <select data-content-visibility="${definition.table}">
        <option value="dm_only">dm_only</option>
        <option value="shared_all">shared_all</option>
        <option value="shared_player">shared_player</option>
      </select>
    </div>
    <div class="field"><label>Compartilhar com user_id</label><input data-content-shared="${definition.table}" placeholder="Opcional para shared_player"></div>
    ${
      definition.supportsFile
        ? `<div class="field"><label>${escapeHtml(definition.fileLabel || 'URL ou arquivo')}</label><input data-content-file="${definition.table}" placeholder="URL publica opcional"></div>
        <div class="field"><label>Upload</label><input data-content-upload="${definition.table}" type="file" accept="${escapeAttribute(getContentFileAccept(definition.table))}"></div>`
        : ''
    }
    <div class="field"><label>${escapeHtml(definition.bodyLabel)}</label><textarea data-content-body="${definition.table}" placeholder="Conteudo"></textarea></div>
    <button class="btn ok" type="button" data-save-content="${definition.table}" data-campaign-id="${escapeAttribute(campaignId)}">Salvar item</button>
  </div>`;
}

function bindCampaignFields(campaignId) {
  const campaign = state.campaigns.find((item) => item.id === campaignId);
  if (!campaign) return;

  const bind = (id, key) => {
    document.getElementById(id)?.addEventListener('input', (event) => {
      campaign[key] = event.target.value;
      campaign.updatedAt = new Date().toISOString();
      state.campaignDirty = true;
      updateTags();
    });
  };

  bind('campaignTitle', 'title');
  bind('campaignSummary', 'publicSummary');

  document.getElementById('campaignStatus')?.addEventListener('change', (event) => {
    campaign.status = event.target.value;
    campaign.updatedAt = new Date().toISOString();
    state.campaignDirty = true;
    updateTags();
  });

  document.getElementById('campaignCoverFile')?.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateUpload(file, IMAGE_TYPES, MAX_IMAGE_SIZE, 'imagem');
    if (validation) {
      showToast(validation);
      event.target.value = '';
      return;
    }

    campaign.pendingCoverFile = file;
    campaign.updatedAt = new Date().toISOString();
    state.campaignDirty = true;
    updateTags();
  });

  document.getElementById('openDmScreenBtn')?.addEventListener('click', () => {
    state.campaignMode = CAMPAIGN_MODE_DM_SCREEN;
    ensureSelectedDmScreenPage();
    render();
  });

  document.getElementById('openMapsViewBtn')?.addEventListener('click', () => {
    state.campaignMode = CAMPAIGN_MODE_MAPS;
    ensureSelectedMap();
    render();
  });

  document.getElementById('addMemberBtn')?.addEventListener('click', async () => {
    const userId = document.getElementById('newMemberUserId')?.value?.trim();
    const role = document.getElementById('newMemberRole')?.value || 'player';
    if (!userId) {
      showToast('Informe o user ID do membro.');
      return;
    }

    try {
      const member = await upsertCampaignMember(state.sync.client, {
        campaign_id: campaignId,
        user_id: userId,
        role
      });
      state.campaignMembers[campaignId] = mergeRow(state.campaignMembers[campaignId] || [], member);
      render();
      showToast('Membro atualizado');
    } catch (error) {
      showToast(error?.message || 'Falha ao adicionar membro');
    }
  });

  for (const button of document.querySelectorAll('[data-remove-member]')) {
    button.addEventListener('click', async () => {
      try {
        await removeCampaignMember(state.sync.client, button.getAttribute('data-remove-member'));
        state.campaignMembers[campaignId] = (state.campaignMembers[campaignId] || []).filter(
          (member) => member.id !== button.getAttribute('data-remove-member')
        );
        render();
        showToast('Membro removido');
      } catch (error) {
        showToast(error?.message || 'Falha ao remover membro');
      }
    });
  }

  for (const button of document.querySelectorAll('[data-open-sheet]')) {
    button.addEventListener('click', () => {
      state.view = VIEW_SHEETS;
      state.selectedId = button.getAttribute('data-open-sheet');
      render();
    });
  }

  for (const button of document.querySelectorAll('[data-save-content]')) {
    button.addEventListener('click', async () => {
      const table = button.getAttribute('data-save-content');
      const definition = CONTENT_DEFINITIONS.find((item) => item.table === table);
      if (!definition) return;

      const title = document.querySelector(`[data-content-title="${table}"]`)?.value?.trim() || '';
      const body = document.querySelector(`[data-content-body="${table}"]`)?.value || '';
      const visibility = document.querySelector(`[data-content-visibility="${table}"]`)?.value || 'dm_only';
      const sharedUser = document.querySelector(`[data-content-shared="${table}"]`)?.value?.trim() || null;
      const fileValue = document.querySelector(`[data-content-file="${table}"]`)?.value?.trim() || null;
      const uploadFile = document.querySelector(`[data-content-upload="${table}"]`)?.files?.[0] || null;
      const typeValue = document.querySelector(`[data-content-type="${table}"]`)?.value || null;
      const statusValue = document.querySelector(`[data-content-status="${table}"]`)?.value || null;
      const sortValue = Number(document.querySelector(`[data-content-sort="${table}"]`)?.value || '0');

      if (!title) {
        showToast('Titulo obrigatorio.');
        return;
      }
      if (visibility === 'shared_player' && !sharedUser) {
        showToast('shared_player exige user_id especifico.');
        return;
      }

      const payload = {
        campaign_id: campaignId,
        title,
        visibility,
        shared_with_user_id: visibility === 'shared_player' ? sharedUser : null,
        [definition.bodyKey]: body
      };

      let resolvedFileValue = fileValue;
      if (uploadFile) {
        const uploadValidation = validateCampaignContentUpload(table, uploadFile);
        if (uploadValidation) {
          showToast(uploadValidation);
          return;
        }

        try {
          resolvedFileValue = await uploadCampaignAsset(state.sync.client, campaignId, uploadFile, table);
        } catch (error) {
          showToast(error?.message || 'Falha ao enviar arquivo');
          return;
        }
      }

      if (table === 'timeline_entries') {
        payload.event_type = typeValue || 'event';
        payload.event_date = null;
        payload.date_label = null;
      }
      if (table === 'clues') {
        if (resolvedFileValue && isImagePath(resolvedFileValue)) {
          payload.image_url = resolvedFileValue;
          payload.file_url = null;
        } else {
          payload.file_url = resolvedFileValue;
          payload.image_url = null;
        }
        payload.status = statusValue || 'hidden';
      }
      if (table === 'handouts') {
        payload.type = typeValue || 'markdown';
        payload.file_url = resolvedFileValue;
      }
      if (table === 'maps') {
        payload.image_url = resolvedFileValue || '';
      }
      if (table === 'dm_screen_pages') {
        payload.content_type = typeValue || 'markdown';
        payload.sort_order = Number.isFinite(sortValue) ? sortValue : 0;
      }

      try {
        const row = await upsertCampaignContentRow(state.sync.client, table, payload);
        if (!state.campaignContent[campaignId]) state.campaignContent[campaignId] = {};
        state.campaignContent[campaignId][table] = mergeRow(state.campaignContent[campaignId][table] || [], row);
        if (table === 'maps') {
          state.mapPins[row.id] = state.mapPins[row.id] || [];
        }
        if (table === 'dm_screen_pages') {
          ensureSelectedDmScreenPage();
        }
        render();
        showToast('Item salvo');
      } catch (error) {
        showToast(error?.message || 'Falha ao salvar item');
      }
    });
  }

  for (const button of document.querySelectorAll('[data-delete-content]')) {
    button.addEventListener('click', async () => {
      const [table, rowId] = button.getAttribute('data-delete-content').split(':');
      try {
        if (table === 'clues' || table === 'handouts') {
          const current = (state.campaignContent[campaignId][table] || []).find((row) => row.id === rowId);
          if (!current) return;
          try {
            const archived = await upsertCampaignContentRow(state.sync.client, table, {
              ...current,
              archived_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            state.campaignContent[campaignId][table] = (state.campaignContent[campaignId][table] || []).filter((row) => row.id !== archived.id);
            render();
            showToast('Item arquivado');
            return;
          } catch (error) {
            if (!isMissingColumnError(error, 'archived_at')) {
              throw error;
            }
            await deleteCampaignContentRow(state.sync.client, table, rowId);
            state.campaignContent[campaignId][table] = (state.campaignContent[campaignId][table] || []).filter((row) => row.id !== rowId);
            render();
            showToast('Item removido. A migracao de arquivo ainda nao foi aplicada.');
            return;
          }
        }

        await deleteCampaignContentRow(state.sync.client, table, rowId);
        state.campaignContent[campaignId][table] = (state.campaignContent[campaignId][table] || []).filter((row) => row.id !== rowId);
        render();
        showToast('Item removido');
      } catch (error) {
        showToast(error?.message || 'Falha ao remover item');
      }
    });
  }

  for (const button of document.querySelectorAll('[data-save-pin]')) {
    button.addEventListener('click', async () => {
      const mapId = button.getAttribute('data-save-pin');
      const label = document.querySelector(`[data-pin-label="${mapId}"]`)?.value?.trim() || '';
      const xValue = Number(document.querySelector(`[data-pin-x="${mapId}"]`)?.value || '');
      const yValue = Number(document.querySelector(`[data-pin-y="${mapId}"]`)?.value || '');
      const description = document.querySelector(`[data-pin-description="${mapId}"]`)?.value?.trim() || null;
      const visibility = document.querySelector(`[data-pin-visibility="${mapId}"]`)?.value || 'dm_only';
      const sharedUser = document.querySelector(`[data-pin-shared="${mapId}"]`)?.value?.trim() || null;

      if (!label || !Number.isFinite(xValue) || !Number.isFinite(yValue)) {
        showToast('Informe rótulo e coordenadas do pino.');
        return;
      }
      if (visibility === 'shared_player' && !sharedUser) {
        showToast('shared_player exige user_id especifico.');
        return;
      }

      try {
        const pin = await upsertMapPin(state.sync.client, {
          map_id: mapId,
          label,
          x_position: Math.max(0, Math.min(100, xValue)),
          y_position: Math.max(0, Math.min(100, yValue)),
          description,
          visibility,
          shared_with_user_id: visibility === 'shared_player' ? sharedUser : null
        });
        state.mapPins[mapId] = mergeRow(state.mapPins[mapId] || [], pin);
        render();
        showToast('Pino salvo');
      } catch (error) {
        showToast(error?.message || 'Falha ao salvar pino');
      }
    });
  }

  for (const button of document.querySelectorAll('[data-delete-pin]')) {
    button.addEventListener('click', async () => {
      const [mapId, pinId] = button.getAttribute('data-delete-pin').split(':');
      try {
        await deleteMapPin(state.sync.client, pinId);
        state.mapPins[mapId] = (state.mapPins[mapId] || []).filter((pin) => pin.id !== pinId);
        render();
        showToast('Pino removido');
      } catch (error) {
        showToast(error?.message || 'Falha ao remover pino');
      }
    });
  }
}

function renderContentAttachment(definition, row, fileValue) {
  if (definition.table === 'maps') {
    return '';
  }
  const signedUrl = row._signedFileUrl || row._signedImageUrl || null;
  const resolvedUrl = signedUrl || fileValue;
  if (fileValue && !signedUrl && !/^https?:\/\//i.test(fileValue)) {
    void ensureContentAssetUrl(row, fileValue);
  }
  if (!resolvedUrl) {
    return '';
  }
  if (isImagePath(fileValue)) {
    return `<div class="portrait-preview" style="width:100%;max-width:none;aspect-ratio:16/9;margin:10px 0"><img src="${escapeAttribute(resolvedUrl)}" alt=""></div>`;
  }
  if (isPdfPath(fileValue)) {
    return `<div class="helper"><a href="${escapeAttribute(resolvedUrl)}" target="_blank" rel="noreferrer">Abrir PDF</a></div>`;
  }
  return `<div class="helper"><a href="${escapeAttribute(resolvedUrl)}" target="_blank" rel="noreferrer">Abrir arquivo</a></div>`;
}

function renderContentBody(definition, row, body) {
  if (definition.table === 'markdown_documents' || (definition.table === 'handouts' && row.type === 'markdown')) {
    return `<div class="section">${renderMarkdown(body)}</div>`;
  }
  if (definition.table === 'relationship_diagrams') {
    return renderMermaidCard(body);
  }
  if (definition.table === 'maps') {
    return renderMapDetail(row);
  }
  if (definition.table === 'dm_screen_pages' && row.content_type === 'markdown') {
    return `<div class="section">${renderMarkdown(body)}</div>`;
  }
  return `<div style="white-space:pre-wrap">${escapeHtml(body)}</div>`;
}

function renderMapDetail(mapRow, expanded = false) {
  const pins = state.mapPins[mapRow.id] || [];
  const imageUrl = mapRow._signedImageUrl || mapRow.image_url || '';
  if (mapRow.image_url && !mapRow._signedImageUrl && !/^https?:\/\//i.test(mapRow.image_url)) {
    void ensureContentAssetUrl(mapRow, mapRow.image_url);
  }

  return `<div class="section">
    ${imageUrl ? renderMapCanvas(imageUrl, pins, expanded) : '<div class="helper">Envie uma imagem para visualizar o mapa.</div>'}
    ${pins.length ? `<div class="grid-2">${pins.map((pin) => renderPinCard(mapRow.id, pin)).join('')}</div>` : '<p class="muted">Nenhum pino neste mapa.</p>'}
    ${
      isCurrentUserDm() && !expanded
        ? `<div class="divider"></div>
      <h3>Novo pino</h3>
      <div class="grid-2">
        <div class="field"><label>Rótulo</label><input data-pin-label="${mapRow.id}" placeholder="Ex.: Biblioteca"></div>
        <div class="field"><label>Descrição</label><input data-pin-description="${mapRow.id}" placeholder="Opcional"></div>
        <div class="field"><label>X (%)</label><input data-pin-x="${mapRow.id}" type="number" min="0" max="100" step="0.1" placeholder="50"></div>
        <div class="field"><label>Y (%)</label><input data-pin-y="${mapRow.id}" type="number" min="0" max="100" step="0.1" placeholder="50"></div>
        <div class="field">
          <label>Visibilidade</label>
          <select data-pin-visibility="${mapRow.id}">
            <option value="dm_only">dm_only</option>
            <option value="shared_all">shared_all</option>
            <option value="shared_player">shared_player</option>
          </select>
        </div>
        <div class="field"><label>shared_with_user_id</label><input data-pin-shared="${mapRow.id}" placeholder="Obrigatório para shared_player"></div>
      </div>
      <button class="btn ok" type="button" data-save-pin="${escapeAttribute(mapRow.id)}">Salvar pino</button>`
        : ''
    }
  </div>`;
}

function renderMapCanvas(imageUrl, pins, expanded = false) {
  return `<div style="position:relative;border-radius:14px;overflow:hidden;border:1px solid rgba(195,167,108,.14);margin-bottom:12px">
    <img src="${escapeAttribute(imageUrl)}" alt="Mapa" style="display:block;width:100%;height:auto;max-height:${expanded ? '78vh' : 'none'};object-fit:${expanded ? 'contain' : 'cover'};background:#0f0d0a">
    ${pins
      .map(
        (pin) => `<div title="${escapeAttribute(pin.label)}" style="position:absolute;left:${Number(pin.x_position)}%;top:${Number(pin.y_position)}%;transform:translate(-50%,-50%);min-width:18px;height:18px;border-radius:999px;background:#c3a76c;border:2px solid #1f1b16;box-shadow:0 2px 8px rgba(0,0,0,.4);padding:0 6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#1f1b16;font-weight:700">${expanded ? escapeHtml(pin.label.slice(0, 1).toUpperCase()) : ''}</div>`
      )
      .join('')}
  </div>`;
}

function renderPinCard(mapId, pin) {
  return `<div class="stat">
    <div class="stat-head">
      <strong>${escapeHtml(pin.label)}</strong>
      ${isCurrentUserDm() ? `<button class="btn danger" type="button" data-delete-pin="${escapeAttribute(mapId)}:${escapeAttribute(pin.id)}">Excluir</button>` : ''}
    </div>
    <div class="helper">${escapeHtml(pin.visibility)}</div>
    <div class="helper">X ${Number(pin.x_position).toFixed(1)}% · Y ${Number(pin.y_position).toFixed(1)}%</div>
    ${pin.description ? `<div class="small">${escapeHtml(pin.description)}</div>` : ''}
  </div>`;
}

function renderMarkdown(source) {
  const text = escapeHtml(String(source || '').replace(/\r\n/g, '\n').trim());
  if (!text) {
    return '<p class="muted">Documento vazio.</p>';
  }

  const html = text
    .replace(/```([\s\S]*?)```/g, (_, block) => `<pre><code>${escapeHtml(block.trim())}</code></pre>`)
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.*)$/gm, '<li>$1</li>');

  const paragraphs = html
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      if (/^<h\d|^<pre|^<li>/.test(chunk)) {
        return chunk.startsWith('<li>') ? `<ul>${chunk}</ul>` : chunk;
      }
      return `<p>${chunk.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  return paragraphs;
}

function renderMermaidCard(source) {
  const graph = parseMermaidGraph(source);
  if (!graph) {
    return `<div style="white-space:pre-wrap">${escapeHtml(source || 'Sem diagrama')}</div>`;
  }

  return `<div class="section">
    <div class="helper">Renderizacao Mermaid para grafos simples.</div>
    ${renderMermaidSvg(graph)}
    <details class="section" style="margin-top:10px">
      <summary>Fonte Mermaid</summary>
      <div style="white-space:pre-wrap;margin-top:10px">${escapeHtml(source)}</div>
    </details>
  </div>`;
}

function parseMermaidGraph(source) {
  const lines = String(source || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return null;

  const header = lines[0].match(/^graph\s+(TD|TB|LR|RL)$/i);
  const direction = header ? header[1].toUpperCase() : 'TD';
  const bodyLines = header ? lines.slice(1) : lines;
  const edges = [];
  const nodeSet = new Set();

  for (const line of bodyLines) {
    const match = line.match(/^(.+?)\s*(-->|---|==>)\s*(.+)$/);
    if (!match) continue;
    const from = normalizeMermaidNode(match[1]);
    const to = normalizeMermaidNode(match[3]);
    if (!from || !to) continue;
    nodeSet.add(from.id);
    nodeSet.add(to.id);
    edges.push({ from: from.id, to: to.id, fromLabel: from.label, toLabel: to.label, arrow: match[2] });
  }

  if (!edges.length || !nodeSet.size) return null;

  const labels = {};
  for (const edge of edges) {
    labels[edge.from] = edge.fromLabel;
    labels[edge.to] = edge.toLabel;
  }

  return {
    direction,
    nodes: [...nodeSet].map((id) => ({ id, label: labels[id] || id })),
    edges
  };
}

function normalizeMermaidNode(rawValue) {
  const raw = String(rawValue || '').trim();
  if (!raw) return null;
  const bracketMatch = raw.match(/^([A-Za-z0-9_]+)\[(.+)\]$/) || raw.match(/^([A-Za-z0-9_]+)\((.+)\)$/);
  if (bracketMatch) {
    return { id: bracketMatch[1], label: bracketMatch[2].trim() };
  }
  return { id: raw.replace(/\s+/g, '_'), label: raw.replace(/_/g, ' ') };
}

function renderMermaidSvg(graph) {
  const horizontal = graph.direction === 'LR' || graph.direction === 'RL';
  const nodeWidth = 170;
  const nodeHeight = 56;
  const gap = 36;
  const padding = 24;
  const positions = graph.nodes.map((node, index) => ({
    ...node,
    x: horizontal ? padding + index * (nodeWidth + gap) : padding,
    y: horizontal ? padding : padding + index * (nodeHeight + gap)
  }));

  const width = horizontal ? padding * 2 + positions.length * nodeWidth + Math.max(0, positions.length - 1) * gap : nodeWidth + padding * 2;
  const height = horizontal ? nodeHeight + padding * 2 : padding * 2 + positions.length * nodeHeight + Math.max(0, positions.length - 1) * gap;
  const byId = new Map(positions.map((node) => [node.id, node]));

  const lines = graph.edges
    .map((edge) => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);
      if (!from || !to) return '';
      const x1 = horizontal ? from.x + nodeWidth : from.x + nodeWidth / 2;
      const y1 = horizontal ? from.y + nodeHeight / 2 : from.y + nodeHeight;
      const x2 = horizontal ? to.x : to.x + nodeWidth / 2;
      const y2 = horizontal ? to.y + nodeHeight / 2 : to.y;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#c3a76c" stroke-width="3" marker-end="url(#arrow)" />`;
    })
    .join('');

  const nodes = positions
    .map(
      (node) => `<g>
      <rect x="${node.x}" y="${node.y}" width="${nodeWidth}" height="${nodeHeight}" rx="14" fill="#221d16" stroke="#8e7754" stroke-width="2"></rect>
      <text x="${node.x + nodeWidth / 2}" y="${node.y + nodeHeight / 2 + 5}" text-anchor="middle" fill="#eadfc8" font-family="Georgia, serif" font-size="14">${escapeHtml(
        truncateMermaidLabel(node.label)
      )}</text>
    </g>`
    )
    .join('');

  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:auto;border:1px solid rgba(195,167,108,.12);border-radius:14px;background:#17130f">
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#c3a76c"></path>
      </marker>
    </defs>
    ${lines}
    ${nodes}
  </svg>`;
}

function truncateMermaidLabel(label) {
  const value = String(label || '');
  return value.length > 18 ? `${value.slice(0, 16)}..` : value;
}

function getContentFileAccept(table) {
  if (table === 'maps') return 'image/*';
  if (table === 'clues') return 'image/*,.pdf,application/pdf';
  if (table === 'handouts') return 'image/*,.pdf,application/pdf,text/plain,.md,text/markdown';
  return '*/*';
}

function validateCampaignContentUpload(table, file) {
  if (table === 'maps') {
    return validateUpload(file, IMAGE_TYPES, MAX_IMAGE_SIZE, 'imagem');
  }
  return validateUpload(file, DOCUMENT_TYPES, MAX_DOCUMENT_SIZE, 'arquivo');
}

async function ensureContentAssetUrl(row, assetPath) {
  try {
    const signedUrl = await resolveAssetUrl(assetPath);
    if (!signedUrl) return;
    if (row.image_url === assetPath) {
      row._signedImageUrl = signedUrl;
    }
    if (row.file_url === assetPath) {
      row._signedFileUrl = signedUrl;
    }
    render();
  } catch {}
}

async function resolveAssetUrl(assetPath) {
  if (!assetPath) return null;
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  return createSignedAssetUrl(state.sync.client, campaignAssetBucket(), assetPath, 3600);
}

function isImagePath(value) {
  return /\.(png|jpe?g|webp|gif)$/i.test(String(value || '')) || /^data:image\//i.test(String(value || ''));
}

function isPdfPath(value) {
  return /\.pdf$/i.test(String(value || ''));
}

function formatGalleryTags(tagsJson) {
  if (Array.isArray(tagsJson)) {
    return tagsJson.map((value) => String(value)).join(', ') || 'Sem tags';
  }
  return 'Sem tags';
}

async function saveSelectedSheet(successMessage = 'Ficha salva', propagateError = false) {
  const selected = getSelectedSheet();
  if (!selected || !canEditSheet(selected)) return;

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

    if (selected.pendingVideoFile) {
      const videoPath = await uploadSheetMedia(
        state.sync.client,
        refreshed.ownerId || state.sync.user.id,
        refreshed.id,
        selected.pendingVideoFile
      );
      refreshed.introVideoUrl = videoPath;
      refreshed = deserializeSheet(
        await upsertCharacterSheet(state.sync.client, {
          ...serializeSheet(refreshed, state.sync.user.id),
          intro_video_url: videoPath
        })
      );
      selected.pendingVideoFile = null;
    }

    const index = state.sheets.findIndex((item) => item.id === refreshed.id);
    if (index >= 0) {
      releasePreviewUrl(state.sheets[index]);
      releaseVideoPreviewUrl(state.sheets[index]);
      state.sheets[index] = refreshed;
    } else {
      state.sheets.unshift(refreshed);
      state.selectedId = refreshed.id;
    }

    await ensureSheetMediaUrls(refreshed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.sheets));
    state.dirty = false;
    showToast(successMessage);
    render();
  } catch (error) {
    showToast(error?.message || 'Falha ao salvar');
    if (propagateError) {
      throw error;
    }
  }
}

async function saveSelectedCampaign() {
  const selected = getSelectedCampaign();
  if (!selected || !canEditCampaign(selected)) return;

  try {
    let coverImageUrl = selected.coverImageUrl || null;

    if (selected.pendingCoverFile) {
      coverImageUrl = await uploadCampaignAsset(state.sync.client, selected.id, selected.pendingCoverFile, 'cover');
      selected.pendingCoverFile = null;
    }

    const payload = {
      id: selected.id,
      owner_user_id: selected.ownerUserId || state.sync.user.id,
      title: selected.title,
      public_summary: selected.publicSummary,
      cover_image_url: coverImageUrl,
      status: selected.status
    };

    const refreshed = deserializeCampaign(await upsertCampaign(state.sync.client, payload));
    const index = state.campaigns.findIndex((item) => item.id === refreshed.id);
    if (index >= 0) {
      state.campaigns[index] = refreshed;
    } else {
      state.campaigns.unshift(refreshed);
    }

    state.selectedCampaignId = refreshed.id;
    state.campaignDirty = false;
    await ensureCampaignCoverUrl(refreshed);
    showToast('Campanha salva');
    render();
  } catch (error) {
    showToast(error?.message || 'Falha ao salvar campanha');
  }
}

function applyRoleVisibility() {
  if (el.searchContainer) {
    el.searchContainer.classList.toggle('hidden', false);
  }

  if (!isCurrentUserDm()) {
    el.importBtn?.classList.add('hidden');
    el.exportAllBtn?.classList.add('hidden');
  }
}

function updateActionVisibility() {
  const selected = getSelectedSheet();
  const selectedCampaign = getSelectedCampaign();
  const editingSheet = state.view === VIEW_SHEETS;
  const editingCampaignDashboard = state.view === VIEW_CAMPAIGNS && state.campaignMode === CAMPAIGN_MODE_DASHBOARD;

  if (el.saveSheetBtn) {
    el.saveSheetBtn.classList.toggle('hidden', !editingSheet && !editingCampaignDashboard);
    el.saveSheetBtn.disabled = editingSheet
      ? !canEditSheet(selected) || !state.dirty
      : !canEditCampaign(selectedCampaign) || !state.campaignDirty;
  }
  if (el.exportPdfBtn) {
    el.exportPdfBtn.classList.toggle('hidden', !editingSheet);
    el.exportPdfBtn.disabled = !editingSheet || !selected;
  }
  if (el.toggleActiveBtn) {
    el.toggleActiveBtn.classList.toggle('hidden', !editingSheet || !isCurrentUserDm());
    el.toggleActiveBtn.disabled = !(editingSheet && isCurrentUserDm() && selected);
    if (selected) {
      el.toggleActiveBtn.textContent = selected.isActive ? 'Inativar' : 'Ativar';
    }
  }
  if (el.duplicateBtn) {
    el.duplicateBtn.classList.toggle('hidden', !editingSheet);
    el.duplicateBtn.disabled = !isCurrentUserDm();
  }
  if (el.deleteBtn) {
    el.deleteBtn.classList.toggle('hidden', !editingSheet);
    el.deleteBtn.disabled = !editingSheet || !canEditSheet(selected);
  }
}

function getSelectedSheet() {
  return state.sheets.find((sheet) => sheet.id === state.selectedId) || null;
}

function getSelectedCampaign() {
  return state.campaigns.find((campaign) => campaign.id === state.selectedCampaignId) || null;
}

function getSortedDmScreenPages(campaignId) {
  return [...(state.campaignContent[campaignId]?.dm_screen_pages || [])].sort((left, right) => {
    const sortDelta = Number(left.sort_order || 0) - Number(right.sort_order || 0);
    if (sortDelta !== 0) return sortDelta;
    return String(left.title || '').localeCompare(String(right.title || ''));
  });
}

function ensureSelectedDmScreenPage() {
  const campaign = getSelectedCampaign();
  if (!campaign) return;
  const pages = getSortedDmScreenPages(campaign.id);
  if (!pages.length) {
    state.selectedDmScreenPageId = null;
    return;
  }
  if (!pages.some((page) => page.id === state.selectedDmScreenPageId)) {
    state.selectedDmScreenPageId = pages[0].id;
  }
}

function getCampaignMaps(campaignId) {
  return [...(state.campaignContent[campaignId]?.maps || [])].sort((left, right) =>
    String(left.title || '').localeCompare(String(right.title || ''))
  );
}

function ensureSelectedMap() {
  const campaign = getSelectedCampaign();
  if (!campaign) return;
  const maps = getCampaignMaps(campaign.id);
  if (!maps.length) {
    state.selectedMapId = null;
    return;
  }
  if (!maps.some((map) => map.id === state.selectedMapId)) {
    state.selectedMapId = maps[0].id;
  }
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

function canEditCampaign(campaign) {
  return Boolean(campaign && isCurrentUserDm() && campaign.ownerUserId === state.sync.user.id);
}

function playerHasActiveCharacter() {
  if (!state.sync.user) return false;
  return state.sheets.some(
    (sheet) => sheet.ownerId === state.sync.user.id && sheet.isActive && sheet.type === 'player_character'
  );
}

function canCreateSheet() {
  if (!state.sync.connected) return false;
  if (isCurrentUserDm()) return true;
  return !playerHasActiveCharacter();
}

function updateTags() {
  const selected =
    state.view === VIEW_SHEETS
      ? getSelectedSheet()
      : state.campaignMode === CAMPAIGN_MODE_DM_SCREEN
        ? (getSortedDmScreenPages(state.selectedCampaignId || '').find((page) => page.id === state.selectedDmScreenPageId) ?? getSelectedCampaign())
        : state.campaignMode === CAMPAIGN_MODE_MAPS
          ? (getCampaignMaps(state.selectedCampaignId || '').find((map) => map.id === state.selectedMapId) ?? getSelectedCampaign())
        : getSelectedCampaign();
  if (el.selectedTag) {
    el.selectedTag.textContent = selected ? selected.name || selected.title : 'Nada selecionado';
  }

  if (el.autosaveTag) {
    const dirty = state.view === VIEW_SHEETS ? state.dirty : state.campaignDirty;
    if (!state.sync.connected) {
      el.autosaveTag.textContent = 'Sem sessao';
    } else if (dirty) {
      el.autosaveTag.textContent = 'Alteracoes pendentes';
    } else {
      el.autosaveTag.textContent = 'Tudo salvo';
    }
  }

  const workspace =
    state.view === VIEW_SHEETS
      ? 'Fichas'
      : state.campaignMode === CAMPAIGN_MODE_DM_SCREEN
        ? 'Tela do Mestre'
        : state.campaignMode === CAMPAIGN_MODE_MAPS
          ? 'Mapas'
          : 'Campanhas';
  setStatus(`${isCurrentUserDm() ? 'Perfil DM' : 'Perfil Player'} · ${workspace}`);
}

function setStatus(message) {
  if (el.statusTag) el.statusTag.textContent = message;
}

function serializeSheet(sheet, userId) {
  return {
    id: sheet.id,
    owner_id: sheet.ownerId || userId,
    owner_user_id: sheet.ownerUserId || (sheet.type === 'player_character' ? sheet.ownerId || userId : null),
    name: sheet.name,
    type: sheet.type,
    campaign_id: sheet.campaignId || null,
    is_active: sheet.isActive !== false,
    image_url: sheet.imagePath || null,
    age: sheet.age || null,
    occupation: sheet.occupation || null,
    description: sheet.description || null,
    intro_video_url: sheet.introVideoUrl || null,
    notes: sheet.notes || null,
    archived_at: sheet.archivedAt || null,
    sheet_data: {
      home: sheet.home,
      notes: sheet.notes,
      description: sheet.description,
      skills: sheet.skills,
      player_visible: Boolean(sheet.playerVisible)
    }
  };
}

function deserializeSheet(row) {
  const data = row?.sheet_data && typeof row.sheet_data === 'object' ? row.sheet_data : {};
  return {
    id: typeof row.id === 'string' ? row.id : crypto.randomUUID(),
    ownerId: typeof row.owner_id === 'string' ? row.owner_id : null,
    ownerUserId: typeof row.owner_user_id === 'string' ? row.owner_user_id : null,
    name: String(row.name || 'Novo Investigador'),
    type: row.type === 'npc' ? 'npc' : 'player_character',
    campaignId: typeof row.campaign_id === 'string' ? row.campaign_id : null,
    isActive: row.is_active !== false,
    imagePath: typeof row.image_url === 'string' ? row.image_url : null,
    imageSignedUrl: null,
    imagePreviewUrl: null,
    pendingImageFile: null,
    introVideoUrl: typeof row.intro_video_url === 'string' ? row.intro_video_url : null,
    videoSignedUrl: null,
    videoPreviewUrl: null,
    pendingVideoFile: null,
    occupation: String(row.occupation || data.occupation || ''),
    home: String(data.home || 'Arkham'),
    age: Number(row.age ?? data.age ?? 30),
    description: String(row.description || data.description || ''),
    notes: String(row.notes || data.notes || ''),
    archivedAt: typeof row.archived_at === 'string' ? row.archived_at : null,
    playerVisible: Boolean(data.player_visible),
    skills: normalizeSkills(Array.isArray(data.skills) ? data.skills : null),
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString()
  };
}

function deserializeCampaign(row) {
  return {
    id: typeof row.id === 'string' ? row.id : crypto.randomUUID(),
    ownerUserId: typeof row.owner_user_id === 'string' ? row.owner_user_id : state.sync.user.id,
    title: String(row.title || 'Nova campanha'),
    publicSummary: String(row.public_summary || ''),
    coverImageUrl: typeof row.cover_image_url === 'string' ? row.cover_image_url : null,
    coverSignedUrl: null,
    pendingCoverFile: null,
    status: String(row.status || 'draft'),
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
    updatedAt: typeof row.updated_at === 'string' ? row.updated_at : new Date().toISOString()
  };
}

function createBlankSheet(ownerId) {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    ownerId,
    ownerUserId: ownerId,
    name: 'Novo Investigador',
    type: 'player_character',
    campaignId: null,
    isActive: true,
    imagePath: null,
    imageSignedUrl: null,
    imagePreviewUrl: null,
    pendingImageFile: null,
    introVideoUrl: null,
    videoSignedUrl: null,
    videoPreviewUrl: null,
    pendingVideoFile: null,
    occupation: 'Antiquario',
    home: 'Arkham',
    age: 32,
    description: '',
    notes: '',
    archivedAt: null,
    playerVisible: false,
    skills: defaultCoc7eSkills(),
    createdAt: now,
    updatedAt: now
  };
}

function createQuickNpcDraft() {
  const draft = createBlankSheet(state.sync.user?.id ?? null);
  draft.type = 'npc';
  draft.ownerUserId = null;
  draft.name = 'Novo NPC';
  draft.occupation = 'Contato';
  draft.description = 'Descricao curta para a primeira aparicao.';
  draft.notes = 'Motivacao, voz e relacao com o grupo.';
  draft.isActive = true;
  draft.playerVisible = false;
  return draft;
}

function createGeneratedNpc() {
  const names = ['Abigail Marsh', 'Thomas Pickman', 'Ruth Carter', 'Miles Harper', 'Eleanor Webb'];
  const occupations = ['jornalista', 'medico', 'professor', 'detetive', 'bibliotecaria'];
  const hooks = [
    'Carrega um segredo antigo sobre a ultima sessao.',
    'Conhece um endereco que nao aparece em nenhum mapa.',
    'Parece amistoso, mas esconde uma agenda propria.',
    'Fala pouco e observa demais.',
    'Tem uma ligacao direta com uma pista encontrada em Arkham.'
  ];

  const npc = createQuickNpcDraft();
  npc.name = names[Math.floor(Math.random() * names.length)];
  npc.occupation = occupations[Math.floor(Math.random() * occupations.length)];
  npc.description = hooks[Math.floor(Math.random() * hooks.length)];
  npc.age = 24 + Math.floor(Math.random() * 30);
  npc.skills = defaultCoc7eSkills().map((skill) => ({
    ...skill,
    value: clampPercent(skill.base + Math.floor(Math.random() * 20))
  }));
  return npc;
}

function createBlankCampaign() {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    ownerUserId: state.sync.user.id,
    title: 'Nova campanha',
    publicSummary: '',
    coverImageUrl: null,
    coverSignedUrl: null,
    pendingCoverFile: null,
    status: 'draft',
    createdAt: now,
    updatedAt: now
  };
}

function getCampaignTitle(campaignId) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.title || '';
}

function mergeRow(rows, nextRow) {
  const index = rows.findIndex((row) => row.id === nextRow.id);
  if (index >= 0) {
    const clone = rows.slice();
    clone[index] = nextRow;
    return clone;
  }
  return [nextRow, ...rows];
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

function validateUpload(file, allowedTypes, maxSize, label) {
  if (!allowedTypes.includes(file.type)) {
    return `Tipo de ${label} nao suportado.`;
  }
  if (file.size > maxSize) {
    return `${label} excede o limite de ${Math.floor(maxSize / (1024 * 1024))} MB.`;
  }
  return null;
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
    void ensureSheetMediaUrls(sheet);
  }

  if (!imageUrl) {
    return '<span>Sem retrato cadastrado</span>';
  }

  return `<img src="${escapeAttribute(imageUrl)}" alt="Retrato de ${escapeAttribute(sheet.name)}">`;
}

async function ensureSheetMediaUrls(sheet) {
  if (sheet?.imagePath && !sheet.imagePreviewUrl && !sheet.imageSignedUrl && state.sync.client) {
    try {
      sheet.imageSignedUrl = await createSignedSheetImageUrl(state.sync.client, sheet.imagePath, 3600);
    } catch {}
  }

  if (sheet?.introVideoUrl && !sheet.videoPreviewUrl && !sheet.videoSignedUrl && state.sync.client && !/^https?:\/\//i.test(sheet.introVideoUrl)) {
    try {
      sheet.videoSignedUrl = await createSignedAssetUrl(state.sync.client, sheetMediaBucket(), sheet.introVideoUrl, 3600);
    } catch {}
  }

  if (sheet.id === state.selectedId) render();
}

async function ensureCampaignCoverUrl(campaign) {
  if (!campaign?.coverImageUrl || campaign.coverSignedUrl || /^https?:\/\//i.test(campaign.coverImageUrl)) return;
  try {
    campaign.coverSignedUrl = await createSignedAssetUrl(
      state.sync.client,
      campaignAssetBucket(),
      campaign.coverImageUrl,
      3600
    );
  } catch {}
}

function setSheetPreviewUrl(sheet, nextUrl) {
  releasePreviewUrl(sheet);
  sheet.imagePreviewUrl = nextUrl;
}

function setSheetVideoPreviewUrl(sheet, nextUrl) {
  releaseVideoPreviewUrl(sheet);
  sheet.videoPreviewUrl = nextUrl;
}

function releasePreviewUrl(sheet) {
  if (sheet?.imagePreviewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(sheet.imagePreviewUrl);
  }
  if (sheet) {
    sheet.imagePreviewUrl = null;
  }
}

function releaseVideoPreviewUrl(sheet) {
  if (sheet?.videoPreviewUrl?.startsWith('blob:')) {
    URL.revokeObjectURL(sheet.videoPreviewUrl);
  }
  if (sheet) {
    sheet.videoPreviewUrl = null;
  }
}

async function exportSheetAsPdf(sheet) {
  const imageUrl = await resolveSheetImageForPrint(sheet);
  const popup = window.open('', '_blank', 'noopener,noreferrer');
  if (!popup) {
    showToast('Nao foi possivel abrir a janela de impressao.');
    return;
  }

  popup.document.write(buildPrintableSheetHtml(sheet, imageUrl));
  popup.document.close();
  popup.focus();
  popup.print();
}

async function resolveSheetImageForPrint(sheet) {
  if (sheet.imagePreviewUrl) return sheet.imagePreviewUrl;
  if (sheet.imageSignedUrl) return sheet.imageSignedUrl;
  if (sheet.imagePath) {
    await ensureSheetMediaUrls(sheet);
    return sheet.imageSignedUrl || null;
  }
  return null;
}

function buildPrintableSheetHtml(sheet, imageUrl) {
  const skills = sheet.skills
    .map(
      (skill) => `<tr>
      <td>${escapeHtml(skill.name)}</td>
      <td>${Number(skill.base)}</td>
      <td>${Number(skill.value)}</td>
      <td>${Math.floor(Number(skill.value) / 2)}</td>
      <td>${Math.floor(Number(skill.value) / 5)}</td>
    </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
  <html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <title>${escapeHtml(sheet.name)} | Arkham Ledger PDF</title>
    <style>
      body{font-family:Georgia,"Times New Roman",serif;color:#111;margin:32px;background:#fff}
      h1,h2,h3{margin:0 0 10px}
      .head{display:grid;grid-template-columns:180px 1fr;gap:24px;align-items:start;margin-bottom:24px}
      .portrait{width:180px;aspect-ratio:3/4;border:1px solid #bbb;display:flex;align-items:center;justify-content:center;overflow:hidden}
      .portrait img{width:100%;height:100%;object-fit:cover}
      .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:14px}
      .box{border:1px solid #bbb;padding:10px 12px;border-radius:8px}
      .label{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#555;margin-bottom:4px}
      table{width:100%;border-collapse:collapse;margin-top:12px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left;font-size:12px}
      th{background:#f2efe8}
      .section{margin-top:24px}
      .notes{white-space:pre-wrap;line-height:1.5}
      @media print{body{margin:16px}}
    </style>
  </head>
  <body>
    <div class="head">
      <div class="portrait">${imageUrl ? `<img src="${escapeAttribute(imageUrl)}" alt="">` : '<span>Sem retrato</span>'}</div>
      <div>
        <h1>${escapeHtml(sheet.name)}</h1>
        <div>${escapeHtml(sheet.type === 'npc' ? 'NPC' : 'Investigador')}</div>
        <div class="meta">
          <div class="box"><div class="label">Idade</div>${sheet.age ?? '-'}</div>
          <div class="box"><div class="label">Ocupacao</div>${escapeHtml(sheet.occupation || '-')}</div>
          <div class="box"><div class="label">Origem</div>${escapeHtml(sheet.home || '-')}</div>
          <div class="box"><div class="label">Campanha</div>${escapeHtml(getCampaignTitle(sheet.campaignId) || '-')}</div>
        </div>
      </div>
    </div>
    <div class="section">
      <h2>Descricao</h2>
      <div class="box notes">${escapeHtml(sheet.description || 'Sem descricao.')}</div>
    </div>
    <div class="section">
      <h2>Pericias</h2>
      <table>
        <thead><tr><th>Pericia</th><th>Base</th><th>Atual</th><th>Dif</th><th>Ext</th></tr></thead>
        <tbody>${skills}</tbody>
      </table>
    </div>
    <div class="section">
      <h2>Anotacoes</h2>
      <div class="box notes">${escapeHtml(sheet.notes || 'Sem anotacoes.')}</div>
    </div>
  </body>
  </html>`;
}

function downloadJson(fileName, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
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

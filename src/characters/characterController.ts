
    import { STORAGE_KEY } from './characterService.ts';

export function initCharacterController(){

    const DEFAULT_GROUPS_OPEN = {
      'Investigação': true,
      'Interação': true,
      'Ação': true,
      'Conhecimento': false,
      'Sobrevivência': false,
      'Combate': false,
      'Percepção': true,
      'Ofícios/Artes': false,
      'Outras': false
    };

    const BASE_SKILLS = [
      { group:'Investigação', name:'Biblioteca', base:20 },
      { group:'Investigação', name:'Contabilidade', base:5 },
      { group:'Investigação', name:'Direito', base:5 },
      { group:'Investigação', name:'Escutar', base:20 },
      { group:'Investigação', name:'Encontrar (Spot Hidden)', base:25 },
      { group:'Investigação', name:'Medicina', base:1 },
      { group:'Investigação', name:'Primeiros Socorros', base:30 },
      { group:'Investigação', name:'Psicanálise', base:1 },
      { group:'Investigação', name:'Psicologia', base:10 },
      { group:'Investigação', name:'Ocultismo', base:5 },

      { group:'Interação', name:'Charme', base:15 },
      { group:'Interação', name:'Intimidar', base:15 },
      { group:'Interação', name:'Lábia (Fast Talk)', base:5 },
      { group:'Interação', name:'Persuasão', base:10 },
      { group:'Interação', name:'Usar o Dom (Credit Rating)', base:0 },

      { group:'Ação', name:'Arremessar', base:20 },
      { group:'Ação', name:'Dirigir (Automóvel)', base:20 },
      { group:'Ação', name:'Pilotar', base:1 },
      { group:'Ação', name:'Nadar', base:20 },
      { group:'Ação', name:'Escalar', base:20 },
      { group:'Ação', name:'Saltar', base:20 },
      { group:'Ação', name:'Furtividade', base:20 },
      { group:'Ação', name:'Tranca (Locksmith)', base:1 },
      { group:'Ação', name:'Sobrevivência', base:10 },

      { group:'Conhecimento', name:'Antropologia', base:1 },
      { group:'Conhecimento', name:'Arqueologia', base:1 },
      { group:'Conhecimento', name:'Ciência (Biologia)', base:1 },
      { group:'Conhecimento', name:'Ciência (Química)', base:1 },
      { group:'Conhecimento', name:'Ciência (Física)', base:1 },
      { group:'Conhecimento', name:'Ciência (Astronomia)', base:1 },
      { group:'Conhecimento', name:'História', base:5 },
      { group:'Conhecimento', name:'Língua Nativa', base:0 },
      { group:'Conhecimento', name:'Outra Língua', base:1 },
      { group:'Conhecimento', name:'Mitos de Cthulhu', base:0 },

      { group:'Percepção', name:'Rastrear', base:10 },
      { group:'Percepção', name:'Disfarce', base:5 },
      { group:'Percepção', name:'Lábios (Leitura Labial)', base:1 },
      { group:'Percepção', name:'Avaliação', base:5 },

      { group:'Sobrevivência', name:'Navegação', base:10 },
      { group:'Sobrevivência', name:'Mecânica', base:10 },
      { group:'Sobrevivência', name:'Elétrica', base:10 },
      { group:'Sobrevivência', name:'Operar Maquinaria Pesada', base:1 },

      { group:'Combate', name:'Briga (Brawl)', base:25 },
      { group:'Combate', name:'Esquiva (Dodge)', base:0 },
      { group:'Combate', name:'Armas de Fogo (Pistolas)', base:20 },
      { group:'Combate', name:'Armas de Fogo (Rifles/Escopetas)', base:25 },
      { group:'Combate', name:'Armas de Fogo (SMG)', base:15 },
      { group:'Combate', name:'Armas de Fogo (Metralhadora)', base:10 },
      { group:'Combate', name:'Arco', base:15 },
      { group:'Combate', name:'Armas Brancas', base:20 },

      { group:'Ofícios/Artes', name:'Arte/Ofício (Atuação)', base:5 },
      { group:'Ofícios/Artes', name:'Arte/Ofício (Escrita)', base:5 },
      { group:'Ofícios/Artes', name:'Arte/Ofício (Fotografia)', base:5 },
      { group:'Ofícios/Artes', name:'Arte/Ofício (Música)', base:5 },
      { group:'Ofícios/Artes', name:'Arte/Ofício (Artesanato)', base:5 },

      { group:'Outras', name:'Demolições', base:1 },
      { group:'Outras', name:'Eletrônica', base:1 },
      { group:'Outras', name:'Operar Equipamento (Radio)', base:1 },
      { group:'Outras', name:'Sleight of Hand', base:10 },
      { group:'Outras', name:'Hipnose', base:1 }
    ];

    const DEFAULT_WEAPONS = [
      { name:'Punho / Chute', skill:'Briga (Brawl)', damage:'1D3 + DB', range:'-', attacks:1 },
      { name:'Revólver', skill:'Armas de Fogo (Pistolas)', damage:'1D10', range:'15m', attacks:1 },
      { name:'Faca', skill:'Armas Brancas', damage:'1D4 + DB', range:'-', attacks:1 }
    ];

    const $ = (sel, root=document) => root.querySelector(sel);
    const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

    function uid(){
      return 'id_' + Math.random().toString(16).slice(2) + '_' + Date.now().toString(16);
    }

    function toast(msg){
      const t = $('#toast');
      t.textContent = msg;
      t.classList.add('show');
      clearTimeout(toast._t);
      toast._t = setTimeout(() => t.classList.remove('show'), 1800);
    }

    function clamp(n, min, max){
      n = Number.isFinite(n) ? n : min;
      return Math.max(min, Math.min(max, n));
    }

    function half(v){ return Math.floor((Number(v)||0)/2); }
    function fifth(v){ return Math.floor((Number(v)||0)/5); }

    function hard(v){ return Math.floor((Number(v)||0)/2); }
    function extreme(v){ return Math.floor((Number(v)||0)/5); }

    function dbAndBuild(str, siz){
      const sum = (Number(str)||0) + (Number(siz)||0);
      if(sum <= 64) return { db:'-2', build:-2 };
      if(sum <= 84) return { db:'-1', build:-1 };
      if(sum <= 124) return { db:'0', build:0 };
      if(sum <= 164) return { db:'+1D4', build:1 };
      if(sum <= 204) return { db:'+1D6', build:2 };
      if(sum <= 284) return { db:'+2D6', build:3 };
      return { db:'+3D6', build:4 };
    }

    function movRate(dex, str, siz, age){
      dex = Number(dex)||0; str = Number(str)||0; siz = Number(siz)||0;
      let mov = 8;
      if(dex < siz && str < siz) mov = 7;
      else if(dex > siz && str > siz) mov = 9;
      age = Number(age)||0;
      if(age >= 40 && age <= 49) mov -= 1;
      else if(age >= 50 && age <= 59) mov -= 2;
      else if(age >= 60 && age <= 69) mov -= 3;
      else if(age >= 70 && age <= 79) mov -= 4;
      else if(age >= 80) mov -= 5;
      return Math.max(1, mov);
    }

    function autoCalculate(sheet){
      const c = sheet.characteristics;
      const d = sheet.derived;

      d.hpMax = Math.floor((Number(c.con)||0 + Number(c.siz)||0) / 10);
      d.mpMax = Math.floor((Number(c.pow)||0) / 5);
      d.sanMax = Number(c.pow)||0;
      d.luck = Number(c.pow)||0;
      d.idea = Number(c.int)||0;
      d.know = Number(c.edu)||0;

      const {db, build} = dbAndBuild(c.str, c.siz);
      d.db = db;
      d.build = build;
      d.mov = movRate(c.dex, c.str, c.siz, sheet.info.age);

      d.dodge = Math.floor((Number(c.dex)||0) / 2);

      const myth = Number(sheet.mythos.cthulhuMythos)||0;
      const sanCap = Math.max(0, 99 - myth);
      sheet.mythos.sanCap = sanCap;

      if(Number.isFinite(Number(d.hpCurrent)) === false) d.hpCurrent = d.hpMax;
      if(Number.isFinite(Number(d.mpCurrent)) === false) d.mpCurrent = d.mpMax;
      if(Number.isFinite(Number(d.sanCurrent)) === false) d.sanCurrent = d.sanMax;

      d.hpCurrent = clamp(Number(d.hpCurrent)||0, 0, d.hpMax);
      d.mpCurrent = clamp(Number(d.mpCurrent)||0, 0, d.mpMax);
      d.sanCurrent = clamp(Number(d.sanCurrent)||0, 0, Math.min(d.sanMax, sanCap));

      const dodgeSkill = sheet.skills.find(s => s.name.toLowerCase().includes('esquiva'));
      if(dodgeSkill){
        if(dodgeSkill.base === 0) dodgeSkill.base = d.dodge;
        if(dodgeSkill.value === 0 || dodgeSkill.value === '' || dodgeSkill.value == null){
          dodgeSkill.value = d.dodge;
        }
      }

      const cr = sheet.skills.find(s => s.name.toLowerCase().includes('dom') || s.name.toLowerCase().includes('credit'));
      if(cr && (cr.base == null || cr.base === 0)) cr.base = 0;

      if(sheet.ui == null) sheet.ui = { openGroups: structuredClone(DEFAULT_GROUPS_OPEN) };
      if(sheet.ui.openGroups == null) sheet.ui.openGroups = structuredClone(DEFAULT_GROUPS_OPEN);
      return sheet;
    }

    function createDefaultSheet(){
      const id = uid();
      const baseSkills = BASE_SKILLS.map(s => ({
        id: uid(),
        group: s.group,
        name: s.name,
        base: s.base,
        value: s.name.includes('Esquiva') ? 0 : s.base
      }));

      const sheet = {
        id,
        title:'Investigador sem nome',
        modeMeta:{ createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        info:{
          name:'',
          occupation:'',
          age:25,
          sex:'',
          residence:'',
          birthplace:'',
          archetype:'',
          player:'',
          era:'1920s',
        },
        characteristics:{
          str:50, con:50, siz:50, dex:50, app:50, int:50, pow:50, edu:50
        },
        derived:{
          hpCurrent:null, hpMax:null,
          mpCurrent:null, mpMax:null,
          sanCurrent:null, sanMax:null,
          luck:null,
          mov:null,
          build:null,
          db:null,
          dodge:null,
          idea:null,
          know:null
        },
        mythos:{
          cthulhuMythos:0,
          sanCap:99,
          spells:'',
          tomes:'',
          encounters:''
        },
        combat:{
          attacks:'',
          armor:'',
          wounds:'',
          tempInsanity:'',
          indefInsanity:'',
          phobiasManias:''
        },
        weapons: structuredClone(DEFAULT_WEAPONS),
        possessions:{
          cash:'',
          assets:'',
          gear:'',
          contacts:''
        },
        backstory:{
          personalDesc:'',
          ideologyBeliefs:'',
          significantPeople:'',
          meaningfulLocations:'',
          treasuredPossessions:'',
          traits:'',
          injuriesScars:'',
          arcaneArtifacts:'',
          organizations:'',
          notes:''
        },
        skills: baseSkills,
        ui:{
          openGroups: structuredClone(DEFAULT_GROUPS_OPEN)
        }
      };

      return autoCalculate(sheet);
    }

    function normalizeSheet(raw){
      const sheet = structuredClone(raw);

      if(!sheet.info) sheet.info = {};
      if(!sheet.characteristics) sheet.characteristics = {};
      if(!sheet.derived) sheet.derived = {};
      if(!sheet.skills) sheet.skills = [];
      if(!sheet.weapons) sheet.weapons = [];

      const defaults = createDefaultSheet();
      const merged = {
        ...defaults,
        ...sheet,
        info: { ...defaults.info, ...sheet.info },
        characteristics: { ...defaults.characteristics, ...sheet.characteristics },
        derived: { ...defaults.derived, ...sheet.derived },
        mythos: { ...defaults.mythos, ...sheet.mythos },
        combat: { ...defaults.combat, ...sheet.combat },
        possessions: { ...defaults.possessions, ...sheet.possessions },
        backstory: { ...defaults.backstory, ...sheet.backstory },
        ui: { ...defaults.ui, ...sheet.ui }
      };

      merged.skills = Array.isArray(sheet.skills) && sheet.skills.length ? sheet.skills : defaults.skills;
      merged.weapons = Array.isArray(sheet.weapons) && sheet.weapons.length ? sheet.weapons : defaults.weapons;
      merged.id = merged.id || uid();
      merged.title = merged.info?.name || merged.title || 'Investigador sem nome';

      merged.skills = merged.skills.map(s => ({
        id: s.id || uid(),
        group: s.group || 'Outras',
        name: s.name || 'Perícia',
        base: Number(s.base)||0,
        value: (s.value === '' || s.value == null) ? '' : (Number(s.value)||0)
      }));

      merged.weapons = merged.weapons.map(w => ({
        name: w.name || 'Arma',
        skill: w.skill || '',
        damage: w.damage || '',
        range: w.range || '',
        attacks: Number(w.attacks)||1
      }));

      return autoCalculate(merged);
    }

    function loadState(){
      try{
        const raw = localStorage.getItem(STORAGE_KEY);
        if(!raw) return null;
        const parsed = JSON.parse(raw);
        if(!parsed || !Array.isArray(parsed.sheets)) return null;
        return {
          sheets: parsed.sheets.map(normalizeSheet),
          selectedId: parsed.selectedId,
          viewMode: parsed.viewMode || 'focus'
        };
      }catch{
        return null;
      }
    }

    function saveState(){
      const payload = {
        sheets: state.sheets,
        selectedId: state.selectedId,
        viewMode: state.viewMode
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    const state = (() => {
      const loaded = loadState();
      if(loaded && loaded.sheets.length){
        return {
          sheets: loaded.sheets,
          selectedId: loaded.selectedId || loaded.sheets[0].id,
          viewMode: loaded.viewMode || 'focus',
          filter:''
        };
      }
      const initial = [createDefaultSheet()];
      return { sheets: initial, selectedId: initial[0].id, viewMode:'focus', filter:'' };
    })();

    const viewModeEl = document.getElementById('viewMode');
    viewModeEl.value = state.viewMode;
    viewModeEl.addEventListener('change', () => {
      state.viewMode = viewModeEl.value;
      saveState();
      render();
    });

    function selectedSheet(){
      return state.sheets.find(s => s.id === state.selectedId) || state.sheets[0];
    }

    function updateSelected(mutator){
      const s = selectedSheet();
      if(!s) return;
      mutateSheetById(s.id, mutator);
    }

    function renderList(){
      const list = document.getElementById('sheetList');
      list.innerHTML = '';

      const q = state.filter.trim().toLowerCase();
      const items = state.sheets.filter(s => {
        if(!q) return true;
        const text = [
          s.info.name, s.info.occupation, s.info.player, s.info.era
        ].join(' ').toLowerCase();
        return text.includes(q);
      });

      for(const s of items){
        const el = document.createElement('div');
        el.className = 'sheet-item' + (s.id === state.selectedId ? ' active' : '');
        el.innerHTML = `
          <div class="title">${escapeHtml(s.info.name || 'Investigador sem nome')}</div>
          <div class="meta">
            <span>${escapeHtml(s.info.occupation || 'Sem ocupação')}</span>
            <span>${escapeHtml(s.info.era || '')}</span>
          </div>
        `;
        el.onclick = () => {
          state.selectedId = s.id;
          saveState();
          render();
        };
        list.appendChild(el);
      }
    }

    function render(){
      renderList();
      renderHeader();
      renderView();
    }

    function renderHeader(){
      const s = selectedSheet();
      document.getElementById('selectedTag').textContent = s ? (s.info.name || 'Investigador sem nome') : 'Nenhuma ficha';
      document.getElementById('statusTag').textContent = 'Pronto';
    }

    function renderView(){
      const root = document.getElementById('viewRoot');
      root.innerHTML = '';

      const mode = state.viewMode;
      if(mode === 'side'){
        const grid = document.createElement('div');
        grid.className = 'grid-view';
        for(const s of state.sheets){
          grid.appendChild(renderSheetCard(s, { compact:false }));
        }
        root.appendChild(grid);
      }else{
        const wrap = document.createElement('div');
        wrap.className = 'focus-view';
        wrap.appendChild(renderSheetCard(selectedSheet(), { compact:false }));
        root.appendChild(wrap);
      }
      bindInputs(root);
    }

    function renderSheetCard(sheet, opts){
      const card = document.createElement('div');
      card.className = 'sheet-card';
      card.dataset.sheetId = sheet.id;

      const c = sheet.characteristics;
      const d = sheet.derived;
      const myth = sheet.mythos;

      card.innerHTML = `
        <div class="card-header">
          <h2>${escapeHtml(sheet.info.name || 'Investigador sem nome')}</h2>
          <div class="subtitle">${escapeHtml(sheet.info.occupation || 'Ocupação')} · ${escapeHtml(sheet.info.era || '')}</div>
        </div>

        <div class="sheet-body">
          <div class="section">
            <h3>Identidade</h3>
            <div class="grid-4">
              ${field(sheet.id,'info.name','Nome', sheet.info.name)}
              ${field(sheet.id,'info.player','Jogador', sheet.info.player)}
              ${field(sheet.id,'info.occupation','Ocupação', sheet.info.occupation)}
              ${field(sheet.id,'info.archetype','Arquétipo', sheet.info.archetype)}
            </div>
            <div class="grid-4" style="margin-top:10px">
              ${field(sheet.id,'info.age','Idade', sheet.info.age,'number')}
              ${field(sheet.id,'info.sex','Sexo', sheet.info.sex)}
              ${field(sheet.id,'info.birthplace','Nascimento', sheet.info.birthplace)}
              ${field(sheet.id,'info.residence','Residência', sheet.info.residence)}
            </div>
          </div>

          <div class="section">
            <h3>Características</h3>
            <div class="grid-8">
              ${stat(sheet,'STR','characteristics.str', c.str)}
              ${stat(sheet,'CON','characteristics.con', c.con)}
              ${stat(sheet,'SIZ','characteristics.siz', c.siz)}
              ${stat(sheet,'DEX','characteristics.dex', c.dex)}
              ${stat(sheet,'APP','characteristics.app', c.app)}
              ${stat(sheet,'INT','characteristics.int', c.int)}
              ${stat(sheet,'POW','characteristics.pow', c.pow)}
              ${stat(sheet,'EDU','characteristics.edu', c.edu)}
            </div>
          </div>

          <div class="section">
            <h3>Derivados</h3>
            <div class="grid-6">
              ${meter(sheet.id,'derived.hpCurrent','HP', d.hpCurrent, d.hpMax)}
              ${meter(sheet.id,'derived.sanCurrent','SAN', d.sanCurrent, Math.min(d.sanMax, myth.sanCap))}
              ${meter(sheet.id,'derived.mpCurrent','MP', d.mpCurrent, d.mpMax)}
              ${pillStat('MOV', d.mov)}
              ${pillStat('Build', d.build)}
              ${pillStat('DB', d.db)}
            </div>
            <div class="divider"></div>
            <div class="grid-4">
              ${pillStat('Esquiva', d.dodge)}
              ${pillStat('IDEA', d.idea)}
              ${pillStat('KNOW', d.know)}
              ${pillStat('Sorte', d.luck)}
            </div>
          </div>

          <div class="section">
            <h3>Combate</h3>
            <div class="grid-3">
              ${field(sheet.id,'combat.attacks','Ataques/Manobras', sheet.combat.attacks)}
              ${field(sheet.id,'combat.armor','Armadura', sheet.combat.armor)}
              ${field(sheet.id,'combat.wounds','Ferimentos', sheet.combat.wounds)}
            </div>
            <div style="margin-top:10px">
              <div class="muted small" style="margin-bottom:8px">Armas</div>
              <div class="weapon-row muted small" style="margin-bottom:6px">
                <div>Arma</div><div>Perícia</div><div>Dano</div><div>Alcance</div><div>Atk</div><div></div>
              </div>
              <div class="skills">
                ${sheet.weapons.map((w,i)=>weaponRow(sheet.id,i,w)).join('')}
                <button class="btn ghost" data-action="add-weapon" data-sheet-id="${escapeAttr(sheet.id)}">+ Adicionar arma</button>
              </div>
            </div>
          </div>

          <div class="section">
            <h3>Perícias</h3>
            <div class="skill-toolbar">
              <span class="tag">Clique no alvo para rolar</span>
              <input class="skill-filter" placeholder="Filtrar perícias nesta ficha..." style="max-width:360px" />
              <button class="btn ghost" data-action="add-custom-skill" data-sheet-id="${escapeAttr(sheet.id)}">+ Perícia</button>
            </div>
            <div class="skills">
              ${renderSkillGroups(sheet)}
            </div>
          </div>

          <div class="section">
            <h3>Mitos</h3>
            <div class="grid-3">
              ${field(sheet.id,'mythos.cthulhuMythos','Mitos de Cthulhu', myth.cthulhuMythos,'number')}
              ${pillStat('Teto SAN', myth.sanCap)}
              ${field(sheet.id,'mythos.spells','Feitiços', myth.spells)}
            </div>
            <div class="grid-2" style="margin-top:10px">
              ${field(sheet.id,'mythos.tomes','Tomos', myth.tomes,'textarea')}
              ${field(sheet.id,'mythos.encounters','Encontros', myth.encounters,'textarea')}
            </div>
          </div>

          <div class="section">
            <h3>Posses</h3>
            <div class="grid-3">
              ${field(sheet.id,'possessions.cash','Dinheiro', sheet.possessions.cash)}
              ${field(sheet.id,'possessions.assets','Ativos', sheet.possessions.assets)}
              ${field(sheet.id,'possessions.contacts','Contatos', sheet.possessions.contacts)}
            </div>
            <div style="margin-top:10px">
              ${field(sheet.id,'possessions.gear','Equipamento', sheet.possessions.gear,'textarea')}
            </div>
          </div>

          <div class="section">
            <h3>História</h3>
            <div class="grid-2">
              ${field(sheet.id,'backstory.personalDesc','Descrição pessoal', sheet.backstory.personalDesc,'textarea')}
              ${field(sheet.id,'backstory.traits','Traços', sheet.backstory.traits,'textarea')}
            </div>
            <div class="grid-2" style="margin-top:10px">
              ${field(sheet.id,'backstory.ideologyBeliefs','Ideologia/Crenças', sheet.backstory.ideologyBeliefs,'textarea')}
              ${field(sheet.id,'backstory.significantPeople','Pessoas importantes', sheet.backstory.significantPeople,'textarea')}
            </div>
            <div class="grid-2" style="margin-top:10px">
              ${field(sheet.id,'backstory.meaningfulLocations','Locais marcantes', sheet.backstory.meaningfulLocations,'textarea')}
              ${field(sheet.id,'backstory.treasuredPossessions','Objetos estimados', sheet.backstory.treasuredPossessions,'textarea')}
            </div>
            <div class="grid-2" style="margin-top:10px">
              ${field(sheet.id,'backstory.injuriesScars','Cicatrizes/Traumas', sheet.backstory.injuriesScars,'textarea')}
              ${field(sheet.id,'backstory.organizations','Organizações', sheet.backstory.organizations,'textarea')}
            </div>
            <div class="grid-2" style="margin-top:10px">
              ${field(sheet.id,'backstory.arcaneArtifacts','Artefatos arcanos', sheet.backstory.arcaneArtifacts,'textarea')}
              ${field(sheet.id,'backstory.notes','Notas do guardião', sheet.backstory.notes,'textarea')}
            </div>
          </div>

          <div class="section">
            <h3>Ações</h3>
            <div class="row">
              <button class="btn ghost" data-action="roll-characteristic" data-key="Sorte" data-target="${escapeAttr(d.luck)}">Rolar Sorte</button>
              <button class="btn ghost" data-action="roll-characteristic" data-key="SAN" data-target="${escapeAttr(Math.min(d.sanMax, myth.sanCap))}">Rolar SAN</button>
              <button class="btn ghost" data-action="export-sheet" data-sheet-id="${escapeAttr(sheet.id)}">Download JSON</button>
              <button class="btn secondary" data-action="duplicate-sheet" data-sheet-id="${escapeAttr(sheet.id)}">Duplicar</button>
              <button class="btn danger" data-action="delete-sheet" data-sheet-id="${escapeAttr(sheet.id)}">Excluir</button>
            </div>
          </div>
        </div>
      `;

      return card;
    }

    function field(sheetId, path, label, value, type='text'){
      if(type === 'textarea'){
        return `
          <div class="field">
            <label>${escapeHtml(label)}</label>
            <textarea data-sheet-id="${escapeAttr(sheetId)}" data-path="${escapeAttr(path)}">${escapeHtml(value||'')}</textarea>
          </div>
        `;
      }
      return `
        <div class="field">
          <label>${escapeHtml(label)}</label>
          <input type="${type}" data-sheet-id="${escapeAttr(sheetId)}" data-path="${escapeAttr(path)}" value="${escapeAttr(value ?? '')}" />
        </div>
      `;
    }

    function stat(sheet, key, path, value){
      const v = Number(value)||0;
      return `
        <div class="stat">
          <div class="stat-head">
            <strong>${escapeHtml(key)}</strong>
            <span class="pill">${v}</span>
          </div>
          <input class="mini" type="number" data-sheet-id="${escapeAttr(sheet.id)}" data-path="${escapeAttr(path)}" value="${escapeAttr(v)}" />
          <div class="triplet">
            <div title="Regular">${v}</div>
            <div title="Difícil">${hard(v)}</div>
            <div title="Extrema">${extreme(v)}</div>
          </div>
          <div style="margin-top:8px">
            <button class="roll-btn" data-action="roll-characteristic" data-key="${escapeAttr(key)}" data-target="${escapeAttr(v)}">Rolar</button>
          </div>
        </div>
      `;
    }

    function pillStat(label, value){
      return `
        <div class="stat">
          <div class="stat-head">
            <strong>${escapeHtml(label)}</strong>
            <span class="pill">${escapeHtml(value)}</span>
          </div>
          <div class="muted small"> </div>
        </div>
      `;
    }

    function meter(sheetId, path, label, current, max){
      const cur = Number(current)||0;
      const m = Number(max)||0;
      return `
        <div class="stat">
          <div class="stat-head">
            <strong>${escapeHtml(label)}</strong>
            <span class="pill">${cur} / ${m}</span>
          </div>
          <input class="mini" type="number" data-sheet-id="${escapeAttr(sheetId)}" data-path="${escapeAttr(path)}" value="${escapeAttr(cur)}" />
        </div>
      `;
    }

    function renderSkillGroups(sheet){
      const groups = {};
      for(const sk of sheet.skills){
        const g = sk.group || 'Outras';
        if(!groups[g]) groups[g] = [];
        groups[g].push(sk);
      }

      const order = Object.keys(DEFAULT_GROUPS_OPEN);
      const sortedGroups = Array.from(new Set([...order, ...Object.keys(groups)]));

      return sortedGroups.map(g => {
        const open = sheet.ui?.openGroups?.[g] ?? false;
        const list = (groups[g] || []).sort((a,b) => a.name.localeCompare(b.name));
        return `
          <details class="skill-group" ${open ? 'open' : ''} data-sheet-id="${escapeAttr(sheet.id)}" data-group="${escapeAttr(g)}">
            <summary>${escapeHtml(g)} <span class="muted small">(${list.length})</span></summary>
            <div class="skill-group-body">
              ${list.map(sk => skillRow(sheet.id, sk)).join('')}
            </div>
          </details>
        `;
      }).join('');
    }

    function skillRow(sheetId, sk){
      const base = Number(sk.base)||0;
      const val = (sk.value === '' || sk.value == null) ? '' : (Number(sk.value)||0);
      const target = (val === '' ? base : val);
      const nm = sk.name || 'Perícia';
      return `
        <div class="skill-row skill-item" data-skill-name="${escapeAttr(nm.toLowerCase())}">
          <div class="name">
            <div class="skill-label" title="${escapeAttr(nm)}">${escapeHtml(nm)}</div>
            <span class="base-badge">base ${base}</span>
          </div>
          <input class="mini" type="number" value="${escapeAttr(val)}" data-sheet-id="${escapeAttr(sheetId)}" data-skill-id="${escapeAttr(sk.id)}" data-action="skill-value" />
          <div class="mini muted" title="Difícil">${hard(target)}</div>
          <div class="mini muted" title="Extrema">${extreme(target)}</div>
          <button class="roll-btn" data-action="roll-skill" data-sheet-id="${escapeAttr(sheetId)}" data-skill-id="${escapeAttr(sk.id)}">🎲</button>
        </div>
      `;
    }

    function weaponRow(sheetId, idx, w){
      return `
        <div class="weapon-row">
          <input value="${escapeAttr(w.name||'')}" data-sheet-id="${escapeAttr(sheetId)}" data-path="weapons.${idx}.name" />
          <input value="${escapeAttr(w.skill||'')}" data-sheet-id="${escapeAttr(sheetId)}" data-path="weapons.${idx}.skill" />
          <input value="${escapeAttr(w.damage||'')}" data-sheet-id="${escapeAttr(sheetId)}" data-path="weapons.${idx}.damage" />
          <input value="${escapeAttr(w.range||'')}" data-sheet-id="${escapeAttr(sheetId)}" data-path="weapons.${idx}.range" />
          <input class="mini" type="number" value="${escapeAttr(w.attacks||1)}" data-sheet-id="${escapeAttr(sheetId)}" data-path="weapons.${idx}.attacks" />
          <button class="btn danger" data-action="remove-weapon" data-sheet-id="${escapeAttr(sheetId)}" data-index="${idx}">×</button>
        </div>
      `;
    }

    function bindInputs(root){
      root.querySelectorAll('input[data-path], textarea[data-path], select[data-path]').forEach(el => {
        el.addEventListener('input', onPathInput);
      });

      root.querySelectorAll('input[data-action="skill-value"]').forEach(el => {
        el.addEventListener('input', onSkillValueInput);
      });

      root.querySelectorAll('[data-action="add-weapon"]').forEach(el => {
        el.onclick = () => {
          const sheetId = el.dataset.sheetId;
          mutateSheetById(sheetId, sheet => {
            sheet.weapons.push({ name:'Nova arma', skill:'', damage:'', range:'', attacks:1 });
          });
        };
      });

      root.querySelectorAll('[data-action="remove-weapon"]').forEach(el => {
        el.onclick = () => {
          const sheetId = el.dataset.sheetId;
          const i = Number(el.dataset.index);
          mutateSheetById(sheetId, sheet => {
            sheet.weapons.splice(i, 1);
          });
        };
      });

      root.querySelectorAll('[data-action="roll-skill"]').forEach(el => {
        el.onclick = () => {
          const sheetId = el.dataset.sheetId;
          const skillId = el.dataset.skillId;
          const sheet = state.sheets.find(s => s.id === sheetId);
          const skill = sheet?.skills.find(sk => sk.id === skillId);
          if(skill) openRollDialog(skill.name, Number(skill.value)||0);
        };
      });

      root.querySelectorAll('[data-action="roll-characteristic"]').forEach(el => {
        el.onclick = () => openRollDialog(el.dataset.key, Number(el.dataset.target)||0);
      });

      root.querySelectorAll('[data-action="add-custom-skill"]').forEach(el => {
        el.onclick = () => {
          const sheetId = el.dataset.sheetId;
          mutateSheetById(sheetId, sheet => {
            sheet.skills.push({ id: uid(), group:'Outras', name:'Nova Perícia', base:0, value:0 });
            sheet.ui.openGroups['Outras'] = true;
          });
        };
      });

      root.querySelectorAll('[data-action="export-sheet"]').forEach(el => {
        el.onclick = () => exportSheet(el.dataset.sheetId);
      });

      root.querySelectorAll('[data-action="duplicate-sheet"]').forEach(el => {
        el.onclick = () => duplicateSheet(el.dataset.sheetId);
      });

      root.querySelectorAll('[data-action="delete-sheet"]').forEach(el => {
        el.onclick = () => deleteSheet(el.dataset.sheetId);
      });

      root.querySelectorAll('details.skill-group').forEach(el => {
        el.addEventListener('toggle', () => {
          const { sheetId, group } = el.dataset;
          mutateSheetById(sheetId, sheet => {
            sheet.ui.openGroups[group] = el.open;
          }, false);
        });
      });

      root.querySelectorAll('.skill-filter').forEach(el => {
        el.addEventListener('input', () => {
          const container = el.closest('.section');
          const q = el.value.trim().toLowerCase();
          container.querySelectorAll('.skill-item').forEach(item => {
            const name = item.dataset.skillName || '';
            item.classList.toggle('hidden', q && !name.includes(q));
          });
        });
      });
    }

    function onPathInput(e){
      const el = e.currentTarget;
      const sheetId = el.dataset.sheetId;
      mutateSheetById(sheetId, sheet => {
        setByPath(sheet, el.dataset.path, el.type === 'number' && el.value !== '' ? Number(el.value) : el.value);
      });
    }

    function onSkillValueInput(e){
      const el = e.currentTarget;
      const { sheetId, skillId } = el.dataset;
      mutateSheetById(sheetId, sheet => {
        const skill = sheet.skills.find(s => s.id === skillId);
        if(skill) skill.value = el.value === '' ? '' : Number(el.value);
      });
    }

    function mutateSheetById(sheetId, mutator, rerender=true){
      const idx = state.sheets.findIndex(s => s.id === sheetId);
      if(idx < 0) return;
      const clone = structuredClone(state.sheets[idx]);
      mutator(clone);
      clone.modeMeta.updatedAt = new Date().toISOString();
      autoCalculate(clone);
      clone.title = clone.info.name || 'Investigador sem nome';
      state.sheets[idx] = clone;
      if(sheetId === state.selectedId){
        saveState();
        if(rerender) render();
        else saveState();
      }else{
        saveState();
        if(rerender) render();
      }
    }

    function setByPath(obj, path){
      const value = arguments[2];
      const keys = path.split('.');
      let ref = obj;
      for(let i=0; i<keys.length-1; i++){
        const key = keys[i];
        if(!(key in ref)) ref[key] = {};
        ref = ref[key];
      }
      ref[keys[keys.length - 1]] = value;
    }

    function exportSheet(sheetId){
      const sheet = state.sheets.find(s => s.id === sheetId);
      if(!sheet) return;
      downloadJson(sheet, \`\${sanitizeFileName(sheet.info.name || 'investigador')}.json\`);
    }

    function exportAll(){
      downloadJson({ app:'Arkham Ledger', version:1, exportedAt:new Date().toISOString(), sheets: state.sheets }, \`arkham-ledger-backup-\${dateStamp()}.json\`);
    }

    function duplicateSheet(sheetId){
      const original = state.sheets.find(s => s.id === sheetId);
      if(!original) return;
      const copy = structuredClone(original);
      copy.id = uid();
      copy.info.name = \`\${original.info.name || 'Investigador'} (cópia)\`;
      copy.title = copy.info.name;
      copy.modeMeta.createdAt = new Date().toISOString();
      copy.modeMeta.updatedAt = new Date().toISOString();
      copy.skills = copy.skills.map(s => ({...s, id: uid()}));
      state.sheets.unshift(copy);
      state.selectedId = copy.id;
      saveState();
      render();
    }

    function deleteSheet(sheetId = state.selectedId){
      if(state.sheets.length === 1){
        alert('Precisa existir ao menos uma ficha.');
        return;
      }
      const idx = state.sheets.findIndex(s => s.id === sheetId);
      if(idx < 0) return;
      const name = state.sheets[idx].info.name || 'esta ficha';
      if(!confirm(\`Excluir \${name}?\`)) return;
      state.sheets.splice(idx, 1);
      if(state.selectedId === sheetId){
        state.selectedId = state.sheets[Math.max(0, idx - 1)]?.id || state.sheets[0].id;
      }
      saveState();
      render();
    }

    function importJsonFile(file){
      const reader = new FileReader();
      reader.onload = () => {
        try{
          const data = JSON.parse(reader.result);
          if(Array.isArray(data.sheets)){
            const imported = data.sheets.map(normalizeSheet).map(s => ({...s, id: uid(), skills: s.skills.map(sk => ({...sk, id: uid()}))}));
            state.sheets.unshift(...imported);
            state.selectedId = imported[0]?.id || state.selectedId;
          }else{
            const imported = normalizeSheet(data);
            imported.id = uid();
            imported.skills = imported.skills.map(sk => ({...sk, id: uid()}));
            state.sheets.unshift(imported);
            state.selectedId = imported.id;
          }
          saveState();
          render();
          alert('Importação concluída.');
        }catch(err){
          console.error(err);
          alert('JSON inválido ou incompatível.');
        }
      };
      reader.readAsText(file, 'utf-8');
    }

    function downloadJson(obj, filename){
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function dateStamp(){
      const d = new Date();
      return \`\${d.getFullYear()}-\${String(d.getMonth()+1).padStart(2,'0')}-\${String(d.getDate()).padStart(2,'0')}\`;
    }

    function sanitizeFileName(name){
      return String(name).toLowerCase()
        .normalize('NFD').replace(/[\\u0300-\\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'ficha';
    }

    function openRollDialog(label, target){
      const roll = Math.floor(Math.random() * 100) + 1;
      const isFumble = target < 50 ? roll >= 96 : roll === 100;
      const isCritical = roll === 1;
      let text = 'Falha';
      let cls = 'res-fail';

      if(isCritical){
        text = 'Sucesso crítico';
        cls = 'res-critical';
      }else if(isFumble){
        text = 'Desastre';
        cls = 'res-fumble';
      }else if(roll <= extreme(target)){
        text = 'Sucesso extremo';
        cls = 'res-extreme';
      }else if(roll <= hard(target)){
        text = 'Sucesso difícil';
        cls = 'res-hard';
      }else if(roll <= target){
        text = 'Sucesso regular';
        cls = 'res-regular';
      }

      document.getElementById('rollTitle').textContent = label;
      document.getElementById('rollMeta').textContent = \`Alvo \${target}\`;
      document.getElementById('rollNumber').textContent = String(roll).padStart(2,'0');
      const badge = document.getElementById('rollBadge');
      badge.className = \`result-badge \${cls}\`;
      badge.textContent = text;
      document.getElementById('rollThresholds').textContent = \`Difícil \${hard(target)} · Extrema \${extreme(target)}\`;
      document.getElementById('rollDialog').showModal();
    }

    function escapeHtml(str){
      return String(str ?? '')
        .replaceAll('&','&amp;')
        .replaceAll('<','&lt;')
        .replaceAll('>','&gt;')
        .replaceAll('"','&quot;')
        .replaceAll(\"'\",\"&#39;\");
    }

    function escapeAttr(str){
      return escapeHtml(str).replaceAll('`','&#96;');
    }

    document.getElementById('newSheetBtn').onclick = () => {
      const sheet = createDefaultSheet();
      state.sheets.unshift(sheet);
      state.selectedId = sheet.id;
      saveState();
      render();
    };

    document.getElementById('duplicateBtn').onclick = () => duplicateSheet(state.selectedId);
    document.getElementById('deleteBtn').onclick = () => deleteSheet(state.selectedId);
    document.getElementById('exportBtn').onclick = () => exportSheet(state.selectedId);
    document.getElementById('exportAllBtn').onclick = exportAll;
    document.getElementById('importBtn').onclick = () => document.getElementById('importFile').click();
    document.getElementById('importFile').onchange = (e) => {
      const file = e.target.files[0];
      if(file) importJsonFile(file);
      e.target.value = '';
    };

    document.getElementById('sheetSearch').addEventListener('input', e => {
      state.filter = e.target.value;
      renderList();
    });

    document.getElementById('quickRollBtn').onclick = () => openRollDialog('D100 livre', 0);

    document.getElementById('expandAllBtn').onclick = () => {
      updateSelected(sheet => {
        Object.keys({...DEFAULT_GROUPS_OPEN, ...(sheet.ui.openGroups||{})}).forEach(k => sheet.ui.openGroups[k] = true);
      });
    };

    document.getElementById('collapseAllBtn').onclick = () => {
      updateSelected(sheet => {
        Object.keys({...DEFAULT_GROUPS_OPEN, ...(sheet.ui.openGroups||{})}).forEach(k => sheet.ui.openGroups[k] = false);
      });
    };

    state.sheets.forEach(autoCalculate);
    saveState();
    render();
}

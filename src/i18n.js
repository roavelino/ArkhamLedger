export const DEFAULT_LOCALE = 'pt-BR';
export const SUPPORTED_LOCALES = ['pt-BR', 'en'];
export const LOCALE_STORAGE_KEY = 'arkham-ledger:locale';

const TRANSLATIONS = {
  'pt-BR': {
    'lang.pt-BR': 'PT-BR',
    'lang.en': 'EN',
    'app.title': 'Arkham Ledger | Gerenciador de Fichas CoC',
    'app.brandSub.sheets': 'Fichas de Investigadores · CoC',
    'app.brandSub.sheetsWorkspace': 'Fichas, NPCs e revelacoes',
    'app.brandSub.campaignsWorkspace': 'Campanhas, jogadores e investigacao',
    'app.newSheet': 'Nova ficha',
    'app.newCampaign': 'Nova campanha',
    'app.quickNpc': 'NPC rapido',
    'app.generateNpc': 'Gerar NPC',
    'app.searchSheets': 'Buscar ficha...',
    'app.searchCampaigns': 'Buscar campanha...',
    'app.footerHint': 'Dica: exporte a ficha como JSON para compartilhar. Para imprimir, use o menu do navegador.',
    'app.noneSelected': 'Nada selecionado',
    'app.noSession': 'Sem sessao',
    'app.pendingChanges': 'Alteracoes pendentes',
    'app.allSaved': 'Tudo salvo',
    'app.workspace.sheets': 'Fichas',
    'app.workspace.campaigns': 'Campanhas',
    'app.workspace.dmScreen': 'Tela do Mestre',
    'app.workspace.maps': 'Mapas',
    'app.role.dm': 'Perfil DM',
    'app.role.player': 'Perfil Player',
    'app.save': 'Salvar',
    'app.pdf': 'PDF',
    'app.deactivate': 'Inativar',
    'app.activate': 'Ativar',
    'app.logout': 'Sair',
    'app.duplicate': 'Duplicar',
    'app.downloadJson': 'Download JSON',
    'app.delete': 'Excluir',
    'app.exportedSheet': 'Ficha exportada',
    'app.exportedCampaign': 'Campanha exportada',
    'app.pdfOpenError': 'Nao foi possivel abrir a janela de impressao.',
    'app.pdfRenderError': 'Falha ao preparar o PDF para impressao.',
    'app.playerCreateBlocked': 'Players so podem criar ficha sem personagem ativo.',
    'app.generatedNpc': 'Rascunho de NPC gerado',
    'common.npc': 'NPC',
    'common.investigator': 'Investigador',
    'common.active': 'Ativa',
    'common.inactive': 'Inativa',
    'login.title': 'Arkham Ledger | Login',
    'login.subtitle': 'Autenticacao por email e senha',
    'login.signIn': 'Entrar',
    'login.signUp': 'Criar conta',
    'login.email': 'Email',
    'login.password': 'Senha',
    'login.confirmPassword': 'Confirmar senha',
    'login.nameOptional': 'Nome (opcional)',
    'login.mismatchPassword': 'As senhas nao coincidem.',
    'auth.supabaseMissing': 'Falha ao carregar Supabase.',
    'auth.signinFallback': 'Falha no login',
    'auth.signupFallback': 'Falha ao criar conta',
    'auth.genericFallback': 'Erro de autenticacao',
    'auth.invalidCredentials': 'Email ou senha incorretos. (Supabase: Invalid login credentials)',
    'auth.emailNotConfirmed': 'Conta aguardando confirmacao de email. (Supabase: Email not confirmed)',
    'auth.userExists': 'Ja existe uma conta com este email. (Supabase: User already registered)',
    'auth.invalidPassword': 'Senha invalida. ({message})',
    'auth.signupAuto': 'Conta criada com login automatico.',
    'auth.signupPending': 'Conta criada. Aguardando confirmacao de email.',
    'auth.signupDone': 'Conta criada.',
    'auth.signinSuccess': 'Login realizado com sucesso.',
    'pdf.titleSuffix': 'Arkham Ledger PDF',
    'pdf.noPortrait': 'Sem retrato',
    'pdf.noPortraitRegistered': 'Sem retrato cadastrado',
    'pdf.age': 'Idade',
    'pdf.occupation': 'Ocupacao',
    'pdf.origin': 'Origem',
    'pdf.campaign': 'Campanha',
    'pdf.description': 'Descricao',
    'pdf.noDescription': 'Sem descricao.',
    'pdf.skills': 'Pericias',
    'pdf.skill': 'Pericia',
    'pdf.base': 'Base',
    'pdf.current': 'Atual',
    'pdf.hard': 'Dif',
    'pdf.extreme': 'Ext',
    'pdf.notes': 'Anotacoes',
    'pdf.noNotes': 'Sem anotacoes.',
    'pdf.loading': 'Preparando impressao...'
  },
  en: {
    'lang.pt-BR': 'PT-BR',
    'lang.en': 'EN',
    'app.title': 'Arkham Ledger | CoC Sheet Manager',
    'app.brandSub.sheets': 'Investigator Sheets · CoC',
    'app.brandSub.sheetsWorkspace': 'Sheets, NPCs and revelations',
    'app.brandSub.campaignsWorkspace': 'Campaigns, players and investigation',
    'app.newSheet': 'New sheet',
    'app.newCampaign': 'New campaign',
    'app.quickNpc': 'Quick NPC',
    'app.generateNpc': 'Generate NPC',
    'app.searchSheets': 'Search sheet...',
    'app.searchCampaigns': 'Search campaign...',
    'app.footerHint': 'Tip: export the sheet as JSON to share it. To print, use the browser print menu.',
    'app.noneSelected': 'Nothing selected',
    'app.noSession': 'No session',
    'app.pendingChanges': 'Pending changes',
    'app.allSaved': 'All saved',
    'app.workspace.sheets': 'Sheets',
    'app.workspace.campaigns': 'Campaigns',
    'app.workspace.dmScreen': 'DM Screen',
    'app.workspace.maps': 'Maps',
    'app.role.dm': 'DM Profile',
    'app.role.player': 'Player Profile',
    'app.save': 'Save',
    'app.pdf': 'PDF',
    'app.deactivate': 'Deactivate',
    'app.activate': 'Activate',
    'app.logout': 'Log out',
    'app.duplicate': 'Duplicate',
    'app.downloadJson': 'Download JSON',
    'app.delete': 'Delete',
    'app.exportedSheet': 'Sheet exported',
    'app.exportedCampaign': 'Campaign exported',
    'app.pdfOpenError': 'Could not open the print window.',
    'app.pdfRenderError': 'Failed to prepare the PDF for printing.',
    'app.playerCreateBlocked': 'Players can only create a sheet when they do not already have an active character.',
    'app.generatedNpc': 'NPC draft generated',
    'common.npc': 'NPC',
    'common.investigator': 'Investigator',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'login.title': 'Arkham Ledger | Login',
    'login.subtitle': 'Email and password authentication',
    'login.signIn': 'Sign in',
    'login.signUp': 'Create account',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.confirmPassword': 'Confirm password',
    'login.nameOptional': 'Name (optional)',
    'login.mismatchPassword': 'Passwords do not match.',
    'auth.supabaseMissing': 'Failed to load Supabase.',
    'auth.signinFallback': 'Login failed',
    'auth.signupFallback': 'Could not create account',
    'auth.genericFallback': 'Authentication error',
    'auth.invalidCredentials': 'Incorrect email or password. (Supabase: Invalid login credentials)',
    'auth.emailNotConfirmed': 'Account is waiting for email confirmation. (Supabase: Email not confirmed)',
    'auth.userExists': 'An account with this email already exists. (Supabase: User already registered)',
    'auth.invalidPassword': 'Invalid password. ({message})',
    'auth.signupAuto': 'Account created with automatic sign-in.',
    'auth.signupPending': 'Account created. Waiting for email confirmation.',
    'auth.signupDone': 'Account created.',
    'auth.signinSuccess': 'Signed in successfully.',
    'pdf.titleSuffix': 'Arkham Ledger PDF',
    'pdf.noPortrait': 'No portrait',
    'pdf.noPortraitRegistered': 'No portrait uploaded',
    'pdf.age': 'Age',
    'pdf.occupation': 'Occupation',
    'pdf.origin': 'Origin',
    'pdf.campaign': 'Campaign',
    'pdf.description': 'Description',
    'pdf.noDescription': 'No description.',
    'pdf.skills': 'Skills',
    'pdf.skill': 'Skill',
    'pdf.base': 'Base',
    'pdf.current': 'Current',
    'pdf.hard': 'Hard',
    'pdf.extreme': 'Extreme',
    'pdf.notes': 'Notes',
    'pdf.noNotes': 'No notes.',
    'pdf.loading': 'Preparing print preview...'
  }
};

export function normalizeLocale(locale) {
  const value = String(locale || '').trim();
  if (value === 'pt' || value === 'ptBR' || value === 'pt-BR') return 'pt-BR';
  if (value === 'en' || value === 'en-US' || value === 'en-GB') return 'en';
  return DEFAULT_LOCALE;
}

export function getStoredLocale() {
  try {
    return normalizeLocale(globalThis.localStorage?.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function setStoredLocale(locale) {
  const normalized = normalizeLocale(locale);
  try {
    globalThis.localStorage?.setItem(LOCALE_STORAGE_KEY, normalized);
  } catch {}
  return normalized;
}

export function setCurrentLocale(locale) {
  const normalized = setStoredLocale(locale);
  if (typeof document !== 'undefined') {
    document.documentElement.lang = normalized;
  }
  return normalized;
}

export function getCurrentLocale() {
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return normalizeLocale(document.documentElement.lang);
  }
  return getStoredLocale();
}

export function translate(key, variables = {}, locale = getCurrentLocale()) {
  const normalized = normalizeLocale(locale);
  const template = TRANSLATIONS[normalized]?.[key] ?? TRANSLATIONS[DEFAULT_LOCALE]?.[key] ?? key;
  return String(template).replace(/\{(\w+)\}/g, (_, token) => String(variables[token] ?? ''));
}

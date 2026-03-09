import { authErrorToMessage, signinSuccessMessage, signupSuccessMessage } from './auth/authFeedback.js';
import { createRuntimeBrowserClient } from './browser/supabaseBrowserClient.js';
import { getStoredLocale, setCurrentLocale, translate } from './i18n.js';

const PUBLIC_CONFIRMATION_REDIRECT_URL = 'https://roavelino.github.io/ArkhamLedger/login.html';

const el = {
  message: document.getElementById('authMessage'),
  languageSelect: document.getElementById('languageSelect'),
  subtitle: document.getElementById('loginSubtitle'),
  loginTab: document.getElementById('loginTab'),
  signupTab: document.getElementById('signupTab'),
  loginForm: document.getElementById('loginForm'),
  signupForm: document.getElementById('signupForm'),
  loginEmailLabel: document.getElementById('loginEmailLabel'),
  loginPasswordLabel: document.getElementById('loginPasswordLabel'),
  loginSubmitBtn: document.getElementById('loginSubmitBtn'),
  signupNameLabel: document.getElementById('signupNameLabel'),
  signupEmailLabel: document.getElementById('signupEmailLabel'),
  signupPasswordLabel: document.getElementById('signupPasswordLabel'),
  signupPasswordConfirmLabel: document.getElementById('signupPasswordConfirmLabel'),
  signupSubmitBtn: document.getElementById('signupSubmitBtn')
};

let mode = 'login';
let supabase = null;
let locale = setCurrentLocale(getStoredLocale());

void initialize();

async function initialize() {
  applyTranslations();

  try {
    supabase = createRuntimeBrowserClient();
  } catch (error) {
    showMessage(error?.message || translate('auth.supabaseMissing', {}, locale), 'error');
    return;
  }

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session?.user) {
    redirectToApp();
    return;
  }

  bindEvents();
  setMode('login');
}

function bindEvents() {
  el.languageSelect?.addEventListener('change', (event) => {
    locale = setCurrentLocale(event.target.value);
    applyTranslations();
  });

  el.loginTab?.addEventListener('click', () => setMode('login'));
  el.signupTab?.addEventListener('click', () => setMode('signup'));

  el.loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('loginEmail')?.value || '';
    const password = document.getElementById('loginPassword')?.value || '';

    const { error } = await supabase.auth.signInWithPassword({
      email: String(email).trim(),
      password: String(password)
    });

    if (error) {
      showMessage(authErrorToMessage(error, translate('auth.signinFallback', {}, locale), locale), 'error');
      return;
    }

    showMessage(signinSuccessMessage(locale), 'success');
    redirectToApp();
  });

  el.signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const displayName = document.getElementById('signupName')?.value || '';
    const email = document.getElementById('signupEmail')?.value || '';
    const password = document.getElementById('signupPassword')?.value || '';
    const confirm = document.getElementById('signupPasswordConfirm')?.value || '';

    if (password !== confirm) {
      showMessage(translate('login.mismatchPassword', {}, locale), 'error');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: String(email).trim(),
      password: String(password),
      options: {
        emailRedirectTo: PUBLIC_CONFIRMATION_REDIRECT_URL,
        data: {
          display_name: String(displayName).trim() || null
        }
      }
    });

    if (error) {
      showMessage(authErrorToMessage(error, translate('auth.signupFallback', {}, locale), locale), 'error');
      return;
    }

    const message = signupSuccessMessage(data, locale);
    showMessage(message, 'success');

    if (data?.session && data?.user) {
      redirectToApp();
    }
  });
}

function setMode(nextMode) {
  mode = nextMode;
  const isLogin = mode === 'login';

  if (el.loginForm) el.loginForm.classList.toggle('hidden', !isLogin);
  if (el.signupForm) el.signupForm.classList.toggle('hidden', isLogin);

  if (el.loginTab) el.loginTab.classList.toggle('active', isLogin);
  if (el.signupTab) el.signupTab.classList.toggle('active', !isLogin);
}

function applyTranslations() {
  document.title = translate('login.title', {}, locale);
  if (el.subtitle) el.subtitle.textContent = translate('login.subtitle', {}, locale);
  if (el.loginTab) el.loginTab.textContent = translate('login.signIn', {}, locale);
  if (el.signupTab) el.signupTab.textContent = translate('login.signUp', {}, locale);
  if (el.loginEmailLabel) el.loginEmailLabel.textContent = translate('login.email', {}, locale);
  if (el.loginPasswordLabel) el.loginPasswordLabel.textContent = translate('login.password', {}, locale);
  if (el.loginSubmitBtn) el.loginSubmitBtn.textContent = translate('login.signIn', {}, locale);
  if (el.signupNameLabel) el.signupNameLabel.textContent = translate('login.nameOptional', {}, locale);
  if (el.signupEmailLabel) el.signupEmailLabel.textContent = translate('login.email', {}, locale);
  if (el.signupPasswordLabel) el.signupPasswordLabel.textContent = translate('login.password', {}, locale);
  if (el.signupPasswordConfirmLabel) el.signupPasswordConfirmLabel.textContent = translate('login.confirmPassword', {}, locale);
  if (el.signupSubmitBtn) el.signupSubmitBtn.textContent = translate('login.signUp', {}, locale);

  if (el.languageSelect) {
    el.languageSelect.innerHTML = `
      <option value="pt-BR">${translate('lang.pt-BR', {}, locale)}</option>
      <option value="en">${translate('lang.en', {}, locale)}</option>
    `;
    el.languageSelect.value = locale;
  }
}

function showMessage(message, type) {
  if (!el.message) return;
  el.message.textContent = message;
  el.message.className = `message ${type === 'success' ? 'success' : 'error'}`;
}

function redirectToApp() {
  window.location.href = './index.html';
}

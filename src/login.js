import { authErrorToMessage, signinSuccessMessage, signupSuccessMessage } from './auth/authFeedback.js';
import { getRuntimeSupabaseConfig } from './runtimeConfig.js';

const runtimeConfig = getRuntimeSupabaseConfig();
const SUPABASE_URL = runtimeConfig.url;
const SUPABASE_PUBLISHABLE_KEY = runtimeConfig.publishableKey;
const createClient = globalThis.supabase?.createClient;

const el = {
  message: document.getElementById('authMessage'),
  loginTab: document.getElementById('loginTab'),
  signupTab: document.getElementById('signupTab'),
  loginForm: document.getElementById('loginForm'),
  signupForm: document.getElementById('signupForm')
};

let mode = 'login';
let supabase = null;

void initialize();

async function initialize() {
  if (!createClient) {
    showMessage('SDK do Supabase nao carregado.', 'error');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    showMessage('Configuracao do Supabase ausente no HTML.', 'error');
    return;
  }

  supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

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
      showMessage(authErrorToMessage(error, 'Falha no login'), 'error');
      return;
    }

    showMessage(signinSuccessMessage(), 'success');
    redirectToApp();
  });

  el.signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const displayName = document.getElementById('signupName')?.value || '';
    const email = document.getElementById('signupEmail')?.value || '';
    const password = document.getElementById('signupPassword')?.value || '';
    const confirm = document.getElementById('signupPasswordConfirm')?.value || '';

    if (password !== confirm) {
      showMessage('As senhas nao coincidem.', 'error');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: String(email).trim(),
      password: String(password),
      options: {
        data: {
          display_name: String(displayName).trim() || null
        }
      }
    });

    if (error) {
      showMessage(authErrorToMessage(error, 'Falha ao criar conta'), 'error');
      return;
    }

    const message = signupSuccessMessage(data);
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

function showMessage(message, type) {
  if (!el.message) return;
  el.message.textContent = message;
  el.message.className = `message ${type === 'success' ? 'success' : 'error'}`;
}

function redirectToApp() {
  window.location.href = './index.html';
}

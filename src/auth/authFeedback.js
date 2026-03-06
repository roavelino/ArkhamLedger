export function authErrorToMessage(error, fallbackPrefix = 'Erro de autenticacao') {
  const raw = String(error?.message || '').trim();
  if (!raw) return `${fallbackPrefix}.`;

  const normalized = raw.toLowerCase();
  if (normalized.includes('invalid login credentials')) {
    return 'Email ou senha incorretos. (Supabase: Invalid login credentials)';
  }
  if (normalized.includes('email not confirmed')) {
    return 'Conta aguardando confirmacao de email. (Supabase: Email not confirmed)';
  }
  if (normalized.includes('user already registered')) {
    return 'Ja existe uma conta com este email. (Supabase: User already registered)';
  }
  if (normalized.includes('password should be at least')) {
    return `Senha invalida. (${raw})`;
  }

  return `${fallbackPrefix}: ${raw}`;
}

export function signupSuccessMessage(result) {
  if (result?.session && result?.user) {
    return 'Conta criada com login automatico.';
  }
  if (result?.user && !result?.session) {
    return 'Conta criada. Aguardando confirmacao de email.';
  }
  return 'Conta criada.';
}

export function signinSuccessMessage() {
  return 'Login realizado com sucesso.';
}

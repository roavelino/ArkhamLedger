import { translate } from '../i18n.js';

export function authErrorToMessage(error, fallbackPrefix = translate('auth.genericFallback'), locale) {
  const raw = String(error?.message || '').trim();
  if (!raw) return `${fallbackPrefix}.`;

  const normalized = raw.toLowerCase();
  if (normalized.includes('invalid login credentials')) {
    return translate('auth.invalidCredentials', {}, locale);
  }
  if (normalized.includes('email not confirmed')) {
    return translate('auth.emailNotConfirmed', {}, locale);
  }
  if (normalized.includes('user already registered')) {
    return translate('auth.userExists', {}, locale);
  }
  if (normalized.includes('password should be at least')) {
    return translate('auth.invalidPassword', { message: raw }, locale);
  }

  return `${fallbackPrefix}: ${raw}`;
}

export function signupSuccessMessage(result, locale) {
  if (result?.session && result?.user) {
    return translate('auth.signupAuto', {}, locale);
  }
  if (result?.user && !result?.session) {
    return translate('auth.signupPending', {}, locale);
  }
  return translate('auth.signupDone', {}, locale);
}

export function signinSuccessMessage(locale) {
  return translate('auth.signinSuccess', {}, locale);
}

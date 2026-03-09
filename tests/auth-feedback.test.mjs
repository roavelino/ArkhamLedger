import test from 'node:test';
import assert from 'node:assert/strict';
import { authErrorToMessage, signupSuccessMessage, signinSuccessMessage } from '../src/auth/authFeedback.js';

test('signin success message', () => {
  assert.equal(signinSuccessMessage(), 'Login realizado com sucesso.');
});

test('signup success with confirmation pending', () => {
  const message = signupSuccessMessage({ user: { id: '1' }, session: null });
  assert.equal(message, 'Conta criada. Aguardando confirmacao de email.');
});

test('signup success with automatic login', () => {
  const message = signupSuccessMessage({ user: { id: '1' }, session: { access_token: 'x' } });
  assert.equal(message, 'Conta criada com login automatico.');
});

test('maps invalid credentials error', () => {
  const message = authErrorToMessage({ message: 'Invalid login credentials' }, 'Falha no login');
  assert.equal(message, 'Email ou senha incorretos. (Supabase: Invalid login credentials)');
});

test('maps not confirmed error', () => {
  const message = authErrorToMessage({ message: 'Email not confirmed' }, 'Falha no login');
  assert.equal(message, 'Conta aguardando confirmacao de email. (Supabase: Email not confirmed)');
});

test('maps already registered error', () => {
  const message = authErrorToMessage({ message: 'User already registered' }, 'Falha ao criar conta');
  assert.equal(message, 'Ja existe uma conta com este email. (Supabase: User already registered)');
});

test('fallback includes raw supabase message', () => {
  const message = authErrorToMessage({ message: 'Unexpected error from provider' }, 'Falha geral');
  assert.equal(message, 'Falha geral: Unexpected error from provider');
});

test('english signin success message', () => {
  assert.equal(signinSuccessMessage('en'), 'Signed in successfully.');
});

import { getSession, getProfile, onAuthStateChange, signInWithPassword, signOut } from './authClient.js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export async function login(credentials: LoginCredentials) {
  const session = await signInWithPassword(credentials.email, credentials.password);
  const profile = await getProfile(session.user.id);

  return {
    session,
    profile
  };
}

export async function logout() {
  await signOut();
}

export async function bootstrapSession() {
  const session = await getSession();

  if (!session?.user) {
    return null;
  }

  const profile = await getProfile(session.user.id);

  return {
    session,
    profile
  };
}

export function subscribeAuthState(handler: (isLoggedIn: boolean) => void) {
  return onAuthStateChange((_event, session) => {
    handler(Boolean(session?.user));
  });
}

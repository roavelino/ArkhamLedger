import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { createBrowserSupabaseClient, type Database } from '../database/supabaseClient.js';

const supabase = createBrowserSupabaseClient();

export interface AuthProfile {
  id: string;
  role: 'player' | 'dm';
  display_name: string | null;
}

export interface AuthContext {
  user: User;
  session: Session;
  profile: AuthProfile;
}

export async function signInWithPassword(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.session) {
    throw new Error(error?.message ?? 'Failed to sign in.');
  }

  return data.session;
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getSession(): Promise<Session | null> {
  const { data, error } = await supabase.auth.getSession();
  if (error) {
    throw new Error(error.message);
  }

  return data.session;
}

export async function getProfile(userId: string): Promise<AuthProfile> {
  const { data, error } = await supabase
    .from('users')
    .select('id, role, display_name')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? 'Unable to load user profile.');
  }

  return data as AuthProfile;
}

export async function requireAuthContext(): Promise<AuthContext> {
  const session = await getSession();
  if (!session?.user) {
    throw new Error('User is not authenticated.');
  }

  const profile = await getProfile(session.user.id);
  return {
    user: session.user,
    session,
    profile
  };
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void
): { unsubscribe: () => void } {
  const {
    data: { subscription }
  } = supabase.auth.onAuthStateChange(callback);

  return {
    unsubscribe: () => subscription.unsubscribe()
  };
}

export function getAuthClient() {
  return supabase;
}

export type AppDatabase = Database;

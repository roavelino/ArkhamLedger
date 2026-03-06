import { getRuntimeSupabaseConfig } from '../runtimeConfig.js';

export function createRuntimeBrowserClient() {
  const createClient = globalThis.supabase?.createClient;
  if (!createClient) {
    throw new Error('Supabase SDK local nao carregado.');
  }

  const runtimeConfig = getRuntimeSupabaseConfig();
  if (!runtimeConfig.url || !runtimeConfig.publishableKey) {
    throw new Error('Configuracao do Supabase ausente no HTML.');
  }

  return createClient(runtimeConfig.url, runtimeConfig.publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

export function createSupabaseClient(config) {
  return {
    config,
    isConfigured: Boolean(config?.url && config?.anonKey)
  };
}

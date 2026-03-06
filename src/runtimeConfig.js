export function getRuntimeSupabaseConfig() {
  return {
    url: readMetaContent('supabase-url'),
    publishableKey: readMetaContent('supabase-publishable-key')
  };
}

function readMetaContent(name) {
  const value = document.querySelector(`meta[name="${name}"]`)?.getAttribute('content');
  return String(value || '').trim();
}

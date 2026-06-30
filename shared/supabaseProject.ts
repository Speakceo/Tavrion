/** Public Supabase project — anon key is client-safe and already shipped in the frontend bundle. */
export const SUPABASE_PROJECT_URL = 'https://jilehijfjayayfumbrsl.supabase.co';
export const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbGVoaWpmamF5YXlmdW1icnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzQ1ODQsImV4cCI6MjA5Nzk1MDU4NH0.UFzU1lXpguU3NoW8zKqsfYUVMdIgxOrSbofWV7OmmQw';

/** Minimal external pings — empty results still count as Supabase activity. */
export const SUPABASE_KEEPALIVE_PATHS = [
  '/auth/v1/health',
  '/rest/v1/organizations?select=id&limit=1',
] as const;

export function supabaseKeepaliveHeaders() {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
  };
}

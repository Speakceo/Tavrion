/**
 * Server-side keepalive helpers.
 * Prefer Netlify/Vercel env (SUPABASE_URL + SUPABASE_ANON_KEY). Never import this from the browser bundle.
 */
const FALLBACK_URL = 'https://jilehijfjayayfumbrsl.supabase.co';

function readEnv(name: string): string | undefined {
  try {
    // Deno (Edge) / Node
    const fromProcess = typeof process !== 'undefined' ? process.env?.[name] : undefined;
    if (fromProcess) return fromProcess;
  } catch {
    /* ignore */
  }
  return undefined;
}

export const SUPABASE_PROJECT_URL =
  readEnv('SUPABASE_URL') ||
  readEnv('VITE_SUPABASE_URL_ORIGIN') ||
  FALLBACK_URL;

export const SUPABASE_ANON_KEY =
  readEnv('SUPABASE_ANON_KEY') ||
  readEnv('VITE_SUPABASE_ANON_KEY') ||
  '';

/** Minimal external pings — empty results still count as Supabase activity. */
export const SUPABASE_KEEPALIVE_PATHS = [
  '/auth/v1/health',
  '/rest/v1/organizations?select=id&limit=1',
] as const;

export function supabaseKeepaliveHeaders() {
  if (!SUPABASE_ANON_KEY) {
    throw new Error('SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY) is required for keepalive');
  }
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Accept: 'application/json',
  };
}

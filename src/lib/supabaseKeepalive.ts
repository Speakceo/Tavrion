import { getSupabaseAnonKey, getSupabaseUrl } from './supabaseEnv';

const SESSION_KEY = 'tavrion_supabase_keepalive';
const MIN_INTERVAL_MS = 4 * 60 * 60 * 1000;

const KEEPALIVE_PATHS = [
  '/auth/v1/health',
  '/rest/v1/organizations?select=id&limit=1',
] as const;

/** Lightweight client ping when the app loads (backup to scheduled keepalives). */
export function pingSupabaseKeepalive() {
  try {
    const last = sessionStorage.getItem(SESSION_KEY);
    if (last && Date.now() - Number(last) < MIN_INTERVAL_MS) return;
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable
  }

  let base: string;
  let key: string;
  try {
    base = getSupabaseUrl().replace(/\/$/, '');
    key = getSupabaseAnonKey();
  } catch {
    return;
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  };

  for (const path of KEEPALIVE_PATHS) {
    void fetch(`${base}${path}`, { headers }).catch(() => {});
  }
}

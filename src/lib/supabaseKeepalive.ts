import {
  SUPABASE_KEEPALIVE_PATHS,
  SUPABASE_PROJECT_URL,
  supabaseKeepaliveHeaders,
} from '../../shared/supabaseProject';

const SESSION_KEY = 'tavrion_supabase_keepalive';
const MIN_INTERVAL_MS = 4 * 60 * 60 * 1000;

/** Lightweight client ping when the app loads (backup to scheduled keepalives). */
export function pingSupabaseKeepalive() {
  try {
    const last = sessionStorage.getItem(SESSION_KEY);
    if (last && Date.now() - Number(last) < MIN_INTERVAL_MS) return;
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable
  }

  const base = SUPABASE_PROJECT_URL.replace(/\/$/, '');
  const headers = supabaseKeepaliveHeaders();

  for (const path of SUPABASE_KEEPALIVE_PATHS) {
    void fetch(`${base}${path}`, { headers }).catch(() => {});
  }
}

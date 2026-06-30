const SESSION_KEY = 'tavrion_supabase_keepalive';
const MIN_INTERVAL_MS = 4 * 60 * 60 * 1000; // once per 4 hours per browser session

/** Lightweight client ping when the app is used (backup to scheduled GitHub Action). */
export function pingSupabaseKeepalive() {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!url || !key) return;

  try {
    const last = sessionStorage.getItem(SESSION_KEY);
    if (last && Date.now() - Number(last) < MIN_INTERVAL_MS) return;
    sessionStorage.setItem(SESSION_KEY, String(Date.now()));
  } catch {
    // sessionStorage unavailable (SSR / private mode)
  }

  const base = url.replace(/\/$/, '');
  const headers = { apikey: key, Authorization: `Bearer ${key}` };

  void fetch(`${base}/auth/v1/health`, { headers }).catch(() => {});
  void fetch(`${base}/rest/v1/organizations?select=id&limit=1`, { headers }).catch(() => {});
}

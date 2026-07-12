/**
 * Browser-facing Supabase endpoint.
 * All client traffic goes through this same-origin path so DevTools Network
 * never shows *.supabase.co. The real project URL lives only in server/hosting config.
 */
export const SUPABASE_PROXY_PATH = '/api/sb';

/** True when a URL would expose the Supabase project host to the browser. */
export function isSupabaseProjectHost(url: string): boolean {
  try {
    const host = new URL(url, 'http://local').hostname;
    return host.endsWith('.supabase.co') || host.endsWith('.supabase.in');
  } catch {
    return /supabase\.(co|in)/i.test(url);
  }
}

/**
 * Absolute Supabase URL for the browser (same-origin proxy).
 * Never returns a *.supabase.co host.
 */
export function getSupabaseUrl(): string {
  const configured = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();

  // Prefer explicit same-origin proxy path from env.
  if (configured && !isSupabaseProjectHost(configured)) {
    if (configured.startsWith('/')) {
      return typeof window !== 'undefined' ? `${window.location.origin}${configured}` : configured;
    }
    return configured;
  }

  // Legacy env still points at supabase.co — force proxy so it never hits the wire.
  if (typeof window !== 'undefined') {
    return `${window.location.origin}${SUPABASE_PROXY_PATH}`;
  }
  return SUPABASE_PROXY_PATH;
}

export function getSupabaseAnonKey(): string {
  const key = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
  if (!key) {
    throw new Error('Missing VITE_SUPABASE_ANON_KEY');
  }
  return key;
}

/** Relative proxy path for service workers / absolute-URL builders. */
export function getSupabaseProxyPath(): string {
  const configured = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
  if (configured?.startsWith('/') && !isSupabaseProjectHost(configured)) {
    return configured.replace(/\/$/, '') || SUPABASE_PROXY_PATH;
  }
  return SUPABASE_PROXY_PATH;
}

import type { Config } from '@netlify/functions';
import {
  SUPABASE_KEEPALIVE_PATHS,
  SUPABASE_PROJECT_URL,
  supabaseKeepaliveHeaders,
} from '../../shared/supabaseProject';

export default async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const nextRun = (body as { next_run?: string }).next_run;
  const base = SUPABASE_PROJECT_URL.replace(/\/$/, '');
  const headers = supabaseKeepaliveHeaders();
  const results: Record<string, number> = {};

  for (const path of SUPABASE_KEEPALIVE_PATHS) {
    const res = await fetch(`${base}${path}`, { headers });
    results[path] = res.status;
  }

  const ok = Object.values(results).some((code) => code === 200);
  console.log(JSON.stringify({ event: 'supabase_keepalive', next_run: nextRun, results, at: new Date().toISOString() }));

  return new Response(JSON.stringify({ ok, results }), { status: ok ? 200 : 502 });
};

export const config: Config = {
  schedule: '0 9 * * *',
};

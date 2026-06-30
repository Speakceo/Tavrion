import type { Config } from '@netlify/functions';

function env(name: string, fallback?: string) {
  return process.env[name] || fallback || '';
}

export default async (req: Request) => {
  const body = await req.json().catch(() => ({}));
  const nextRun = (body as { next_run?: string }).next_run;

  const base = env('SUPABASE_URL', env('VITE_SUPABASE_URL')).replace(/\/$/, '');
  const key = env('SUPABASE_ANON_KEY', env('VITE_SUPABASE_ANON_KEY'));

  if (!base || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY in Netlify env');
    return new Response(JSON.stringify({ ok: false, error: 'missing_env' }), { status: 500 });
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    Accept: 'application/json',
  };

  const enquiriesRes = await fetch(`${base}/rest/v1/enquiries?select=id&limit=1`, { headers });
  const enquiriesBody = await enquiriesRes.text();

  console.log(
    JSON.stringify({
      event: 'supabase_keepalive',
      next_run: nextRun,
      enquiries_status: enquiriesRes.status,
      enquiries_sample: enquiriesBody.slice(0, 120),
      at: new Date().toISOString(),
    }),
  );

  if (!enquiriesRes.ok) {
    return new Response(
      JSON.stringify({ ok: false, enquiries_status: enquiriesRes.status, body: enquiriesBody }),
      { status: 502 },
    );
  }

  return new Response(JSON.stringify({ ok: true, enquiries_status: enquiriesRes.status }), { status: 200 });
};

export const config: Config = {
  schedule: '0 9 * * *', // 09:00 UTC daily
};

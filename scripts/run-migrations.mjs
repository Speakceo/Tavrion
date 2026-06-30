#!/usr/bin/env node
/**
 * Apply all supabase/migrations/*.sql to the linked remote project
 * via Supabase Management API (no interactive DB password required).
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const PROJECT_REF = 'jilehijfjayayfumbrsl';
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is required');
  process.exit(1);
}

const SKIP_PATTERNS = [
  /already exists/i,
  /duplicate key value/i,
  /relation .* already exists/i,
  /policy .* already exists/i,
  /type .* already exists/i,
  /extension .* already exists/i,
  /column .* of relation .* already exists/i,
];

async function api(path, body, method = 'POST') {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

async function runQuery(sql) {
  return api('/database/query', { query: sql });
}

async function applyMigration(version, name, sql) {
  const res = await api('/database/migrations', {
    query: sql,
    name,
    rollback: '-- manual rollback not provided',
  });

  if (res.ok) return { status: 'applied', detail: res.data };

  const msg = JSON.stringify(res.data);
  if (SKIP_PATTERNS.some((p) => p.test(msg))) {
    return { status: 'skipped', detail: res.data };
  }

  // Fallback: run SQL directly (no migration history entry)
  const fallback = await runQuery(sql);
  if (fallback.ok) return { status: 'applied_via_query', detail: fallback.data };

  const fallbackMsg = JSON.stringify(fallback.data);
  if (SKIP_PATTERNS.some((p) => p.test(fallbackMsg))) {
    return { status: 'skipped', detail: fallback.data };
  }

  return { status: 'failed', detail: fallback.data ?? res.data, http: fallback.status };
}

async function main() {
  const dir = join(process.cwd(), 'supabase', 'migrations');
  const files = (await readdir(dir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files\n`);

  const results = { applied: 0, applied_via_query: 0, skipped: 0, failed: 0 };

  for (const file of files) {
    const version = file.replace(/\.sql$/, '').split('_')[0];
    const name = file.replace(/\.sql$/, '');
    const sql = await readFile(join(dir, file), 'utf8');

    process.stdout.write(`${file} ... `);
    const result = await applyMigration(version, name, sql);

    if (result.status === 'applied' || result.status === 'applied_via_query') {
      results[result.status]++;
      console.log(result.status === 'applied' ? 'OK' : 'OK (query)');
    } else if (result.status === 'skipped') {
      results.skipped++;
      console.log('SKIP (already exists)');
    } else {
      results.failed++;
      console.log('FAIL');
      console.error(JSON.stringify(result.detail, null, 2));
    }

    // Gentle rate limit
    await new Promise((r) => setTimeout(r, 300));
  }

  console.log('\n--- Summary ---');
  console.log(results);
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

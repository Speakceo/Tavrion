#!/usr/bin/env node
/**
 * Apply the uploaded_course lesson enum migration to the linked remote project.
 */
const PROJECT_REF = 'jilehijfjayayfumbrsl';
const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const SQL = "ALTER TYPE lesson_type ADD VALUE IF NOT EXISTS 'uploaded_course';";

if (!TOKEN) {
  console.error('SUPABASE_ACCESS_TOKEN is required');
  process.exit(1);
}

async function runQuery(query) {
  const res = await fetch(`${API}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query }),
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

const result = await runQuery(SQL);
if (result.ok) {
  console.log('Migration applied successfully.');
  process.exit(0);
}

const message = JSON.stringify(result.data);
if (/already exists/i.test(message)) {
  console.log('Enum value already exists. Nothing to do.');
  process.exit(0);
}

console.error('Migration failed:', message);
process.exit(1);

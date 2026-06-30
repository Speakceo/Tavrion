#!/usr/bin/env node
/** Manual keepalive check — no env vars required. */
const BASE = 'https://jilehijfjayayfumbrsl.supabase.co';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImppbGVoaWpmamF5YXlmdW1icnNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNzQ1ODQsImV4cCI6MjA5Nzk1MDU4NH0.UFzU1lXpguU3NoW8zKqsfYUVMdIgxOrSbofWV7OmmQw';

const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function ping(path, label) {
  const res = await fetch(`${BASE}${path}`, { headers });
  console.log(`${label}: HTTP ${res.status}`);
  return res.ok;
}

const authOk = await ping('/auth/v1/health', 'Auth health');
const restOk = await ping('/rest/v1/organizations?select=id&limit=1', 'REST organizations');
if (!authOk && !restOk) process.exit(1);
console.log('Keepalive OK');

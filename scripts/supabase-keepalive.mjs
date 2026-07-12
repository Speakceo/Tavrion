#!/usr/bin/env node
/** Manual keepalive check — uses SUPABASE_URL / SUPABASE_ANON_KEY from env (or .env). */
import { config } from 'dotenv';
config();

const BASE = (process.env.SUPABASE_URL || '').replace(/\/$/, '');
const KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

if (!BASE || !KEY) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY (server env) before running keepalive.');
  process.exit(1);
}

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

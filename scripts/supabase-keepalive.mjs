#!/usr/bin/env node
/**
 * Manual / local keepalive ping for Supabase free tier.
 * Usage: node scripts/supabase-keepalive.mjs
 * Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (or SUPABASE_URL, SUPABASE_ANON_KEY)
 */
import dotenv from 'dotenv';

dotenv.config();

const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function ping(path, label) {
  const res = await fetch(`${url}${path}`, { headers });
  const body = await res.text();
  console.log(`${label}: HTTP ${res.status}${body ? ` — ${body.slice(0, 120)}` : ''}`);
  return res.ok;
}

const authOk = await ping('/auth/v1/health', 'Auth health');
const restOk = await ping('/rest/v1/organizations?select=id&limit=1', 'REST organizations');

if (!authOk && !restOk) process.exit(1);
console.log('Keepalive OK');

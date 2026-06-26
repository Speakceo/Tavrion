#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const apiKey = process.env.RESEND_API_KEY?.trim();
const fromEmail = process.env.RESEND_FROM_EMAIL?.trim() || 'Tavrion Learning <noreply@jointavrion.com>';
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!apiKey || !apiKey.startsWith('re_')) {
  console.error('Set RESEND_API_KEY in .env (starts with re_). Get one at https://resend.com/api-keys');
  process.exit(1);
}

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const sb = createClient(supabaseUrl, serviceKey);

const testRes = await fetch('https://api.resend.com/domains', {
  headers: { Authorization: `Bearer ${apiKey}` },
});
const testBody = await testRes.json().catch(() => ({}));

const sendOnlyKey =
  !testRes.ok &&
  typeof testBody.message === 'string' &&
  testBody.message.toLowerCase().includes('restricted to only send');

if (!testRes.ok && !sendOnlyKey) {
  console.error('Resend API rejected the key:', testBody.message || testRes.status);
  process.exit(1);
}

if (sendOnlyKey) {
  console.log('Resend API key is valid (send-only). Skipping domain list.');
} else {
  console.log('Resend API key is valid. Domains:', (testBody.data || []).map((d) => d.name).join(', ') || '(none yet)');
}

await sb.from('app_secrets').upsert([
  {
    key: 'RESEND_API_KEY',
    value: apiKey,
    description: 'Resend API key for sending email nudges',
    updated_at: new Date().toISOString(),
  },
  {
    key: 'RESEND_FROM_EMAIL',
    value: fromEmail,
    description: 'Default from address for Resend emails',
    updated_at: new Date().toISOString(),
  },
], { onConflict: 'key' });

console.log('Saved RESEND_API_KEY and RESEND_FROM_EMAIL to app_secrets.');
console.log('From address:', fromEmail);
console.log('Verify jointavrion.com in Resend if using noreply@jointavrion.com');

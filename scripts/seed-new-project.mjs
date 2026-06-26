/**
 * Seed essential rows for a fresh Tavrion Supabase project.
 * Run from agent only — uses service role from env.
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function upsertOrg() {
  const { data: existing } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('slug', 'tavrion')
    .maybeSingle();

  if (existing) return existing.id;

  const { data, error } = await supabase
    .from('organizations')
    .insert({
      name: 'Tavrion Platform',
      slug: 'tavrion',
      description: 'The Tavrion learning platform',
      features: {
        mock_calls: true,
        ai_tutor: true,
        live_calls: true,
        social: true,
        events: true,
        polls: true,
        vault: true,
        shots: true,
        best_calls: true,
      },
      settings: {
        primary_color: '#171717',
        allow_self_signup: false,
        email_notifications: true,
        email_domain: 'jointavrion.com',
      },
      is_active: true,
    })
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

async function upsertUser({ unique_id, role, full_name, email, password, organization_id, is_platform_owner }) {
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('unique_id', unique_id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('user_profiles')
      .update({
        role,
        full_name,
        email,
        password,
        organization_id,
        is_platform_owner,
        is_active: true,
      })
      .eq('id', existing.id);
    if (error) throw error;
    return existing.id;
  }

  const id = randomUUID();
  const { error } = await supabase.from('user_profiles').insert({
    id,
    unique_id,
    role,
    full_name,
    email,
    password,
    organization_id,
    is_platform_owner,
    is_active: true,
    department: 'Platform',
    country: 'UK',
  });
  if (error) throw error;
  return id;
}

async function upsertSecret(key, value, description) {
  const { data: existing } = await supabase
    .from('app_secrets')
    .select('id')
    .eq('key', key)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('app_secrets').update({ value, description }).eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('app_secrets').insert({ key, value, description });
  if (error) throw error;
}

async function main() {
  console.log('Seeding', url);

  const orgId = await upsertOrg();
  console.log('Organization tavrion:', orgId);

  const ownerId = await upsertUser({
    unique_id: 'TavrionOwner',
    role: 'super_admin',
    full_name: 'Tavrion Platform Owner',
    email: 'owner@jointavrion.com',
    password: 'Tavrion@2026',
    organization_id: orgId,
    is_platform_owner: true,
  });
  console.log('Owner TavrionOwner:', ownerId);

  const masterId = await upsertUser({
    unique_id: 'MasterAdmin',
    role: 'super_admin',
    full_name: 'Master Admin',
    email: 'master@jointavrion.com',
    password: 'Tavrion@2026',
    organization_id: orgId,
    is_platform_owner: true,
  });
  console.log('Master MasterAdmin:', masterId);

  const adminId = await upsertUser({
    unique_id: 'Admin001',
    role: 'admin',
    full_name: 'Platform Admin',
    email: 'admin001@jointavrion.com',
    password: 'Tavrion@2026',
    organization_id: orgId,
    is_platform_owner: false,
  });
  console.log('Admin Admin001:', adminId);

  if (process.env.OPENAI_API_KEY) {
    await upsertSecret('OPENAI_API_KEY', process.env.OPENAI_API_KEY, 'OpenAI API key for AI features');
    console.log('OPENAI_API_KEY secret stored');
  }

  const { count: orgCount } = await supabase.from('organizations').select('*', { count: 'exact', head: true });
  const { count: userCount } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
  console.log('Done. organizations=', orgCount, 'users=', userCount);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

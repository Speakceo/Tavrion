import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Make sure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  console.log('Creating admin user...');

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: 'amberadmin001@amberstudent.com',
    password: 'Amber@2024',
    email_confirm: true
  });

  if (authError) {
    console.error('Error creating auth user:', authError.message);
    return;
  }

  console.log('Auth user created:', authData.user.id);

  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: authData.user.id,
      unique_id: 'Amberadmin001',
      full_name: 'Admin User',
      email: 'amberadmin001@amberstudent.com',
      role: 'admin',
      department: 'Administration',
      country: 'UK',
      is_active: true
    });

  if (profileError) {
    console.error('Error creating profile:', profileError.message);
    return;
  }

  console.log('✓ Admin user created successfully!');
  console.log('  User ID: Amberadmin001');
  console.log('  Password: Amber@2024');
  console.log('');
  console.log('You can now sign in at the login page with:');
  console.log('  User ID: Amberadmin001');
}

async function createTestUsers() {
  console.log('Creating test users Amber001 and Amber002...');

  for (let i = 1; i <= 2; i++) {
    const paddedNum = String(i).padStart(3, '0');
    const uniqueId = `Amber${paddedNum}`;
    const email = `amber${paddedNum}@amberstudent.com`;

    console.log(`Creating ${uniqueId}...`);

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'Amber@2024',
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log(`  ⚠ ${uniqueId} already exists, skipping...`);
        continue;
      }
      console.error(`  Error creating ${uniqueId}:`, authError.message);
      continue;
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        unique_id: uniqueId,
        full_name: `Test User ${paddedNum}`,
        email,
        role: 'employee',
        department: 'Testing',
        country: 'UK',
        is_active: true
      });

    if (profileError) {
      console.error(`  Error creating profile for ${uniqueId}:`, profileError.message);
      continue;
    }

    console.log(`  ✓ ${uniqueId} created successfully`);
  }
}

async function main() {
  console.log('=== Amberstudent LMS Setup ===\n');

  await createAdminUser();
  console.log('');
  await createTestUsers();

  console.log('\n=== Setup Complete ===');
  console.log('All users have the password: Amber@2024');
}

main();

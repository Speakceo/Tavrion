import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
});

console.log('Applying migration...');

const { error } = await supabase.rpc('exec', {
  sql: `
    CREATE POLICY IF NOT EXISTS "Users can create own profile"
      ON user_profiles FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = id);
  `
});

if (error) {
  console.error('Migration failed:', error);
  process.exit(1);
}

console.log('✓ Migration applied successfully!');
console.log('You can now sign up at /signup');

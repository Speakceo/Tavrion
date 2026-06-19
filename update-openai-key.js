#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function updateOpenAIKey() {
  console.log('\n🔑 Update OpenAI API Key\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Error: Supabase credentials not found in .env file');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('Enter your OpenAI API key:');
  console.log('(Get one from: https://platform.openai.com/api-keys)\n');

  const apiKey = await question('API Key: ');

  if (!apiKey || !apiKey.startsWith('sk-')) {
    console.error('\n❌ Invalid API key format. OpenAI keys start with "sk-"');
    rl.close();
    process.exit(1);
  }

  console.log('\n🔄 Updating API key in database...');

  const { error } = await supabase
    .from('app_secrets')
    .update({ value: apiKey, updated_at: new Date().toISOString() })
    .eq('key', 'OPENAI_API_KEY');

  if (error) {
    console.error('\n❌ Error updating API key:', error.message);
    rl.close();
    process.exit(1);
  }

  console.log('\n✅ Success! Your OpenAI API key has been updated.');
  console.log('\nYour AI features are now ready:');
  console.log('  • AI Tutor chat');
  console.log('  • Mock call simulations');
  console.log('  • AI course generation');
  console.log('  • Call evaluation');
  console.log('  • Presentation generation\n');

  rl.close();
}

updateOpenAIKey().catch((error) => {
  console.error('\n❌ Error:', error.message);
  rl.close();
  process.exit(1);
});

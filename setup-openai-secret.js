#!/usr/bin/env node

/**
 * Setup OpenAI API Key for Supabase Edge Functions
 *
 * This script helps you set the OPENAI_API_KEY secret for your edge functions.
 * You'll need a Supabase access token to run this.
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const PROJECT_REF = 'xrhnazsfntkwuzgalvwq';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function setSecret() {
  console.log('\n🔧 Setting up OpenAI API Key for Edge Functions\n');

  if (!OPENAI_API_KEY) {
    console.error('❌ Error: OPENAI_API_KEY not found in .env file');
    process.exit(1);
  }

  // Try to get access token from environment
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN;

  if (!accessToken) {
    console.log('📋 To set the secret, you need a Supabase access token.\n');
    console.log('Follow these steps:\n');
    console.log('1. Go to: https://supabase.com/dashboard/account/tokens');
    console.log('2. Click "Generate new token"');
    console.log('3. Copy the token and run:\n');
    console.log(`   export SUPABASE_ACCESS_TOKEN="your-token-here"`);
    console.log(`   node setup-openai-secret.js\n`);
    console.log('Or set it directly in the Supabase Dashboard:');
    console.log(`https://supabase.com/dashboard/project/${PROJECT_REF}/settings/functions\n`);
    process.exit(0);
  }

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/secrets`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify([
          {
            name: 'OPENAI_API_KEY',
            value: OPENAI_API_KEY
          }
        ])
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API Error: ${error}`);
    }

    console.log('✅ Success! OPENAI_API_KEY has been set for your edge functions.\n');
    console.log('Your AI features are now configured:');
    console.log('  • AI Tutor chat');
    console.log('  • Mock call simulations');
    console.log('  • AI course generation');
    console.log('  • Call evaluation\n');
  } catch (error) {
    console.error('❌ Error setting secret:', error.message);
    console.log('\n📋 Alternative: Set it manually in the Supabase Dashboard:');
    console.log(`https://supabase.com/dashboard/project/${PROJECT_REF}/settings/functions\n`);
    process.exit(1);
  }
}

setSecret();

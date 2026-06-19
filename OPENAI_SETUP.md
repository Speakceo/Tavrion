# OpenAI Integration Setup

Your LMS has been configured to use OpenAI for AI-powered features. The system is fully set up and ready to work once you provide a valid OpenAI API key.

## Current Status

All edge functions have been deployed and configured to retrieve the OpenAI API key securely from the database.

### Deployed Edge Functions

1. **ai-chat** - Powers the AI Tutor for interactive learning assistance
2. **mock-call-agent** - Simulates customer conversations for sales training
3. **mock-call-evaluate** - Evaluates and scores mock call performance
4. **generate-presentation** - Creates AI-generated presentation slides
5. **openai-proxy** - Handles text-to-speech and speech-to-text features

## What You Need To Do

The API key currently in your system is invalid or expired. You need to provide a valid OpenAI API key.

### Step 1: Get an OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-`)

### Step 2: Update the API Key

Run this command:

```bash
node update-openai-key.js
```

Follow the prompts to enter your new API key. The script will securely store it in the database.

## How It Works

The system uses a secure architecture:

1. **Database Storage**: The API key is stored in the `app_secrets` table
2. **Row Level Security**: The key is protected by RLS - only edge functions can access it
3. **No Exposure**: The key never appears in frontend code or client requests
4. **Edge Functions**: All 5 functions retrieve the key from the database at runtime

## Features That Use OpenAI

Once you provide a valid API key, these features will work:

- **AI Tutor**: Chat-based learning assistant for team members
- **Mock Calls**: Realistic conversation practice with AI personas
- **Call Evaluation**: Automated feedback and scoring on call performance
- **Course Generation**: AI-generated training content and courses
- **Presentations**: Auto-generated slides with content and speaker notes

## Verify It's Working

After updating your API key, test the AI Tutor:

1. Log into the LMS
2. Navigate to "AI Tutor" in the sidebar
3. Ask a question like "What is student accommodation?"
4. You should receive an AI-generated response

## Troubleshooting

If you encounter issues:

1. **"Incorrect API key"**: Your key is invalid or expired. Get a new one from OpenAI.
2. **"Secret not found"**: The database migration didn't run. Contact support.
3. **Rate limits**: You may need to upgrade your OpenAI plan for higher usage.

## Cost Information

OpenAI charges based on usage:
- GPT-4: More expensive but higher quality
- Text-to-Speech: Per character
- Whisper (Speech-to-Text): Per minute

Monitor your usage at: https://platform.openai.com/usage

## Security Notes

- The API key is stored encrypted at rest by Supabase
- Only service role (edge functions) can read the secret
- No user (admin or regular) can access the key through the app
- The key is never sent to the frontend

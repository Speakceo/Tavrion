# OpenRouter API Setup Guide

## Overview
This guide explains how to set up OpenRouter API for the Mock Call New feature.

## What is OpenRouter?

OpenRouter is a unified API for accessing multiple AI models from different providers (OpenAI, Anthropic, Google, Meta, etc.) through a single interface. Benefits include:

- **Cost Efficiency**: Better pricing than direct API access
- **Multiple Models**: Access Claude, GPT-4, Gemini, and more
- **Single Integration**: One API for all models
- **Automatic Failover**: Built-in redundancy
- **Usage Analytics**: Detailed cost tracking

## Getting Your OpenRouter API Key

### Step 1: Create an Account
1. Visit [https://openrouter.ai/](https://openrouter.ai/)
2. Click "Sign Up" or "Get Started"
3. Sign up with:
   - GitHub account (recommended)
   - Google account
   - Email

### Step 2: Add Credits (OPTIONAL)
**Important:** Mock Call New uses **FREE models**, so you don't need to add credits for AI conversations!

However, you still need OpenAI credits for speech services (Whisper & TTS).

**Free Models Used:**
- Llama 3.1 8B Instruct: FREE on OpenRouter
- Zero cost for customer simulation
- Zero cost for call evaluation

**Paid Services (OpenAI):**
- Whisper: $0.006 per minute (speech-to-text)
- TTS-1: $15 per 1M characters (text-to-speech)

### Step 3: Get Your API Key
1. Navigate to [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Click "Create Key"
3. Give it a name (e.g., "AmberStudent LMS")
4. Copy the API key (starts with `sk-or-v1-...`)
5. **Important:** Store it securely - you won't see it again!

## Adding the API Key to Your Application

### Method 1: Using SQL (Recommended)

Run this SQL query in your Supabase SQL Editor:

```sql
-- Insert OpenRouter API key
INSERT INTO app_secrets (key, value)
VALUES ('openrouter_api_key', 'sk-or-v1-YOUR_KEY_HERE')
ON CONFLICT (key)
DO UPDATE SET value = 'sk-or-v1-YOUR_KEY_HERE';
```

Replace `sk-or-v1-YOUR_KEY_HERE` with your actual API key.

### Method 2: Using the Setup Script

If you have a setup script, run:

```bash
node setup-openrouter-secret.js
```

And enter your API key when prompted.

## Verifying the Setup

### Check Secret Exists

```sql
SELECT key,
       LEFT(value, 10) || '...' as value_preview,
       created_at
FROM app_secrets
WHERE key = 'openrouter_api_key';
```

You should see:
```
key                  | value_preview      | created_at
---------------------|-------------------|------------------
openrouter_api_key   | sk-or-v1-...      | 2024-XX-XX XX:XX
```

### Test the API

Visit Mock Call New page (`/mock-calls-new`) and:
1. Select any scenario
2. Start a call
3. Send a test message
4. Verify you get an AI response

If it works, your setup is complete!

## Models Used by Mock Call New

### Customer Simulation
- **Model:** `meta-llama/llama-3.1-8b-instruct:free`
- **Purpose:** Realistic customer behavior
- **Temperature:** 0.7 (natural variation)
- **Max Tokens:** 500
- **Cost:** FREE

**Why Llama 3.1 Free?**
- Completely free on OpenRouter
- Good at conversational roleplay
- Follows character instructions well
- Fast response times
- No API costs whatsoever

### Call Evaluation
- **Model:** `meta-llama/llama-3.1-8b-instruct:free`
- **Purpose:** Analyzing call performance
- **Temperature:** 0.3 (consistent evaluation)
- **Max Tokens:** 800
- **Cost:** FREE

**Why Llama 3.1 Free?**
- Completely free on OpenRouter
- Capable analytical abilities
- Good at structured output
- Reliable JSON formatting
- Zero cost for evaluations

### Speech Services
- **Speech-to-Text:** OpenAI Whisper-1
- **Text-to-Speech:** OpenAI TTS-1
- **Note:** These still use OpenAI API (not OpenRouter)

**Why OpenAI for Speech?**
OpenRouter doesn't currently support speech services. We use OpenAI directly for these features.

## Cost Estimation

### Per Call Breakdown

**Customer AI (Llama 3.1 Free):**
- System prompt: ~300 tokens
- Conversation history: ~500 tokens
- Response: ~200 tokens
- **Cost: FREE**
- Average call: 5-10 turns = **$0.00**

**Evaluation (Llama 3.1 Free):**
- Transcript analysis: ~1000 tokens
- Evaluation output: ~400 tokens
- **Cost: FREE**

**Speech Services (if voice enabled):**
- Transcription: $0.006 per minute
- Voice synthesis: ~$0.02 per call
- Cost: ~$0.026 per call

**Total Per Call:**
- Text only: **$0.00**
- With voice: **~$0.026-0.03**

### Monthly Estimates

For 100 users doing 3 calls each:
- Total calls: 300
- AI conversation cost: **$0.00**
- Speech cost (if all use voice): ~$7.80-9.00
- **Total cost: $0-9 depending on voice usage**

Extremely cost-effective for training!

## Usage Monitoring

### Check OpenRouter Usage

1. Visit [https://openrouter.ai/activity](https://openrouter.ai/activity)
2. View:
   - Requests per day
   - Cost per model
   - Token usage
   - Error rates

### Check Remaining Credits

1. Go to [https://openrouter.ai/credits](https://openrouter.ai/credits)
2. View current balance
3. Set up low balance alerts

### Database Usage Tracking

Check mock call usage:

```sql
-- Total calls per user
SELECT
  up.full_name,
  up.unique_id,
  COUNT(*) as total_calls
FROM mock_call_usage mcu
JOIN user_profiles up ON mcu.user_id = up.id
GROUP BY up.full_name, up.unique_id
ORDER BY total_calls DESC;

-- Calls by scenario
SELECT
  topic as scenario,
  COUNT(*) as call_count
FROM mock_call_usage
GROUP BY topic
ORDER BY call_count DESC;

-- Daily usage
SELECT
  DATE(call_date) as date,
  COUNT(*) as calls
FROM mock_call_usage
GROUP BY DATE(call_date)
ORDER BY date DESC;
```

## Troubleshooting

### Error: "Secret openrouter_api_key not found"

**Solution:**
1. Check if secret exists:
   ```sql
   SELECT * FROM app_secrets WHERE key = 'openrouter_api_key';
   ```
2. If missing, add it using SQL method above
3. Verify edge functions are deployed

### Error: "OpenRouter API error: 401"

**Causes:**
- Invalid API key
- Expired API key
- Key not properly stored

**Solution:**
1. Generate new API key from OpenRouter
2. Update in database:
   ```sql
   UPDATE app_secrets
   SET value = 'NEW_KEY_HERE'
   WHERE key = 'openrouter_api_key';
   ```

### Error: "OpenRouter API error: 402"

**Cause:** Insufficient credits

**Solution:**
1. Add credits at [https://openrouter.ai/credits](https://openrouter.ai/credits)
2. Check current balance
3. Set up auto-reload if available

### Error: "OpenRouter API error: 429"

**Cause:** Rate limit exceeded

**Solution:**
1. Check rate limits on OpenRouter dashboard
2. Implement request queuing
3. Upgrade to higher tier if needed

### No Response from AI

**Checks:**
1. Verify API key is correct
2. Check OpenRouter service status
3. Review edge function logs:
   ```bash
   supabase functions logs openrouter-mock-call-agent
   ```
4. Test API key directly with curl

### Speech Features Not Working

**Remember:** Speech services use OpenAI API, not OpenRouter

**Check:**
1. Verify `openai_api_key` secret exists
2. Check OpenAI account has credits
3. Test microphone permissions

## Security Best Practices

### API Key Protection

1. **Never commit API keys to git**
   - Already in `.gitignore`
   - Use environment variables
   - Store in `app_secrets` table only

2. **Rotate keys regularly**
   - Generate new key every 90 days
   - Revoke old keys after rotation
   - Update in database immediately

3. **Monitor usage**
   - Set up budget alerts
   - Review unusual activity
   - Track per-user costs

4. **Restrict access**
   - Use RLS policies
   - Limit edge function access
   - Verify JWT tokens

## Alternative Providers

If you prefer different providers:

### Direct Anthropic API
- More expensive than OpenRouter
- Better rate limits
- Direct support
- Simpler integration

### Direct OpenAI API
- Most expensive option
- Best model availability
- Excellent documentation
- Industry standard

### Local Models
- Free after setup
- Privacy benefits
- Slower performance
- Requires hardware

## Support

### OpenRouter Support
- Documentation: [https://openrouter.ai/docs](https://openrouter.ai/docs)
- Discord: [https://discord.gg/openrouter](https://discord.gg/openrouter)
- Email: support@openrouter.ai

### Application Support
- Check documentation files
- Review edge function logs
- Test with Postman/curl
- Contact development team

## Next Steps

After setup is complete:

1. ✅ Test Mock Call New feature
2. ✅ Monitor initial usage and costs
3. ✅ Set up budget alerts on OpenRouter
4. ✅ Train users on the feature
5. ✅ Gather feedback on AI quality
6. ✅ Adjust prompts if needed
7. ✅ Scale to more users

Your OpenRouter integration is now ready for production use!

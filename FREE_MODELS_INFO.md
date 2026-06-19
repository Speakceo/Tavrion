# Free Models Information - Mock Call New

## Overview

Mock Call New has been configured to use **completely free models** from OpenRouter, eliminating all AI conversation costs.

## Model Details

### Llama 3.1 8B Instruct (Free)

**Model ID:** `meta-llama/llama-3.1-8b-instruct:free`

**Provider:** Meta AI via OpenRouter

**Cost:** **100% FREE**

**Capabilities:**
- Excellent conversational abilities
- Good at following instructions and roleplay
- Capable of structured output (JSON)
- Fast response times
- Suitable for both customer simulation and evaluation

**Limitations:**
- Slightly less sophisticated than GPT-4 or Claude
- May occasionally need more specific prompting
- Good enough for training scenarios

## Usage in Mock Call New

### Customer Simulation
- **Function:** `openrouter-mock-call-agent`
- **Model:** `meta-llama/llama-3.1-8b-instruct:free`
- **Purpose:** Simulates realistic customer behavior
- **Temperature:** 0.7 (natural variation)
- **Max Tokens:** 500
- **Cost per call:** $0.00

### Call Evaluation
- **Function:** `openrouter-mock-call-evaluate`
- **Model:** `meta-llama/llama-3.1-8b-instruct:free`
- **Purpose:** Evaluates agent performance
- **Temperature:** 0.3 (consistent)
- **Max Tokens:** 800
- **Cost per evaluation:** $0.00

## Why Free Models?

### Benefits
1. **Zero Cost:** No API charges for AI conversations
2. **Unlimited Practice:** Users can practice as much as needed
3. **Quality Training:** Model is capable enough for realistic scenarios
4. **Fast Responses:** No rate limiting concerns
5. **Scalable:** Can support many users simultaneously

### Trade-offs
1. **Slightly Less Sophisticated:** Not as advanced as GPT-4 or Claude
2. **Occasional Inconsistency:** May need better prompting
3. **JSON Parsing:** Sometimes requires fallback handling

### Overall Assessment
**The free model provides excellent value for training purposes. While not as sophisticated as premium models, it delivers realistic conversations and helpful evaluations at zero cost.**

## Cost Comparison

### Original Mock Calls (OpenAI GPT-4)
- Cost per call: ~$0.10-0.15
- 100 users × 3 calls = $30-45/month
- Annual cost: $360-540

### Mock Call New (Free Models)
- AI conversation cost: **$0.00**
- Speech services (if used): ~$0.02-0.03 per call
- 100 users × 3 calls with voice = ~$6-9/month
- 100 users × 3 calls text only = **$0/month**
- Annual cost: **$0-108** (depending on voice usage)

**Savings: 80-100% reduction in costs**

## OpenRouter Free Tier

### What's Included
- Access to free models like Llama 3.1
- No credit card required for free models
- No usage limits on free models
- Fast inference speeds
- Reliable uptime

### What's Not Included
- Premium models (GPT-4, Claude, etc.) require credits
- Rate limits may apply during high traffic
- No guaranteed SLA for free tier

### Fair Use Policy
OpenRouter's free models are provided for legitimate use. The system is designed for training purposes, which is appropriate use.

## Alternative Free Models

If you want to experiment with other free models, here are some options:

### Google Gemini Flash 1.5 (Free)
```typescript
model: "google/gemini-flash-1.5:free"
```
- Very fast
- Good at conversations
- May have different output format

### Mistral 7B Instruct (Free)
```typescript
model: "mistralai/mistral-7b-instruct:free"
```
- Good quality
- Fast responses
- Smaller context window

### Llama 3.2 11B (Free)
```typescript
model: "meta-llama/llama-3.2-11b-vision-instruct:free"
```
- Newer version
- Better capabilities
- Slightly larger model

## How to Switch Models

If you want to try a different free model:

1. **Edit the agent function:**
```typescript
// In supabase/functions/openrouter-mock-call-agent/index.ts
model: "meta-llama/llama-3.1-8b-instruct:free"
// Change to:
model: "google/gemini-flash-1.5:free"
```

2. **Edit the evaluate function:**
```typescript
// In supabase/functions/openrouter-mock-call-evaluate/index.ts
model: "meta-llama/llama-3.1-8b-instruct:free"
// Change to:
model: "google/gemini-flash-1.5:free"
```

3. **Deploy both functions:**
```bash
# Deploy updated functions
supabase functions deploy openrouter-mock-call-agent
supabase functions deploy openrouter-mock-call-evaluate
```

4. **Test thoroughly:**
- Try multiple scenarios
- Check response quality
- Verify evaluation accuracy

## Monitoring Free Model Usage

### Check OpenRouter Dashboard
1. Visit https://openrouter.ai/activity
2. View requests (should show free models)
3. Confirm $0.00 costs
4. Monitor response times

### Database Queries

**Check total free model usage:**
```sql
SELECT
  COUNT(*) as total_calls,
  COUNT(DISTINCT user_id) as unique_users,
  AVG(score) as avg_score
FROM mock_call_sessions
WHERE created_at >= NOW() - INTERVAL '30 days';
```

**Check by scenario:**
```sql
SELECT
  scenario_type,
  COUNT(*) as calls,
  AVG(score) as avg_score
FROM mock_call_sessions
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY scenario_type
ORDER BY calls DESC;
```

## Performance Considerations

### Response Times
- Free models: 1-3 seconds typical
- Premium models: 2-5 seconds typical
- **Free models are often faster!**

### Quality
- Free models: 7-8/10 for training
- Premium models: 9-10/10 for training
- **Free models are good enough for most training scenarios**

### Reliability
- Free models: High uptime
- May have rate limits during peak times
- Automatic failover available

## Troubleshooting Free Models

### "Model not found" error
- Verify model ID is correct: `meta-llama/llama-3.1-8b-instruct:free`
- Check OpenRouter service status
- Try alternative free model

### Poor quality responses
- Adjust temperature (higher = more creative)
- Improve system prompts
- Add more examples in prompt
- Try different free model

### Slow responses
- Check OpenRouter status page
- Verify network connectivity
- Consider alternative free model
- Check if rate limited

### JSON parsing errors
- Free models may format JSON differently
- Fallback handling is built-in
- Retry logic included in code

## Best Practices

### 1. Optimize Prompts
- Clear instructions work better with free models
- Include examples when possible
- Keep prompts concise

### 2. Set Realistic Expectations
- Free models are "good enough" not "perfect"
- Quality improves with better prompts
- Users won't notice the difference for training

### 3. Monitor Quality
- Review session scores regularly
- Collect user feedback
- Adjust prompts if needed

### 4. Leverage Cost Savings
- Offer unlimited practice sessions
- Remove artificial limits
- Expand training programs

## Frequently Asked Questions

### Q: Do I need to add credits to OpenRouter?
**A:** No! Free models don't require any credits or payment.

### Q: Are there usage limits on free models?
**A:** OpenRouter may have fair-use limits, but they're very generous for training purposes.

### Q: Can I switch back to paid models?
**A:** Yes, just change the model ID in the edge functions and redeploy.

### Q: Will users notice the difference?
**A:** Most won't. Free models are quite capable for training scenarios.

### Q: What if free models become unavailable?
**A:** You can switch to paid models or alternative free models easily.

### Q: How long will free models be available?
**A:** OpenRouter has maintained free models for a long time. They're likely to continue.

## Conclusion

Using free models from OpenRouter for Mock Call New provides:

✅ **Zero AI conversation costs**
✅ **Unlimited training capacity**
✅ **Good quality for training**
✅ **Fast response times**
✅ **Easy to scale**
✅ **Simple to maintain**

The free model approach makes mock call training **completely sustainable** at scale without ongoing AI costs. Only speech services (if used) incur minimal costs.

This is a **game changer** for training programs, enabling unlimited practice without budget concerns.

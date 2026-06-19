const SUPABASE_URL = 'https://xrhnazsfntkwuzgalvwq.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

async function testAPI() {
  try {
    console.log('Testing OpenRouter Mock Call Agent...');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/openrouter-mock-call-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        scenarioType: 'budget_concern',
        userMessage: 'Hi, I need help finding accommodation',
        conversationHistory: []
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('Response body:', text);

    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\n✅ SUCCESS!');
      console.log('AI Response:', data.response);
    } else {
      console.log('\n❌ ERROR!');
      console.log('Error details:', text);
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

testAPI();

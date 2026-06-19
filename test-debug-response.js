const SUPABASE_URL = 'https://xrhnazsfntkwuzgalvwq.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

async function testDebug() {
  console.log('Testing with debug output...\n');

  try {
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

    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log('\nRaw response:', text);

    if (response.ok) {
      const data = JSON.parse(text);
      console.log('\nParsed response:', data);
      console.log('\nResponse field:', data.response);
      console.log('Response type:', typeof data.response);
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testDebug();

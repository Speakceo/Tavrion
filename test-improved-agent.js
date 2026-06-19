const SUPABASE_URL = 'https://xrhnazsfntkwuzgalvwq.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

async function testConversation() {
  console.log('Testing improved mock call agent...\n');

  const conversationHistory = [];
  const agentMessages = [
    'Hi, I need help finding accommodation near Manchester University',
    'What are your prices like?',
    'That seems expensive compared to other places I\'ve seen. Does it include bills?'
  ];

  for (let i = 0; i < agentMessages.length; i++) {
    const userMessage = agentMessages[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Agent: ${userMessage}`);
    console.log(`${'='.repeat(60)}`);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/openrouter-mock-call-agent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          scenarioType: 'budget_concern',
          userMessage: userMessage,
          conversationHistory: conversationHistory
        })
      });

      if (!response.ok) {
        const error = await response.text();
        console.log(`❌ Error: ${error}`);
        break;
      }

      const data = await response.json();
      const customerResponse = data.response;

      console.log(`\nCustomer (Priya): ${customerResponse}`);

      conversationHistory.push({ role: 'agent', message: userMessage });
      conversationHistory.push({ role: 'customer', message: customerResponse });

      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`❌ Request failed:`, error.message);
      break;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('✅ Test complete!');
}

testConversation();

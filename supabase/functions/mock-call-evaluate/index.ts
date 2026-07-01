import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getSecret(key: string): Promise<string> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('app_secrets')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error || !data) {
    throw new Error(`Secret ${key} not found`);
  }

  return data.value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { scenarioType, transcript, evaluationRubric } = await req.json();

    const OPENAI_API_KEY = await getSecret('openai_api_key');

    const rubricBlock = evaluationRubric?.trim()
      ? `\n\nOrganisation-specific evaluation criteria:\n${evaluationRubric.trim()}`
      : '';

    const systemPrompt = `You are an expert sales trainer evaluating a mock call performance.

Evaluate based on:
1. RAPPORT BUILDING: Did they build trust and connection?
2. ACTIVE LISTENING: Did they listen to concerns and respond appropriately?
3. OBJECTION HANDLING: How well did they address objections?
4. PRODUCT KNOWLEDGE: Did they demonstrate good knowledge?
5. CLOSING: Did they try to move the conversation forward?
${rubricBlock}

Be constructive and specific with feedback.`;

    const userPrompt = `Evaluate this mock call for ${scenarioType} scenario:

${transcript.map((msg: { role: string; message: string }) => `${msg.role.toUpperCase()}: ${msg.message}`).join('\n\n')}

Return JSON:
{
  "score": 0-100,
  "feedback": "Overall assessment paragraph",
  "strengths": ["strength 1", "strength 2", ...],
  "improvements": ["improvement 1", "improvement 2", ...]
}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = await response.json();
    const evaluation = JSON.parse(data.choices[0].message.content);

    return new Response(
      JSON.stringify(evaluation),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getSecret(key: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from('app_secrets')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error || !data) {
    return null;
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
    const { scenarioType, transcript } = await req.json();

    const OPENROUTER_API_KEY = await getSecret('openrouter_api_key');

    if (!OPENROUTER_API_KEY) {
      throw new Error('OpenRouter API key not configured');
    }

    const conversationLog = transcript.map((msg: { role: string; message: string }) =>
      `${msg.role === 'agent' ? 'Agent' : 'Customer'}: ${msg.message}`
    ).join('\n');

    const evaluationPrompt = `Evaluate this student accommodation sales call. Scenario: ${scenarioType}

CONVERSATION:
${conversationLog}

EVALUATION CRITERIA:
1. Objection handling - Did they address customer concerns effectively?
2. Empathy and listening - Did they show understanding and listen actively?
3. Information quality - Did they provide specific, helpful details?
4. Trust building - Did they build rapport and credibility?
5. Outcome orientation - Did they move toward a positive resolution?

RESPOND ONLY WITH VALID JSON in this exact format (no markdown, no code blocks):
{
  "score": 75,
  "feedback": "Clear 2-3 sentence assessment of overall performance",
  "strengths": ["Specific strength 1", "Specific strength 2", "Specific strength 3"],
  "improvements": ["Specific improvement 1", "Specific improvement 2", "Specific improvement 3"]
}`;

    const messages = [
      {
        role: "system",
        content: "You are an expert sales trainer evaluating customer service calls. You MUST respond with valid JSON only, no markdown formatting, no code blocks. Be constructive and specific in your feedback."
      },
      {
        role: "user",
        content: evaluationPrompt
      }
    ];

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": Deno.env.get('SUPABASE_URL') || "https://amberstudent-lms.com",
        "X-Title": "AmberStudent LMS"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages,
        temperature: 0.3,
        max_tokens: 800
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${error}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const evaluation = JSON.parse(jsonMatch[0]);
      return new Response(
        JSON.stringify(evaluation),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        score: 70,
        feedback: "Call completed. Good effort in handling the customer interaction.",
        strengths: [
          "Professional communication",
          "Engaged with customer concerns",
          "Maintained conversation flow"
        ],
        improvements: [
          "Provide more specific details",
          "Address objections more directly",
          "Show more empathy"
        ]
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
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

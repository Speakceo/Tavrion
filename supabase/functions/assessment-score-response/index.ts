import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getSecret(key: string): Promise<string> {
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data, error } = await supabase.from('app_secrets').select('value').eq('key', key).maybeSingle();
  if (error || !data) throw new Error(`Secret ${key} not found`);
  return data.value;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { attemptId, responseId, questionType, text, mediaUrl, rubric } = await req.json();
    const OPENAI_API_KEY = await getSecret('openai_api_key');

    const prompt = `Evaluate this ${questionType} assessment response.
${text ? `Response text: ${text}` : ''}
${mediaUrl ? `Media URL provided: ${mediaUrl}` : ''}
${rubric ? `Rubric: ${rubric}` : ''}

Return JSON only:
{"overall_score":0-100,"grammar_score":0-100,"clarity_score":0-100,"feedback":["..."],"strengths":["..."],"improvements":["..."]}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const match = content.match(/\{[\s\S]*\}/);
    const scores = match ? JSON.parse(match[0]) : { overall_score: 50, feedback: ['AI scoring unavailable'] };

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    if (responseId) {
      await supabase.from('assessment_responses').update({
        auto_score: scores.overall_score,
        final_score: scores.overall_score,
        grader_notes: JSON.stringify(scores),
      }).eq('id', responseId);
    }

    return new Response(JSON.stringify({ score: scores.overall_score, feedback: scores }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

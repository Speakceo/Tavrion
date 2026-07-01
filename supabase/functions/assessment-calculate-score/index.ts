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
    const { attemptId } = await req.json();
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: responses } = await supabase
      .from('assessment_responses')
      .select('final_score, auto_score, question:assessment_questions(weight, question_type)')
      .eq('attempt_id', attemptId);

    let earned = 0;
    let total = 0;
    (responses || []).forEach((r: { final_score?: number; auto_score?: number; question?: { weight?: number } }) => {
      earned += Number(r.final_score ?? r.auto_score ?? 0);
      total += Number(r.question?.weight ?? 1) * 10;
    });

    const overall_score = total > 0 ? Math.round((earned / total) * 100) : 0;

    const { data: attempt } = await supabase
      .from('assessment_attempts')
      .select('*, assignment:assessment_assignments(passing_score)')
      .eq('id', attemptId)
      .single();

    const passing = attempt?.assignment?.passing_score ?? 70;
    const passed = overall_score >= passing;

    const { count: violationCount } = await supabase
      .from('assessment_violations')
      .select('id', { count: 'exact', head: true })
      .eq('attempt_id', attemptId);

    const integrity_score = Math.max(0, 100 - (violationCount || 0) * 8);

    let ai_summary = '';
    let strengths: string[] = [];
    let weaknesses: string[] = [];
    let recommendation = passed ? 'Proceed to next round' : 'Does not meet threshold';

    try {
      const OPENAI_API_KEY = await getSecret('openai_api_key');
      const summaryRes = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: `Summarize candidate assessment: score ${overall_score}%, passed=${passed}, integrity=${integrity_score}%. Return JSON: {"summary":"...","strengths":[],"weaknesses":[],"recommendation":"..."}`,
          }],
          temperature: 0.4,
        }),
      });
      const summaryData = await summaryRes.json();
      const content = summaryData.choices?.[0]?.message?.content || '{}';
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        ai_summary = parsed.summary || '';
        strengths = parsed.strengths || [];
        weaknesses = parsed.weaknesses || [];
        recommendation = parsed.recommendation || recommendation;
      }
    } catch {
      ai_summary = `Candidate scored ${overall_score}% with integrity score ${integrity_score}%.`;
    }

    await supabase.from('assessment_attempts').update({
      status: 'graded',
      submitted_at: new Date().toISOString(),
      final_score: overall_score,
      auto_score: overall_score,
      passed,
      integrity_score,
    }).eq('id', attemptId);

    await supabase.from('assessment_session_analytics').upsert({
      attempt_id: attemptId,
      overall_score,
      integrity_score,
      strengths,
      weaknesses,
      recommendation,
      ai_summary,
      detailed_scores: { earned, total },
    }, { onConflict: 'attempt_id' });

    return new Response(JSON.stringify({
      overall_score,
      passed,
      integrity_score,
      ai_summary,
      strengths,
      weaknesses,
      recommendation,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

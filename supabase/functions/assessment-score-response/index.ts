import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { chatCompletion, corsHeaders, resolveOrgLlm } from "../_shared/orgLlm.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const { attemptId, responseId, questionType, text, mediaUrl, rubric, organizationId } = await req.json();
    const llm = await resolveOrgLlm(organizationId);

    const prompt = `Evaluate this ${questionType} assessment response.
${text ? `Response text: ${text}` : ""}
${mediaUrl ? `Media URL provided: ${mediaUrl}` : ""}
${rubric ? `Rubric: ${rubric}` : ""}

Return JSON only:
{"overall_score":0-100,"grammar_score":0-100,"clarity_score":0-100,"feedback":["..."],"strengths":["..."],"improvements":["..."]}`;

    const response = await chatCompletion(llm, {
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const match = content.match(/\{[\s\S]*\}/);
    const scores = match ? JSON.parse(match[0]) : { overall_score: 50, feedback: ["AI scoring unavailable"] };

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (responseId) {
      await supabase
        .from("assessment_responses")
        .update({
          auto_score: scores.overall_score,
          final_score: scores.overall_score,
          grader_notes: JSON.stringify(scores),
        })
        .eq("id", responseId);
    }

    return new Response(JSON.stringify({ score: scores.overall_score, feedback: scores }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

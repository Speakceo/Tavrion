import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { chatCompletion, corsHeaders, resolveOrgLlm } from "../_shared/orgLlm.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { scenarioType, transcript, evaluationRubric, organizationId } = await req.json();
    const llm = await resolveOrgLlm(organizationId);

    const rubricBlock = evaluationRubric?.trim()
      ? `\n\nOrganisation-specific evaluation criteria:\n${evaluationRubric.trim()}`
      : "";

    const systemPrompt = `You are an expert sales trainer evaluating a mock call performance.

Evaluate based on:
1. RAPPORT BUILDING: Did they build trust and connection?
2. ACTIVE LISTENING: Did they listen to concerns and respond appropriately?
3. OBJECTION HANDLING: How well did they address objections?
4. PRODUCT KNOWLEDGE: Did they demonstrate good knowledge?
5. CLOSING: Did they try to move the conversation forward?
${rubricBlock}

Be constructive and specific with feedback. Return JSON only.`;

    const userPrompt = `Evaluate this mock call for ${scenarioType} scenario:

${transcript.map((msg: { role: string; message: string }) => `${msg.role.toUpperCase()}: ${msg.message}`).join("\n\n")}

Return JSON:
{
  "score": 0-100,
  "feedback": "Overall assessment paragraph",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"]
}`;

    const response = await chatCompletion(llm, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1000,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`LLM API error: ${error}`);
    }

    const data = await response.json();
    const raw = data.choices[0].message.content;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const evaluation = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

    return new Response(JSON.stringify(evaluation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

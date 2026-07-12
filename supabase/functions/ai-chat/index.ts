import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { chatCompletion, corsHeaders, resolveOrgLlm } from "../_shared/orgLlm.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, organizationId, ...params } = await req.json();
    const llm = await resolveOrgLlm(organizationId);

    if (action === "chat-tutor") {
      const { userMessage, context, userRole, conversationHistory } = params;

      const systemPrompt = `You are an AI tutor for Tavrion LMS. Help ${userRole || "learner"} team members with their organisation's training, SOPs, sales skills, and workplace best practices.
Be helpful, encouraging, and practical.
${context ? `\nOrganisation context:\n${context}` : ""}`;

      const history = Array.isArray(conversationHistory)
        ? conversationHistory
            .filter((m: { role?: string; content?: string }) => m?.role && m?.content)
            .slice(-12)
            .map((m: { role: string; content: string }) => ({
              role: m.role === "assistant" ? "assistant" : "user",
              content: m.content,
            }))
        : [];

      const messages = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: userMessage },
      ];

      const response = await chatCompletion(llm, {
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM error: ${errText}`);
      }

      const data = await response.json();
      return new Response(
        JSON.stringify({
          response: data.choices[0].message.content,
          provider: llm.provider,
          model: llm.chatModel,
          source: llm.source,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "generate-course") {
      const { topic, targetRole, country, additionalContext } = params;

      const systemPrompt = `You are an expert instructional designer for Tavrion LMS.
Create comprehensive, practical training content for ${targetRole} team members in ${country}.
${additionalContext ? `\nAdditional context from the organisation:\n${additionalContext}` : ""}`;

      const userPrompt = `Create a detailed course outline for: "${topic}"

Return ONLY a valid JSON structure with:
{
  "title": "Course title",
  "description": "Course description",
  "modules": [
    {
      "title": "Module title",
      "description": "Module description",
      "lessons": [
        {
          "title": "Lesson title",
          "type": "slides|text|quiz",
          "content": { "text": "lesson body" }
        }
      ]
    }
  ]
}`;

      const response = await chatCompletion(llm, {
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM error: ${errText}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content;

      try {
        const cleanedResponse = content.trim();
        const jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        const courseData = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(cleanedResponse);
        return new Response(JSON.stringify(courseData), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Failed to parse LLM course response:", content);
        throw new Error("Failed to parse course content. Please try again.");
      }
    }

    if (action === "evaluate-answer") {
      const { question, userAnswer, correctAnswer } = params;

      const response = await chatCompletion(llm, {
        messages: [
          {
            role: "system",
            content:
              "Evaluate the user's answer to a training question. Be fair and constructive. Award partial credit for partially correct answers. Return JSON only.",
          },
          {
            role: "user",
            content: `Question: ${question}
Correct Answer: ${correctAnswer}
User Answer: ${userAnswer}

Evaluate and return JSON:
{
  "isCorrect": boolean,
  "score": 0-100,
  "feedback": "detailed feedback"
}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`LLM error: ${errText}`);
      }

      const data = await response.json();
      const raw = data.choices[0].message.content;
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      const evaluation = JSON.parse(jsonMatch ? jsonMatch[0] : raw);

      return new Response(JSON.stringify(evaluation), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message || "AI request failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

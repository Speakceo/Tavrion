import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { chatCompletion, corsHeaders, resolveOrgLlm, speechToText } from "../_shared/orgLlm.ts";

function parseJsonObject(content: string): Record<string, unknown> {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return {};
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function filenameFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").pop() || "recording.webm";
    return base.includes(".") ? base : `${base}.webm`;
  } catch {
    return "recording.webm";
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      attemptId,
      responseId,
      questionType,
      text,
      mediaUrl,
      rubric,
      organizationId,
      language,
      prompt: questionPrompt,
    } = body;

    const llm = await resolveOrgLlm(organizationId);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const isMedia =
      ["video_response", "audio_response"].includes(String(questionType || "")) || Boolean(mediaUrl);

    let transcript = typeof text === "string" ? text.trim() : "";
    let sttError: string | null = null;

    if (isMedia && mediaUrl) {
      try {
        const mediaRes = await fetch(String(mediaUrl));
        if (!mediaRes.ok) {
          throw new Error(`Could not download media (${mediaRes.status})`);
        }
        const blob = await mediaRes.blob();
        const lang = language || (String(rubric || "").toLowerCase().includes("german") ? "de" : undefined);
        transcript = await speechToText(llm, blob, filenameFromUrl(String(mediaUrl)), lang);
      } catch (err) {
        sttError = err instanceof Error ? err.message : String(err);
      }
    }

    const evalPrompt = isMedia
      ? `You are grading a spoken ${language === "de" || String(rubric || "").toLowerCase().includes("german") ? "German" : ""} assessment response from audio/video.

Question prompt: ${questionPrompt || "(not provided)"}
${rubric ? `Rubric: ${rubric}` : "Rubric: Score grammar, fluency, vocabulary, pronunciation/clarity, and relevance to the prompt."}

${transcript
  ? `Transcript from speech-to-text (evaluate spoken quality from this transcript):\n"""${transcript}"""`
  : `No transcript available.${sttError ? ` STT error: ${sttError}` : ""} Score conservatively and note that audio could not be transcribed.`}

Return JSON only:
{"overall_score":0-100,"grammar_score":0-100,"fluency_score":0-100,"vocabulary_score":0-100,"pronunciation_score":0-100,"clarity_score":0-100,"transcript":"...","feedback":["..."],"strengths":["..."],"improvements":["..."]}`
      : `Evaluate this ${questionType || "text"} assessment response.
${transcript ? `Response text: ${transcript}` : ""}
${rubric ? `Rubric: ${rubric}` : ""}

Return JSON only:
{"overall_score":0-100,"grammar_score":0-100,"clarity_score":0-100,"feedback":["..."],"strengths":["..."],"improvements":["..."]}`;

    const response = await chatCompletion(llm, {
      messages: [{ role: "user", content: evalPrompt }],
      temperature: 0.2,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`LLM scoring failed (${response.status}): ${detail || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const scores = parseJsonObject(content);

    if (typeof scores.overall_score !== "number") {
      scores.overall_score = 50;
    }
    if (transcript && !scores.transcript) scores.transcript = transcript;
    if (sttError) scores.stt_error = sttError;
    scores.llm_source = llm.source;

    const overall = Math.max(0, Math.min(100, Number(scores.overall_score)));

    if (responseId) {
      const { data: existing } = await supabase
        .from("assessment_responses")
        .select("answer")
        .eq("id", responseId)
        .maybeSingle();

      const prevAnswer = (existing?.answer || {}) as Record<string, unknown>;
      await supabase
        .from("assessment_responses")
        .update({
          auto_score: overall,
          final_score: overall,
          grader_notes: JSON.stringify(scores),
          answer: {
            ...prevAnswer,
            ...(transcript ? { transcript } : {}),
            ai_evaluation: scores,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", responseId);
    }

    return new Response(
      JSON.stringify({
        score: overall,
        feedback: scores,
        transcript: transcript || null,
        attemptId: attemptId || null,
        llm_source: llm.source,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

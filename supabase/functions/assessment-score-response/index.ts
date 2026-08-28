import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  chatCompletion,
  corsHeaders,
  resolveOrgLlm,
  speechToText,
  looksLikeWhisperHallucination,
} from "../_shared/orgLlm.ts";

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

function clampScore(n: unknown, fallback = 0): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return fallback;
  return Math.max(0, Math.min(100, Math.round(v)));
}

const LANGUAGE_LABELS: Record<string, string> = {
  de: "German",
  es: "Spanish",
  fr: "French",
};

function resolveAssessmentLanguage(
  language?: string,
  rubric?: string,
): { code?: string; label: string } {
  if (language && LANGUAGE_LABELS[language]) {
    return { code: language, label: LANGUAGE_LABELS[language] };
  }
  const rub = String(rubric || "").toLowerCase();
  if (rub.includes("german")) return { code: "de", label: "German" };
  if (rub.includes("spanish")) return { code: "es", label: "Spanish" };
  if (rub.includes("french")) return { code: "fr", label: "French" };
  return { code: language, label: "" };
}

function emptySpeechResult(reason: string) {
  return {
    overall_score: 0,
    grammar_score: 0,
    fluency_score: 0,
    vocabulary_score: 0,
    pronunciation_score: 0,
    clarity_score: 0,
    transcript: "",
    feedback: [
      "No usable spoken response detected.",
      reason,
      "Record again and speak clearly in the required language.",
    ],
    strengths: [],
    improvements: ["Provide audible speech that answers the prompt."],
    empty_audio: true,
  };
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
      durationSeconds,
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
    let noSpeechLikely = false;
    let sttMeta: Record<string, unknown> = {};

    if (isMedia && mediaUrl) {
      try {
        const mediaRes = await fetch(String(mediaUrl));
        if (!mediaRes.ok) {
          throw new Error(`Could not download media (${mediaRes.status})`);
        }
        const blob = await mediaRes.blob();

        // Extremely small files are almost never real speech recordings
        if (blob.size > 0 && blob.size < 2500) {
          noSpeechLikely = true;
          transcript = "";
          sttMeta = { reject_reason: "file_too_small", file_size: blob.size };
        } else if (typeof durationSeconds === "number" && durationSeconds > 0 && durationSeconds < 2) {
          noSpeechLikely = true;
          transcript = "";
          sttMeta = { reject_reason: "duration_too_short", duration_seconds: durationSeconds };
        } else {
          const { code: lang } = resolveAssessmentLanguage(language, rubric);
          const stt = await speechToText(llm, blob, filenameFromUrl(String(mediaUrl)), lang);
          transcript = stt.text;
          noSpeechLikely = stt.noSpeechLikely || looksLikeWhisperHallucination(stt.text);
          if (noSpeechLikely) transcript = "";
          sttMeta = {
            duration: stt.duration,
            avg_no_speech_prob: stt.avgNoSpeechProb,
            avg_logprob: stt.avgLogprob,
            no_speech_likely: stt.noSpeechLikely,
          };
        }
      } catch (err) {
        sttError = err instanceof Error ? err.message : String(err);
        noSpeechLikely = true;
        transcript = "";
      }
    }

    // Hard-fail blank / silent / hallucinated "speech" — never invent a transcript via chat
    if (isMedia && (noSpeechLikely || !transcript)) {
      const reason = sttError
        ? `Transcription failed: ${sttError}`
        : "The recording appears silent, too short, or contains no detectable speech.";
      const scores = { ...emptySpeechResult(reason), stt: sttMeta, llm_source: llm.source };
      const overall = 0;

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
              transcript: "",
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
          transcript: null,
          attemptId: attemptId || null,
          llm_source: llm.source,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { label: targetLanguage } = resolveAssessmentLanguage(language, rubric);
    const languageRule = targetLanguage
      ? `- For ${targetLanguage} tasks, heavily penalize responses not primarily in ${targetLanguage}.`
      : "";
    const evalPrompt = isMedia
      ? `You are a strict language assessor grading a spoken ${targetLanguage || "language"} assessment from a speech-to-text transcript.

STRICT RULES:
- Grade ONLY the transcript below. Do NOT invent or improve what was said.
- If the transcript is empty, nonsense, unrelated, or clearly not answering the prompt, overall_score must be 0–15.
- Do not give high scores for incomplete answers.
${languageRule}
- Keep transcript field EXACTLY equal to the provided transcript (copy it verbatim).

Question prompt: ${questionPrompt || "(not provided)"}
${rubric ? `Rubric: ${rubric}` : "Rubric: Score grammar, fluency, vocabulary, pronunciation/clarity, and relevance to the prompt."}

Transcript (verbatim from speech-to-text):
"""${transcript}"""

Return JSON only:
{"overall_score":0-100,"grammar_score":0-100,"fluency_score":0-100,"vocabulary_score":0-100,"pronunciation_score":0-100,"clarity_score":0-100,"transcript":"...","feedback":["..."],"strengths":["..."],"improvements":["..."]}`
      : `Evaluate this ${questionType || "text"} assessment response.
${transcript ? `Response text: ${transcript}` : ""}
${rubric ? `Rubric: ${rubric}` : ""}

If the response is empty or off-topic, score 0–15.
Return JSON only:
{"overall_score":0-100,"grammar_score":0-100,"clarity_score":0-100,"feedback":["..."],"strengths":["..."],"improvements":["..."]}`;

    const response = await chatCompletion(llm, {
      messages: [{ role: "user", content: evalPrompt }],
      temperature: 0.1,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`LLM scoring failed (${response.status}): ${detail || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const scores = parseJsonObject(content);

    // Never trust model-invented transcripts for media
    scores.transcript = transcript;
    scores.overall_score = clampScore(scores.overall_score, 0);
    scores.grammar_score = clampScore(scores.grammar_score, 0);
    scores.fluency_score = clampScore(scores.fluency_score, 0);
    scores.vocabulary_score = clampScore(scores.vocabulary_score, 0);
    scores.pronunciation_score = clampScore(scores.pronunciation_score, 0);
    scores.clarity_score = clampScore(scores.clarity_score, 0);
    scores.stt = sttMeta;
    scores.llm_source = llm.source;

    // Extra guard: very short transcripts cannot score highly
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    if (wordCount < 8 && Number(scores.overall_score) > 25) {
      scores.overall_score = 15;
      scores.feedback = [
        ...(Array.isArray(scores.feedback) ? scores.feedback as string[] : []),
        "Score capped: transcript too short to demonstrate proficiency.",
      ];
    }

    const overall = clampScore(scores.overall_score, 0);

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
            transcript,
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

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, resolveOrgLlm } from "../_shared/orgLlm.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, organizationId, ...params } = await req.json();
    const llm = await resolveOrgLlm(organizationId);

    // Voice endpoints require OpenAI-compatible audio APIs (OpenAI or custom base that supports them).
    if (llm.provider === "openrouter" || llm.provider === "groq") {
      throw new Error(
        "Text-to-speech / speech-to-text require an OpenAI (or OpenAI-compatible audio) key. Set provider to OpenAI or Custom with audio support in AI Settings.",
      );
    }

    if (action === "text-to-speech") {
      const { text, voice = "nova" } = params;

      const response = await fetch(`${llm.baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${llm.apiKey}`,
        },
        body: JSON.stringify({
          model: llm.ttsModel || "tts-1",
          input: text,
          voice,
          speed: 1.0,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS error: ${response.statusText}`);
      }

      const audioBlob = await response.blob();
      return new Response(audioBlob, {
        headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
      });
    }

    if (action === "speech-to-text") {
      const { audioData } = params;

      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioData), (c) => c.charCodeAt(0))],
        { type: "audio/webm" },
      );

      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");
      formData.append("model", llm.sttModel || "whisper-1");
      formData.append("language", "en");

      const response = await fetch(`${llm.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${llm.apiKey}` },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`STT error: ${response.statusText}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify({ text: data.text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unknown action");
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

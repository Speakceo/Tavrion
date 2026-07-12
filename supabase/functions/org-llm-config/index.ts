import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  assertOrgAdmin,
  corsHeaders,
  defaultChatModel,
  orgLlmSecretKey,
  type LlmProvider,
} from "../_shared/orgLlm.ts";

const PROVIDERS: LlmProvider[] = ["openai", "openrouter", "groq", "custom"];

function maskKey(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 3)}••••${trimmed.slice(-4)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(supabaseUrl, serviceKey);
    const body = await req.json().catch(() => ({}));
    const action = body.action || (req.method === "GET" ? "get" : "save");
    const organizationId = body.organizationId as string | undefined;
    const actorUniqueId = body.actorUniqueId as string | undefined;

    if (!organizationId || !actorUniqueId) {
      return new Response(JSON.stringify({ error: "organizationId and actorUniqueId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const actor = await assertOrgAdmin(client, actorUniqueId, organizationId);

    if (action === "get" || action === "status") {
      const [{ data: settings }, { data: secret }] = await Promise.all([
        client.from("org_llm_settings").select("*").eq("organization_id", organizationId).maybeSingle(),
        client.from("app_secrets").select("value").eq("key", orgLlmSecretKey(organizationId)).maybeSingle(),
      ]);

      const provider = (settings?.provider || "openai") as LlmProvider;
      return new Response(
        JSON.stringify({
          organizationId,
          provider,
          chatModel: settings?.chat_model || defaultChatModel(provider),
          embeddingModel: settings?.embedding_model || "text-embedding-3-small",
          ttsModel: settings?.tts_model || "tts-1",
          sttModel: settings?.stt_model || "whisper-1",
          baseUrl: settings?.base_url || "",
          enabled: settings?.enabled ?? true,
          hasApiKey: Boolean(secret?.value),
          apiKeyPreview: maskKey(secret?.value),
          updatedAt: settings?.updated_at || null,
          providers: PROVIDERS,
          modelPresets: {
            openai: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini", "gpt-4.1"],
            openrouter: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-2.0-flash-001"],
            groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
            custom: ["gpt-4o-mini"],
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "save") {
      const provider = (body.provider || "openai") as LlmProvider;
      if (!PROVIDERS.includes(provider)) {
        return new Response(JSON.stringify({ error: "Unsupported provider" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const chatModel = String(body.chatModel || defaultChatModel(provider)).trim();
      const embeddingModel = String(body.embeddingModel || "text-embedding-3-small").trim();
      const ttsModel = String(body.ttsModel || "tts-1").trim();
      const sttModel = String(body.sttModel || "whisper-1").trim();
      const baseUrl = body.baseUrl ? String(body.baseUrl).trim().replace(/\/$/, "") : null;
      const enabled = body.enabled !== false;
      const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

      if (provider === "custom" && !baseUrl) {
        return new Response(JSON.stringify({ error: "Custom provider requires a base URL (OpenAI-compatible)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: upsertError } = await client.from("org_llm_settings").upsert(
        {
          organization_id: organizationId,
          provider,
          chat_model: chatModel,
          embedding_model: embeddingModel,
          tts_model: ttsModel,
          stt_model: sttModel,
          base_url: baseUrl,
          enabled,
          updated_at: new Date().toISOString(),
          updated_by: actor.id,
        },
        { onConflict: "organization_id" },
      );
      if (upsertError) throw upsertError;

      if (apiKey) {
        const { error: secretError } = await client.from("app_secrets").upsert(
          {
            key: orgLlmSecretKey(organizationId),
            value: apiKey,
            description: `Org LLM API key for ${organizationId}`,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" },
        );
        if (secretError) throw secretError;
      } else {
        const { data: existing } = await client
          .from("app_secrets")
          .select("value")
          .eq("key", orgLlmSecretKey(organizationId))
          .maybeSingle();
        if (!existing?.value && enabled) {
          return new Response(
            JSON.stringify({ error: "API key is required the first time you enable org AI settings" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      return new Response(JSON.stringify({ saved: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "test") {
      const { resolveOrgLlm, chatCompletion } = await import("../_shared/orgLlm.ts");
      const llm = await resolveOrgLlm(organizationId);
      const testRes = await chatCompletion(llm, {
        messages: [{ role: "user", content: "Reply with exactly: ok" }],
        max_tokens: 16,
        temperature: 0,
      });
      const testBody = await testRes.json().catch(() => ({}));
      if (!testRes.ok) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: testBody.error?.message || testBody.message || `Provider returned ${testRes.status}`,
            source: llm.source,
            provider: llm.provider,
            model: llm.chatModel,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify({
          ok: true,
          source: llm.source,
          provider: llm.provider,
          model: llm.chatModel,
          reply: testBody.choices?.[0]?.message?.content || "",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "clear_key") {
      await client.from("app_secrets").delete().eq("key", orgLlmSecretKey(organizationId));
      return new Response(JSON.stringify({ cleared: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const message = err?.message || "Failed to manage org LLM settings";
    const status = /not allowed|only organisation|actor not found/i.test(message) ? 403 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

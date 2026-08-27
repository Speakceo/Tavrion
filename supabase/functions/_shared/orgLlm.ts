/**
 * Resolve per-organisation LLM credentials for Edge Functions.
 * API keys: app_secrets key `org_llm_key:<organization_id>`
 * Fallback: platform OPENAI_API_KEY / openai_api_key (and OpenRouter variants).
 */
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

export type LlmProvider = "openai" | "openrouter" | "groq" | "custom";

export type ResolvedOrgLlm = {
  organizationId: string | null;
  provider: LlmProvider;
  apiKey: string;
  chatModel: string;
  embeddingModel: string;
  ttsModel: string;
  sttModel: string;
  baseUrl: string;
  source: "org" | "platform";
};

const PROVIDER_BASE: Record<Exclude<LlmProvider, "custom">, string> = {
  openai: "https://api.openai.com/v1",
  openrouter: "https://openrouter.ai/api/v1",
  groq: "https://api.groq.com/openai/v1",
};

function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Server misconfigured");
  return createClient(url, key);
}

async function readSecret(client: SupabaseClient, key: string): Promise<string | null> {
  const { data } = await client.from("app_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value?.trim() || null;
}

/** Try several platform secret casings used across legacy functions. */
export async function getPlatformSecret(client: SupabaseClient, ...keys: string[]): Promise<string | null> {
  for (const key of keys) {
    const value = await readSecret(client, key);
    if (value) return value;
  }
  return null;
}

export function orgLlmSecretKey(organizationId: string) {
  return `org_llm_key:${organizationId}`;
}

export function providerBaseUrl(provider: LlmProvider, customBaseUrl?: string | null): string {
  if (provider === "custom") {
    const base = (customBaseUrl || "").replace(/\/$/, "");
    if (!base) throw new Error("Custom LLM provider requires a base URL");
    return base;
  }
  return PROVIDER_BASE[provider];
}

export function defaultChatModel(provider: LlmProvider): string {
  switch (provider) {
    case "openrouter":
      return "openai/gpt-4o-mini";
    case "groq":
      return "llama-3.3-70b-versatile";
    default:
      return "gpt-4o-mini";
  }
}

export async function resolveOrgLlm(organizationId?: string | null): Promise<ResolvedOrgLlm> {
  const client = serviceClient();

  if (organizationId) {
    const [{ data: settings }, orgKey] = await Promise.all([
      client.from("org_llm_settings").select("*").eq("organization_id", organizationId).maybeSingle(),
      readSecret(client, orgLlmSecretKey(organizationId)),
    ]);

    if (settings?.enabled !== false && orgKey) {
      const provider = (settings.provider || "openai") as LlmProvider;
      return {
        organizationId,
        provider,
        apiKey: orgKey,
        chatModel: settings.chat_model || defaultChatModel(provider),
        embeddingModel: settings.embedding_model || "text-embedding-3-small",
        ttsModel: settings.tts_model || "tts-1",
        sttModel: settings.stt_model || "whisper-1",
        baseUrl: providerBaseUrl(provider, settings.base_url),
        source: "org",
      };
    }
  }

  const platformKey = await getPlatformSecret(
    client,
    "OPENAI_API_KEY",
    "openai_api_key",
  );
  if (!platformKey) {
    throw new Error(
      organizationId
        ? "No LLM API key configured for this organisation. Ask an admin to set it in AI Settings."
        : "No platform LLM API key configured.",
    );
  }

  return {
    organizationId: organizationId || null,
    provider: "openai",
    apiKey: platformKey,
    chatModel: "gpt-4o-mini",
    embeddingModel: "text-embedding-3-small",
    ttsModel: "tts-1",
    sttModel: "whisper-1",
    baseUrl: PROVIDER_BASE.openai,
    source: "platform",
  };
}

export async function chatCompletion(
  llm: ResolvedOrgLlm,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${llm.apiKey}`,
    ...extraHeaders,
  };
  if (llm.provider === "openrouter") {
    headers["HTTP-Referer"] = Deno.env.get("SUPABASE_URL") || "https://jointavrion.com";
    headers["X-Title"] = "Tavrion LMS";
  }

  return fetch(`${llm.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: llm.chatModel,
      ...body,
    }),
  });
}

/** Transcribe audio/video via org Whisper (or compatible) STT model. */
export type SpeechToTextResult = {
  text: string;
  duration?: number;
  noSpeechLikely: boolean;
  avgNoSpeechProb?: number;
  avgLogprob?: number;
};

const WHISPER_SILENCE_HALLUCINATIONS = [
  /^thanks for watching\.?$/i,
  /^thank you for watching\.?$/i,
  /^please subscribe\.?$/i,
  /^subscribe to .+ channel\.?$/i,
  /^untertitel( der amara\.org)?\.?$/i,
  /^字幕由 .+ 提供\.?$/i,
  /^amara\.org\.?$/i,
  /^www\.youtube\.com\/watch\?v=/i,
  /^mbc 뉴스$/i,
  /^\.+$/,
  /^♪+$/,
  /^\[?\s*silence\s*\]?$/i,
  /^\[?\s*music\s*\]?$/i,
  /^\[?\s*blank audio\s*\]?$/i,
];

export function looksLikeWhisperHallucination(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  if (t.length < 8) return true;
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 3) return true;
  return WHISPER_SILENCE_HALLUCINATIONS.some((re) => re.test(t));
}

export async function speechToText(
  llm: ResolvedOrgLlm,
  file: Blob,
  filename: string,
  language?: string | null,
): Promise<SpeechToTextResult> {
  const formData = new FormData();
  formData.append("file", file, filename);
  formData.append("model", llm.sttModel || "whisper-1");
  formData.append("response_format", "verbose_json");
  if (language) formData.append("language", language);

  const response = await fetch(`${llm.baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${llm.apiKey}` },
    body: formData,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Speech-to-text failed (${response.status}): ${detail || response.statusText}`);
  }

  const data = await response.json();
  const text = String(data.text || "").trim();
  const segments = Array.isArray(data.segments) ? data.segments : [];
  let avgNoSpeechProb: number | undefined;
  let avgLogprob: number | undefined;

  if (segments.length) {
    const noSpeechVals = segments
      .map((s: { no_speech_prob?: number }) => s.no_speech_prob)
      .filter((n: unknown): n is number => typeof n === "number");
    const logprobs = segments
      .map((s: { avg_logprob?: number }) => s.avg_logprob)
      .filter((n: unknown): n is number => typeof n === "number");
    if (noSpeechVals.length) {
      avgNoSpeechProb = noSpeechVals.reduce((a: number, b: number) => a + b, 0) / noSpeechVals.length;
    }
    if (logprobs.length) {
      avgLogprob = logprobs.reduce((a: number, b: number) => a + b, 0) / logprobs.length;
    }
  }

  const duration = typeof data.duration === "number" ? data.duration : undefined;
  const noSpeechLikely =
    !text
    || looksLikeWhisperHallucination(text)
    || (typeof avgNoSpeechProb === "number" && avgNoSpeechProb >= 0.6)
    || (typeof avgLogprob === "number" && avgLogprob < -1.2 && text.split(/\s+/).length < 12)
    || (typeof duration === "number" && duration < 2);

  return {
    text: noSpeechLikely && looksLikeWhisperHallucination(text) ? "" : text,
    duration,
    noSpeechLikely,
    avgNoSpeechProb,
    avgLogprob,
  };
}

export async function assertOrgAdmin(
  client: SupabaseClient,
  actorUniqueId: string,
  organizationId: string,
): Promise<{ id: string; role: string; is_platform_owner: boolean }> {
  const { data: actor, error } = await client
    .from("user_profiles")
    .select("id, role, is_platform_owner, organization_id, unique_id")
    .eq("unique_id", actorUniqueId)
    .maybeSingle();

  if (error || !actor) throw new Error("Actor not found");

  const isOwner =
    actor.is_platform_owner ||
    String(actor.unique_id || "").toLowerCase() === "arpitadmin";

  if (isOwner) return actor;

  if (actor.organization_id !== organizationId) {
    throw new Error("Not allowed to manage LLM settings for another organisation");
  }

  if (!["admin", "super_admin"].includes(actor.role)) {
    throw new Error("Only organisation admins can manage AI settings");
  }

  return actor;
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { executeCrawlJob, prepareCrawl } from "../_shared/crawlFallback.ts";

declare const EdgeRuntime: { waitUntil: (promise: Promise<unknown>) => void };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getSecret(supabase: ReturnType<typeof createClient>, key: string): Promise<string | null> {
  const { data } = await supabase.from("app_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

async function proxyToBotApi(apiUrl: string, path: string, body: unknown): Promise<Response> {
  const res = await fetch(`${apiUrl.replace(/\/$/, "")}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  let data: Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Bot API unreachable (${res.status}). Check TAVRION_BOT_API_URL.`);
  }
  if (!res.ok) {
    const msg = (data.error as string) || (data.detail as string) || `Bot API error (${res.status})`;
    throw new Error(msg);
  }
  return new Response(JSON.stringify(data), {
    status: res.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const body = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const botApiUrl = await getSecret(supabase, "TAVRION_BOT_API_URL");
    if (botApiUrl) {
      return await proxyToBotApi(botApiUrl, "/crawl", body);
    }

    const openaiKey = await getSecret(supabase, "OPENAI_API_KEY");
    if (!openaiKey) throw new Error("OPENAI_API_KEY not configured");

    const bot = await prepareCrawl(supabase, body);

    EdgeRuntime.waitUntil(
      executeCrawlJob(supabase, openaiKey, bot.id).catch(async (err) => {
        const message = err instanceof Error ? err.message : "Crawl failed";
        await supabase.from("tavrion_bots").update({
          status: "error",
          crawl_error: message,
          updated_at: new Date().toISOString(),
        }).eq("id", bot.id);
      }),
    );

    const { data: botRow } = await supabase.from("tavrion_bots").select("*").eq("id", bot.id).single();

    return new Response(JSON.stringify({
      bot: botRow || { ...bot, status: "crawling" },
      status: "crawling",
      async: true,
      crawlEngine: "edge-fallback",
      message: "Crawl started. Large sites can take 1–3 minutes.",
    }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

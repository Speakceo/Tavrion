import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { chatWithBot } from "../_shared/botChat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getSecret(supabase: ReturnType<typeof createClient>, key: string): Promise<string | null> {
  const { data } = await supabase.from("app_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

async function proxyToBotApi(apiUrl: string, body: unknown): Promise<Response> {
  const res = await fetch(`${apiUrl.replace(/\/$/, "")}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
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
      return await proxyToBotApi(botApiUrl, body);
    }

    const { embedKey, message, sessionId, botId, action } = body;

    let botQuery = supabase.from("tavrion_bots").select("*");
    if (embedKey) botQuery = botQuery.eq("embed_key", embedKey);
    else if (botId) botQuery = botQuery.eq("id", botId);
    else throw new Error("embedKey or botId is required");

    const { data: bot, error } = await botQuery.single();
    if (error || !bot) throw new Error("Bot not found");

    if (action === "config") {
      return new Response(JSON.stringify({
        bot: {
          id: bot.id,
          name: bot.bot_name || bot.name,
          welcomeMessage: bot.welcome_message,
          primaryColor: bot.primary_color,
          secondaryColor: bot.secondary_color,
          accentColor: bot.accent_color,
          logoUrl: bot.logo_url,
          brandDna: bot.brand_dna,
          status: bot.status,
          sourceUrl: bot.source_url,
        },
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!message?.trim()) throw new Error("message is required");
    if (bot.status !== "ready") throw new Error("Bot is not ready yet. Please wait for crawling to finish.");

    const openaiKey = (await getSecret(supabase, "OPENAI_API_KEY"))!;
    const sid = sessionId || crypto.randomUUID();
    const result = await chatWithBot(supabase, openaiKey, bot, message.trim(), sid, "web");

    return new Response(JSON.stringify({
      reply: result.reply,
      sessionId: sid,
      sources: result.sources,
      liveFetched: result.liveFetched,
      ragEngine: "fallback",
      bot: {
        id: bot.id,
        name: bot.bot_name || bot.name,
        welcomeMessage: bot.welcome_message,
        primaryColor: bot.primary_color,
        secondaryColor: bot.secondary_color,
        accentColor: bot.accent_color,
        logoUrl: bot.logo_url,
      },
    }), {
      status: 200,
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

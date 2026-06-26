import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { chatWithBot } from "../_shared/botChat.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getSecret(supabase: ReturnType<typeof createClient>, key: string): Promise<string> {
  const { data, error } = await supabase.from("app_secrets").select("value").eq("key", key).maybeSingle();
  if (error || !data) throw new Error(`Secret ${key} not found`);
  return data.value;
}

async function sendWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
) {
  await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: text.slice(0, 4096) },
    }),
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const url = new URL(req.url);
  const embedKey = url.searchParams.get("bot");

  try {
    if (req.method === "GET") {
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (!embedKey) throw new Error("Missing bot query param");

      const { data: bot } = await supabase
        .from("tavrion_bots")
        .select("whatsapp_verify_token")
        .eq("embed_key", embedKey)
        .single();

      if (mode === "subscribe" && token === bot?.whatsapp_verify_token) {
        return new Response(challenge, { status: 200, headers: corsHeaders });
      }
      return new Response("Forbidden", { status: 403, headers: corsHeaders });
    }

    if (req.method === "POST") {
      const body = await req.json();

      if (!embedKey) throw new Error("Missing bot query param");

      const { data: bot } = await supabase
        .from("tavrion_bots")
        .select("*")
        .eq("embed_key", embedKey)
        .single();

      if (!bot?.whatsapp_enabled || !bot.whatsapp_phone_number_id || !bot.whatsapp_access_token) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const entry = body.entry?.[0];
      const change = entry?.changes?.[0];
      const msg = change?.value?.messages?.[0];

      if (!msg?.text?.body) {
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const from = msg.from as string;
      const text = msg.text.body as string;
      const openaiKey = await getSecret(supabase, "OPENAI_API_KEY");
      const sessionId = `wa:${from}`;

      const result = await chatWithBot(supabase, openaiKey, bot, text, sessionId, "whatsapp");

      await sendWhatsAppMessage(
        bot.whatsapp_phone_number_id,
        bot.whatsapp_access_token,
        from,
        result.reply,
      );

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

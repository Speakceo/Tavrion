import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_KEYS = new Set(["RESEND_API_KEY", "RESEND_FROM_EMAIL"]);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { actorUniqueId, key, value } = await req.json();

    if (actorUniqueId?.toLowerCase() !== "arpitadmin") {
      return new Response(JSON.stringify({ error: "Only the platform owner can update secrets" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!ALLOWED_KEYS.has(key) || !value?.trim()) {
      return new Response(JSON.stringify({ error: "Invalid secret key or empty value" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const client = createClient(supabaseUrl, serviceKey);
    const { error } = await client.from("app_secrets").upsert(
      {
        key,
        value: value.trim(),
        description: key === "RESEND_API_KEY"
          ? "Resend API key for sending email nudges"
          : "Default from address for Resend emails",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    if (error) throw error;

    if (key === "RESEND_API_KEY") {
      const testRes = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${value.trim()}` },
      });
      if (!testRes.ok) {
        const testBody = await testRes.json().catch(() => ({}));
        return new Response(
          JSON.stringify({
            saved: true,
            verified: false,
            warning: testBody.message || "Key saved but Resend rejected the connection test",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    return new Response(JSON.stringify({ saved: true, verified: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Failed to save secret" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

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
      const testBody = await testRes.json().catch(() => ({}));
      const message = String(testBody.message || "");

      // Domain-restricted keys whose domain isn't verified cannot send for any org.
      if (!testRes.ok && /not verified|unverified|full access/i.test(message)) {
        return new Response(
          JSON.stringify({
            saved: true,
            verified: false,
            warning:
              "Key saved, but Resend rejected it: create a Full Access API key at resend.com/api-keys (not a domain-restricted key), then save again. One full-access key works for every organisation.",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!testRes.ok) {
        const sendOnly =
          /restricted to only send/i.test(message) ||
          /only send/i.test(message);
        if (!sendOnly) {
          return new Response(
            JSON.stringify({
              saved: true,
              verified: false,
              warning: message || "Key saved but Resend rejected the connection test",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
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

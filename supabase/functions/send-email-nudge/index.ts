import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function isConfiguredKey(key: string | null | undefined) {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.startsWith("re_") && !trimmed.includes("YOUR_");
}

async function getSecret(client: ReturnType<typeof createClient>, key: string): Promise<string | null> {
  const { data } = await client.from("app_secrets").select("value").eq("key", key).maybeSingle();
  return data?.value ?? null;
}

async function getResendConfig() {
  const envKey = Deno.env.get("RESEND_API_KEY");
  const envFrom = Deno.env.get("RESEND_FROM_EMAIL");

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const client = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null;

  let apiKey = isConfiguredKey(envKey) ? envKey!.trim() : null;
  let fromEmail = envFrom?.trim() || null;

  if (client) {
    if (!apiKey) {
      const dbKey = await getSecret(client, "RESEND_API_KEY");
      if (isConfiguredKey(dbKey)) apiKey = dbKey!.trim();
    }
    if (!fromEmail) {
      const dbFrom = await getSecret(client, "RESEND_FROM_EMAIL");
      if (dbFrom?.trim()) fromEmail = dbFrom.trim();
    }
  }

  return {
    apiKey,
    fromEmail: fromEmail || "Tavrion Learning <noreply@jointavrion.com>",
    client,
  };
}

function personalize(template: string, recipient: { name?: string; courseTitle?: string }) {
  return template
    .replace(/\{\{name\}\}/g, recipient.name || "there")
    .replace(/\{\{course_title\}\}/g, recipient.courseTitle || "your assigned course");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { apiKey, fromEmail, client } = await getResendConfig();

    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          configured: Boolean(apiKey),
          fromEmail,
          hint: apiKey
            ? "Resend API key is configured"
            : "Add your Resend API key in Owner Portal → Email Settings or run scripts/configure-resend.mjs",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { recipients, subject, htmlBody, courseId, emailType, organizationId } = await req.json();

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY not configured. Add your key at resend.com/api-keys, then save it in Owner Portal → Email Settings.",
          configured: false,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!recipients?.length) {
      return new Response(JSON.stringify({ error: "No recipients provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const recipient of recipients) {
      const emailHtml = personalize(htmlBody, recipient);
      const emailSubject = personalize(subject, recipient);

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [recipient.email],
          subject: emailSubject,
          html: emailHtml,
        }),
      });

      const result = await res.json().catch(() => ({}));
      const status = res.ok ? "sent" : "failed";
      const errorMessage = res.ok ? null : (result.message || result.name || `HTTP ${res.status}`);

      results.push({
        email: recipient.email,
        status,
        resendId: result.id ?? null,
        error: errorMessage,
      });

      if (client) {
        await client.from("email_nudge_log").insert({
          user_id: recipient.userId || null,
          organization_id: organizationId || null,
          email_type: emailType || "course_reminder",
          course_id: courseId || null,
          recipient_email: recipient.email,
          recipient_name: recipient.name || null,
          subject: emailSubject,
          status,
          error_message: errorMessage,
        });
      }
    }

    const sent = results.filter((r) => r.status === "sent").length;
    const failed = results.filter((r) => r.status === "failed").length;

    return new Response(JSON.stringify({ results, sent, failed, fromEmail }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Email send failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

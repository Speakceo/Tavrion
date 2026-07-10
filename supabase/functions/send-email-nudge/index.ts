import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

/** Resend allows this sender without a verified custom domain. */
const RESEND_FALLBACK_FROM = "Tavrion Learning <beth.t@example.com>";
const DEFAULT_FROM = "Tavrion Learning <noreply@jointavrion.com>";

function isConfiguredKey(key: string | null | undefined) {
  if (!key) return false;
  const trimmed = key.trim();
  return trimmed.startsWith("re_") && !trimmed.includes("YOUR_");
}

function isDomainVerificationError(message: string | null | undefined) {
  if (!message) return false;
  const lower = message.toLowerCase();
  return (
    (lower.includes("domain") &&
      (lower.includes("not verified") || lower.includes("unverified") || lower.includes("verify"))) ||
    lower.includes("from address") ||
    lower.includes("invalid from") ||
    lower.includes("full access")
  );
}

function humanizeResendError(message: string | null | undefined) {
  if (!message) return "Email send failed";
  if (isDomainVerificationError(message)) {
    return `${message} — Platform fix: in Resend create a Full Access API key (not domain-restricted), verify jointavrion.com, then save the key once in Owner Portal → Email Settings. That single key works for all organisations.`;
  }
  return message;
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

  // Prefer DB secret (Owner Portal) when valid, then edge-function env.
  let apiKey: string | null = null;
  let fromEmail: string | null = null;

  if (client) {
    const dbKey = await getSecret(client, "RESEND_API_KEY");
    if (isConfiguredKey(dbKey)) apiKey = dbKey!.trim();
    const dbFrom = await getSecret(client, "RESEND_FROM_EMAIL");
    if (dbFrom?.trim()) fromEmail = dbFrom.trim();
  }

  if (!apiKey && isConfiguredKey(envKey)) apiKey = envKey!.trim();
  if (!fromEmail && envFrom?.trim()) fromEmail = envFrom.trim();

  return {
    apiKey,
    fromEmail: fromEmail || DEFAULT_FROM,
    client,
  };
}

function personalize(template: string, recipient: { name?: string; courseTitle?: string }) {
  return template
    .replace(/\{\{name\}\}/g, recipient.name || "there")
    .replace(/\{\{course_title\}\}/g, recipient.courseTitle || "your assigned course");
}

async function sendWithResend(
  apiKey: string,
  fromEmail: string,
  to: string,
  subject: string,
  html: string,
) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [to],
      subject,
      html,
    }),
  });

  const result = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    result,
    errorMessage: res.ok ? null : (result.message || result.name || `HTTP ${res.status}`),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { apiKey, fromEmail, client } = await getResendConfig();

    // Status check — works for GET, or POST with { action: "status" } / empty body.
    if (req.method === "GET") {
      return new Response(
        JSON.stringify({
          configured: Boolean(apiKey),
          fromEmail,
          fallbackFrom: RESEND_FALLBACK_FROM,
          platformWide: true,
          hint: apiKey
            ? "Resend is configured platform-wide for all organisations"
            : "Add your Resend API key in Owner Portal → Email Settings or run scripts/configure-resend.mjs",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    if (!body || Object.keys(body).length === 0 || body.action === "status") {
      return new Response(
        JSON.stringify({
          configured: Boolean(apiKey),
          fromEmail,
          fallbackFrom: RESEND_FALLBACK_FROM,
          platformWide: true,
          hint: apiKey
            ? "Resend is configured platform-wide for all organisations"
            : "Add your Resend API key in Owner Portal → Email Settings or run scripts/configure-resend.mjs",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { recipients, subject, htmlBody, courseId, emailType, organizationId } = body as {
      recipients?: Array<{ email: string; name?: string; courseTitle?: string; userId?: string }>;
      subject?: string;
      htmlBody?: string;
      courseId?: string;
      emailType?: string;
      organizationId?: string;
    };

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "RESEND_API_KEY not configured. Add your key at resend.com/api-keys, then save it in Owner Portal → Email Settings. One key works for every organisation.",
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

    if (!subject || !htmlBody) {
      return new Response(JSON.stringify({ error: "subject and htmlBody are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];
    let usedFallbackFrom = false;

    for (const recipient of recipients) {
      const emailHtml = personalize(htmlBody, recipient);
      const emailSubject = personalize(subject, recipient);

      let send = await sendWithResend(apiKey, fromEmail, recipient.email, emailSubject, emailHtml);

      // If custom domain isn't verified on this API key, retry with Resend's shared sender.
      // This keeps nudges working for every org without per-org email setup.
      if (!send.ok && isDomainVerificationError(send.errorMessage) && fromEmail !== RESEND_FALLBACK_FROM) {
        const retry = await sendWithResend(
          apiKey,
          RESEND_FALLBACK_FROM,
          recipient.email,
          emailSubject,
          emailHtml,
        );
        if (retry.ok) {
          send = retry;
          usedFallbackFrom = true;
        }
      }

      const status = send.ok ? "sent" : "failed";
      const errorMessage = send.ok ? null : humanizeResendError(send.errorMessage);

      results.push({
        email: recipient.email,
        status,
        resendId: send.result?.id ?? null,
        error: errorMessage,
        fromUsed: send.ok
          ? (usedFallbackFrom ? RESEND_FALLBACK_FROM : fromEmail)
          : fromEmail,
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

    return new Response(JSON.stringify({
      results,
      sent,
      failed,
      fromEmail: usedFallbackFrom ? RESEND_FALLBACK_FROM : fromEmail,
      usedFallbackFrom,
      platformWide: true,
      warning: usedFallbackFrom
        ? `Custom from-address domain is not verified in Resend. Emails were sent via ${RESEND_FALLBACK_FROM}. Verify jointavrion.com in Resend for branded sender.`
        : undefined,
    }), {
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

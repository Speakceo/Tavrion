import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function getResendKey(): Promise<string | null> {
  // Prefer injected env var (set via Supabase dashboard secrets)
  const envKey = Deno.env.get("RESEND_API_KEY");
  if (envKey) return envKey;

  // Fall back to app_secrets table via service role
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;

  const client = createClient(supabaseUrl, serviceKey);
  const { data } = await client
    .from("app_secrets")
    .select("value")
    .eq("key", "RESEND_API_KEY")
    .maybeSingle();

  return data?.value ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { recipients, subject, htmlBody, courseId, emailType, organizationId } = await req.json();

    const RESEND_API_KEY = await getResendKey();
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!recipients?.length) {
      return new Response(JSON.stringify({ error: "No recipients provided" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const recipient of recipients) {
      const emailHtml = htmlBody
        .replace(/\{\{name\}\}/g, recipient.name)
        .replace(/\{\{course_title\}\}/g, recipient.courseTitle || "your assigned course");

      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Tavrion Learning <noreply@jointavrion.com>",
          to: [recipient.email],
          subject: subject.replace(/\{\{name\}\}/g, recipient.name),
          html: emailHtml,
        }),
      });

      const result = await res.json();
      results.push({
        email: recipient.email,
        status: res.ok ? "sent" : "failed",
        resendId: result.id,
        error: res.ok ? null : (result.message || result.name),
      });
    }

    const sent = results.filter(r => r.status === "sent").length;
    const failed = results.filter(r => r.status === "failed").length;

    return new Response(JSON.stringify({ results, sent, failed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

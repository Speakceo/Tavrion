import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const reqUrl = new URL(req.url);
    const target = reqUrl.searchParams.get("url");
    if (!target) throw new Error("Missing url parameter");

    const parsed = new URL(target);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Invalid URL protocol");
    }

    const response = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Tavrion-DnaStudio-ImageProxy/1.0" },
      redirect: "follow",
    });

    if (!response.ok) throw new Error(`Upstream returned ${response.status}`);

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      throw new Error("URL is not an image");
    }

    const buffer = await response.arrayBuffer();

    return new Response(buffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

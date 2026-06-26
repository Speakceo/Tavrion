const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function extractMeta(html: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<meta[^>]*(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*(?:name|property)=["']${escaped}["']`, "i"),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return "";
}

function resolveUrl(base: string, relative: string): string {
  try {
    return new URL(relative, base).toString();
  } catch {
    return relative;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    const url = new URL(req.url).searchParams.get("url");
    if (!url) throw new Error("url parameter required");

    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Invalid URL");

    const res = await fetch(parsed.toString(), {
      headers: { "User-Agent": "TavrionBot-LinkPreview/1.0" },
      redirect: "follow",
    });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

    const finalUrl = res.url || parsed.toString();
    const html = await res.text();

    const title = extractMeta(html, "og:title")
      || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim()
      || finalUrl;

    const description = extractMeta(html, "og:description")
      || extractMeta(html, "description")
      || "";

    let image = extractMeta(html, "og:image") || extractMeta(html, "twitter:image");
    if (image) image = resolveUrl(finalUrl, image);

    const siteName = extractMeta(html, "og:site_name") || new URL(finalUrl).hostname;

    return new Response(JSON.stringify({
      url: finalUrl,
      title: title.slice(0, 200),
      description: description.slice(0, 300),
      image,
      siteName,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Preview error";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

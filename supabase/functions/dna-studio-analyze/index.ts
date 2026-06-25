import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function ensureHttpUrl(input: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are supported");
  }
  return parsed;
}

function extractMeta(content: string, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<meta[^>]*(?:name|property)=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`,
    "i",
  );
  return regex.exec(content)?.[1]?.trim() ?? "";
}

function extractTitle(content: string): string {
  return content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() ?? "";
}

function extractLanguage(content: string): string {
  return content.match(/<html[^>]*lang=["']([^"']+)["']/i)?.[1]?.trim() ?? "";
}

function extractHeadings(content: string): string[] {
  const matches = content.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi);
  const headings: string[] = [];
  for (const match of matches) {
    const text = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text.length > 0) headings.push(text);
    if (headings.length >= 8) break;
  }
  return headings;
}

function extractColors(content: string): string[] {
  const hexMatches = content.match(/#[0-9a-fA-F]{3,8}\b/g) ?? [];
  const normalized = hexMatches.map((c) => c.toLowerCase());
  return [...new Set(normalized)].slice(0, 12);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      throw new Error("Request body must include a valid 'url' string");
    }

    const parsedUrl = ensureHttpUrl(url);
    const response = await fetch(parsedUrl.toString(), {
      method: "GET",
      headers: {
        "User-Agent": "Tavrion-DnaStudio/1.0",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL (${response.status})`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
      throw new Error("URL did not return an HTML page");
    }

    const html = await response.text();
    const title = extractTitle(html);
    const description = extractMeta(html, "description") || extractMeta(html, "og:description");
    const topHeadings = extractHeadings(html);
    const detectedColors = extractColors(html);

    const result = {
      url: parsedUrl.toString(),
      title,
      description,
      language: extractLanguage(html) || "unknown",
      topHeadings,
      og: {
        title: extractMeta(html, "og:title"),
        description: extractMeta(html, "og:description"),
        image: extractMeta(html, "og:image"),
      },
      detectedColors,
      summary: `Page "${title || "Untitled"}" appears to focus on ${
        topHeadings[0] || "general content"
      }. Extracted ${topHeadings.length} headings and ${detectedColors.length} color tokens.`,
    };

    return new Response(JSON.stringify(result), {
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


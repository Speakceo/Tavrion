import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function ensureHttpUrl(input: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(input.startsWith("http") ? input : `https://${input}`);
  } catch {
    throw new Error("Invalid URL format");
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are supported");
  }
  return parsed;
}

function resolveUrl(base: string, relative: string): string {
  try {
    if (!relative) return "";
    if (relative.startsWith("data:")) return relative;
    return new URL(relative, base).toString();
  } catch {
    return relative;
  }
}

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

function extractLink(html: string, rel: string): string {
  const re = new RegExp(`<link[^>]*rel=["'][^"']*${rel}[^"']*["'][^>]*href=["']([^"']+)["']`, "i");
  const m = re.exec(html);
  return m?.[1]?.trim() ?? "";
}

function extractTitle(html: string): string {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
}

function extractLanguage(html: string): string {
  return html.match(/<html[^>]*lang=["']([^"']+)["']/i)?.[1]?.trim() ?? "";
}

function extractHeadings(html: string): string[] {
  const headings: string[] = [];
  for (const match of html.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)) {
    const text = match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) headings.push(text);
    if (headings.length >= 10) break;
  }
  return headings;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function normalizeColor(raw: string): string | null {
  const hex = raw.match(/#([0-9a-fA-F]{3,8})\b/);
  if (hex) {
    let h = hex[0].toLowerCase();
    if (h.length === 4) h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
    return h.slice(0, 7);
  }
  const rgb = raw.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgb) return rgbToHex(+rgb[1], +rgb[2], +rgb[3]);
  return null;
}

function extractColorsFromText(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const c = normalizeColor(m[0]);
    if (c && c !== "#ffffff" && c !== "#000000") found.add(c);
  }
  for (const m of text.matchAll(/rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/gi)) {
    const c = normalizeColor(m[0]);
    if (c && c !== "#ffffff" && c !== "#000000") found.add(c);
  }
  return [...found];
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 4000);
}

function extractStylesheetUrls(html: string, baseUrl: string): string[] {
  const urls: string[] = [];
  for (const m of html.matchAll(/<link[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/gi)) {
    urls.push(resolveUrl(baseUrl, m[1]));
    if (urls.length >= 4) break;
  }
  return urls;
}

function extractLogoCandidates(html: string, baseUrl: string) {
  const logos: { url: string; alt: string }[] = [];
  for (const m of html.matchAll(/<img[^>]*>/gi)) {
    const tag = m[0];
    const src = tag.match(/src=["']([^"']+)["']/i)?.[1];
    if (!src || src.startsWith("data:")) continue;
    const alt = tag.match(/alt=["']([^"']*)["']/i)?.[1] ?? "";
    const cls = (tag.match(/class=["']([^"']*)["']/i)?.[1] ?? "").toLowerCase();
    const id = (tag.match(/id=["']([^"']*)["']/i)?.[1] ?? "").toLowerCase();
    const combined = `${alt} ${src} ${cls} ${id}`.toLowerCase();
    if (/logo|brand|site-icon|navbar-brand/.test(combined)) {
      logos.push({ url: resolveUrl(baseUrl, src), alt: alt || "Logo" });
    }
    if (logos.length >= 4) break;
  }
  return logos;
}

async function getSecret(key: string): Promise<string | null> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data } = await supabase.from("app_secrets").select("value").eq("key", key).maybeSingle();
    return data?.value ?? null;
  } catch {
    return null;
  }
}

async function isValidImageUrl(imageUrl: string): Promise<boolean> {
  if (!imageUrl || imageUrl.startsWith("data:")) return false;
  try {
    const res = await fetch(imageUrl, {
      method: "HEAD",
      headers: { "User-Agent": "Tavrion-DnaStudio/2.0" },
      redirect: "follow",
    });
    const ct = res.headers.get("content-type") || "";
    return res.ok && ct.startsWith("image/");
  } catch {
    return false;
  }
}

async function analyzeWithAI(payload: Record<string, unknown>) {
  const apiKey = await getSecret("OPENAI_API_KEY");
  if (!apiKey) return null;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a brand strategist. Analyze website data and return JSON:
{
  "name": "brand name",
  "tagline": "short tagline",
  "industry": "industry",
  "category": "category",
  "keywords": ["kw1","kw2"],
  "tone": { "primary": "professional|friendly|playful|luxurious|technical|inspirational", "description": "...", "formality": 0-100, "energy": 0-100, "warmth": 0-100 },
  "audience": { "primary": "...", "secondary": "...", "ageRange": "...", "interests": [], "painPoints": [] },
  "summary": "2-3 sentence brand positioning summary",
  "colorRoles": [{ "hex": "#...", "usage": "primary|secondary|accent|background|text" }]
}`,
        },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
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
        "User-Agent": "Mozilla/5.0 (compatible; Tavrion-DnaStudio/2.0; +https://jointavrion.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) throw new Error(`Failed to fetch URL (${response.status})`);

    const finalUrl = response.url || parsedUrl.toString();
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("URL did not return an HTML page");
    }

    const html = await response.text();
    const title = extractMeta(html, "og:title") || extractTitle(html);
    const description = extractMeta(html, "description") || extractMeta(html, "og:description");
    const ogImage = resolveUrl(finalUrl, extractMeta(html, "og:image") || extractMeta(html, "twitter:image"));
    const favicon = resolveUrl(
      finalUrl,
      extractLink(html, "apple-touch-icon") || extractLink(html, "icon") || "/favicon.ico",
    );
    const themeColor = extractMeta(html, "theme-color");
    const siteName = extractMeta(html, "og:site_name");
    const topHeadings = extractHeadings(html);
    const rawText = stripHtmlToText(html);
    const logos = extractLogoCandidates(html, finalUrl);

    let previewImage = ogImage || null;
    if (previewImage && !(await isValidImageUrl(previewImage))) {
      previewImage = null;
    }
    if (!previewImage && logos[0]?.url && (await isValidImageUrl(logos[0].url))) {
      previewImage = logos[0].url;
    }
    if (!previewImage && favicon && (await isValidImageUrl(favicon))) {
      previewImage = favicon;
    }

    let detectedColors = extractColorsFromText(html);
    if (themeColor) {
      const tc = normalizeColor(themeColor);
      if (tc) detectedColors.unshift(tc);
    }

    const stylesheetUrls = extractStylesheetUrls(html, finalUrl);
    for (const cssUrl of stylesheetUrls) {
      try {
        const cssRes = await fetch(cssUrl, { headers: { "User-Agent": "Tavrion-DnaStudio/2.0" } });
        if (cssRes.ok) {
          const css = await cssRes.text();
          detectedColors.push(...extractColorsFromText(css));
        }
      } catch {
        // skip unreachable stylesheets
      }
    }
    detectedColors = [...new Set(detectedColors)].slice(0, 12);

    const ai = await analyzeWithAI({
      url: finalUrl,
      title,
      description,
      siteName,
      headings: topHeadings,
      colors: detectedColors,
      textSample: rawText.slice(0, 2500),
    });

    const brandName = ai?.name || siteName || title || "Unknown Brand";
    const colorPalette = (ai?.colorRoles?.length ? ai.colorRoles : detectedColors.map((hex, i) => ({
      hex,
      usage: i === 0 ? "primary" : i === 1 ? "secondary" : "accent",
      name: hex,
    }))).slice(0, 8);

    const result = {
      url: finalUrl,
      title,
      description,
      language: extractLanguage(html) || "unknown",
      topHeadings,
      rawTextPreview: rawText.slice(0, 500),
      og: {
        title: extractMeta(html, "og:title") || title,
        description: extractMeta(html, "og:description") || description,
        image: ogImage,
        siteName,
      },
      favicon,
      logoUrl: logos[0]?.url || favicon || null,
      logos,
      detectedColors,
      colorPalette,
      brand: {
        name: brandName,
        tagline: ai?.tagline || description?.slice(0, 120) || "",
        industry: ai?.industry || "General",
        category: ai?.category || "Business",
        keywords: ai?.keywords || [],
        tone: ai?.tone || { primary: "professional", description: "Professional and clear", formality: 60, energy: 50, warmth: 50 },
        audience: ai?.audience || { primary: "General audience", secondary: "", ageRange: "25-45", interests: [], painPoints: [] },
      },
      summary: ai?.summary || `Brand "${brandName}" — ${description || "No description available."}`,
      previewImage: previewImage || null,
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

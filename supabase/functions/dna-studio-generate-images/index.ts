import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SIZE = 1024;

type ColorRole = { hex: string; usage?: string; name?: string };

type VisualStyle = {
  aesthetic?: string;
  brandMotifs?: string[];
  shapes?: string;
};

type BrandInput = {
  name: string;
  tagline?: string;
  industry?: string;
  category?: string;
  summary?: string;
  keywords?: string[];
  logoUrl?: string | null;
  tone?: { primary?: string; description?: string };
  audience?: { primary?: string };
  visualStyle?: VisualStyle;
  colorPalette?: ColorRole[];
  detectedColors?: string[];
  designSystem?: { imageStyleRules?: string };
};

type CampaignBrief = { purpose?: string; keyMessage?: string; useCase?: string };
type ConceptInput = { name: string; imageScene: string };

function resolvePalette(brand: BrandInput) {
  const palette = brand.colorPalette?.length
    ? brand.colorPalette
    : (brand.detectedColors || []).map((hex, i) => ({
      hex,
      usage: i === 0 ? "primary" : i === 1 ? "secondary" : "accent",
    }));

  const primary = palette.find((c) => c.usage === "primary")?.hex || palette[0]?.hex || "#635BFF";
  const secondary = palette.find((c) => c.usage === "secondary")?.hex || palette[1]?.hex || "#0A2540";
  const accent = palette.find((c) => c.usage === "accent")?.hex || palette[2]?.hex || primary;

  return { palette, primary, secondary, accent };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function svgToDataUrl(svg: string): string {
  const encoded = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

/** Exact brand DNA background — SVG with precise hex stops, not AI */
function renderBrandPlateSvg(brand: BrandInput): string {
  const { primary, secondary, accent } = resolvePalette(brand);
  const industry = (brand.industry || "").toLowerCase();
  const isFintech = /fintech|finance|payment|bank|saas|tech|software/.test(industry);

  const gridLines = isFintech
    ? Array.from({ length: Math.floor(SIZE / 64) + 1 }, (_, i) => {
      const pos = i * 64;
      return `<line x1="0" y1="${pos}" x2="${SIZE}" y2="${pos}" stroke="${accent}" stroke-opacity="0.11" stroke-width="1"/>
      <line x1="${pos}" y1="0" x2="${pos}" y2="${SIZE}" stroke="${accent}" stroke-opacity="0.11" stroke-width="1"/>`;
    }).join("")
    : "";

  const rings = [0, 1, 2].map((i) => {
    const r = 180 + i * 90;
    const cx = SIZE - 120 - i * 40;
    const cy = 120 + i * 30;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${accent}" stroke-opacity="${0.12 + i * 0.04}" stroke-width="3"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="brandBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="55%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
    <radialGradient id="accentGlow" cx="72%" cy="28%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sheen" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="40%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#brandBg)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#accentGlow)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#sheen)"/>
  ${gridLines}
  ${rings}
</svg>`;
}

async function fetchImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Tavrion-DnaStudio/3.0" } });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") || "image/png";
    const bytes = new Uint8Array(await res.arrayBuffer());
    let binary = "";
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk);
      binary += String.fromCharCode(...slice);
    }
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

async function getSecret(key: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase.from("app_secrets").select("value").eq("key", key).maybeSingle();
  if (error || !data) throw new Error(`Secret ${key} not found`);
  return data.value;
}

function buildSubjectPrompt(brand: BrandInput, concept: ConceptInput, brief?: CampaignBrief): string {
  const { primary, secondary, accent } = resolvePalette(brand);
  const motifs = (brand.visualStyle?.brandMotifs || brand.keywords || []).slice(0, 4).join(", ");

  return [
    `Isolated 3D illustration or icon representing: ${concept.imageScene}.`,
    `For ${brand.name} (${brand.industry || "brand"}). Campaign: ${brief?.purpose || concept.name}.`,
    `CRITICAL: Subject/object ONLY — centered, floating.`,
    `Use ONLY these colors for the object: ${primary}, ${secondary}, ${accent}, and white.`,
    `Pure white background (#FFFFFF) behind subject only — no scenery, no office, no gradient, no environment.`,
    `Style: ${brand.visualStyle?.aesthetic || "modern minimal SaaS marketing illustration"}.`,
    motifs ? `Visual motifs: ${motifs}.` : "",
    `NO text, NO logos, NO letters, NO watermarks.`,
    `Like a single hero product icon for a ${brand.industry} social ad.`,
  ].filter(Boolean).join(" ");
}

async function generateSubjectDataUrl(apiKey: string, prompt: string): Promise<string | null> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: prompt.slice(0, 4000),
      n: 1,
      size: "1024x1024",
      output_format: "png",
    }),
  });

  if (!response.ok) return null;

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) return null;

  return `data:image/png;base64,${b64}`;
}

function buildCompositeSvg(
  brand: BrandInput,
  subjectDataUrl: string | null,
  logoDataUrl: string | null,
): string {
  const plate = renderBrandPlateSvg(brand);
  const subjectW = Math.round(SIZE * 0.62);
  const subjectH = subjectW;
  const subjectX = Math.round((SIZE - subjectW) / 2);
  const subjectY = Math.round(SIZE * 0.34);

  const subjectLayer = subjectDataUrl
    ? `<g style="mix-blend-mode:multiply">
         <image href="${escapeXml(subjectDataUrl)}" x="${subjectX}" y="${subjectY}" width="${subjectW}" height="${subjectH}" preserveAspectRatio="xMidYMid meet"/>
       </g>`
    : "";

  const logoLayer = logoDataUrl
    ? `<rect x="32" y="32" width="120" height="120" rx="16" fill="#ffffff" fill-opacity="0.92"/>
       <image href="${escapeXml(logoDataUrl)}" x="48" y="48" width="88" height="88" preserveAspectRatio="xMidYMid meet"/>`
    : `<rect x="32" y="32" width="${Math.min(280, 48 + brand.name.length * 14)}" height="56" rx="12" fill="#ffffff" fill-opacity="0.92"/>
       <text x="48" y="68" fill="${resolvePalette(brand).secondary}" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="700">${escapeXml(brand.name)}</text>`;

  return plate.replace(
    "</svg>",
    `${subjectLayer}
  ${logoLayer}
</svg>`,
  );
}

async function compositeBrandSocialImage(
  brand: BrandInput,
  concept: ConceptInput,
  brief: CampaignBrief | undefined,
  apiKey: string,
): Promise<string> {
  const subjectPrompt = buildSubjectPrompt(brand, concept, brief);
  const [subjectDataUrl, logoDataUrl] = await Promise.all([
    generateSubjectDataUrl(apiKey, subjectPrompt),
    brand.logoUrl ? fetchImageAsDataUrl(brand.logoUrl) : Promise.resolve(null),
  ]);

  const svg = buildCompositeSvg(brand, subjectDataUrl, logoDataUrl);
  return svgToDataUrl(svg);
}

async function generateConceptImage(
  apiKey: string,
  brand: BrandInput,
  concept: ConceptInput,
  conceptIndex: number,
  brief?: CampaignBrief,
) {
  const url = await compositeBrandSocialImage(brand, concept, brief, apiKey);
  return {
    conceptIndex,
    name: concept.name,
    url,
    imageScene: concept.imageScene,
    method: "brand-plate-composite",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { brand, concepts, concept, conceptIndex, brief } = await req.json();
    if (!brand?.name) throw new Error("brand is required");
    if (!concept && (!Array.isArray(concepts) || concepts.length === 0)) {
      throw new Error("concept or concepts array is required");
    }

    const apiKey = await getSecret("OPENAI_API_KEY");

    if (concept && typeof conceptIndex === "number") {
      if (!concept.imageScene?.trim()) throw new Error("imageScene is required");
      const image = await generateConceptImage(apiKey, brand, concept as ConceptInput, conceptIndex, brief);
      return new Response(JSON.stringify({ images: [image] }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toGenerate = (concepts as ConceptInput[]).slice(0, 3);
    const images = await Promise.all(
      toGenerate.map(async (c, i) => {
        if (!c.imageScene?.trim()) return null;
        return generateConceptImage(apiKey, brand, c, i, brief);
      }),
    );

    const valid = images.filter((img): img is NonNullable<typeof img> => img !== null);
    if (valid.length === 0) throw new Error("No images could be generated");

    return new Response(JSON.stringify({ images: valid }), {
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

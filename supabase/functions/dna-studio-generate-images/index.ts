import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ColorRole = { hex: string; usage?: string; name?: string };

type VisualStyle = {
  aesthetic?: string;
  photography?: string;
  illustration?: string;
  shapes?: string;
  lighting?: string;
  textures?: string;
  composition?: string;
  brandMotifs?: string[];
};

type BrandInput = {
  name: string;
  tagline?: string;
  industry?: string;
  category?: string;
  summary?: string;
  keywords?: string[];
  tone?: { primary?: string; description?: string; formality?: number; energy?: number; warmth?: number };
  audience?: { primary?: string };
  visualStyle?: VisualStyle;
  colorPalette?: ColorRole[];
  detectedColors?: string[];
  designSystem?: { imageStyleRules?: string; primaryColor?: string };
};

type CampaignBrief = {
  purpose?: string;
  keyMessage?: string;
  useCase?: string;
};

type ConceptInput = {
  name: string;
  imageScene: string;
};

function resolvePalette(brand: BrandInput) {
  const palette = brand.colorPalette?.length
    ? brand.colorPalette
    : (brand.detectedColors || []).map((hex, i) => ({
      hex,
      usage: i === 0 ? "primary" : i === 1 ? "secondary" : "accent",
    }));

  const primary = palette.find((c) => c.usage === "primary")?.hex || palette[0]?.hex || "#6366f1";
  const secondary = palette.find((c) => c.usage === "secondary")?.hex || palette[1]?.hex || primary;
  const accent = palette.find((c) => c.usage === "accent")?.hex || palette[2]?.hex || secondary;
  const background = palette.find((c) => c.usage === "background")?.hex;

  return { palette, primary, secondary, accent, background };
}

const TONE_VISUAL: Record<string, string> = {
  professional: "corporate editorial photography, crisp edges, restrained layout, executive polish",
  friendly: "warm approachable imagery, soft gradients, human-centric scenes, inviting atmosphere",
  playful: "bold saturated colors, dynamic angles, energetic composition, modern startup energy",
  luxurious: "premium materials, dramatic lighting, ample negative space, high-end editorial",
  technical: "precise geometric forms, data-inspired visuals, clean grids, developer-tool aesthetic",
  inspirational: "uplifting wide compositions, aspirational lighting, forward momentum, hero framing",
};

async function getSecret(key: string): Promise<string> {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data, error } = await supabase.from("app_secrets").select("value").eq("key", key).maybeSingle();
  if (error || !data) throw new Error(`Secret ${key} not found`);
  return data.value;
}

async function craftBrandImagePrompt(
  apiKey: string,
  brand: BrandInput,
  concept: ConceptInput,
  brief?: CampaignBrief,
): Promise<string> {
  const { primary, secondary, accent, background, palette } = resolvePalette(brand);
  const vs = brand.visualStyle || {};
  const toneKey = (brand.tone?.primary || "professional").toLowerCase();
  const toneVisual = TONE_VISUAL[toneKey] || TONE_VISUAL.professional;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You write hyper-specific image generation prompts for social campaign hero images.

The image MUST look like it was art-directed for THIS exact brand — not a generic stock photo.

LOCKED BRAND DNA (non-negotiable):
- Use the exact hex colors as dominant visual elements (60% primary, 25% secondary, 15% accent in the scene)
- Match the brand's visual aesthetic, photography style, shapes, lighting, and motifs
- Reflect industry and audience in subject matter
- Campaign scene must serve the user's stated purpose

FORBIDDEN: generic office stock photos, random unrelated colors, clip-art, text, logos, words, letters, watermarks, UI mockups with readable text.

Return JSON: { "prompt": "single detailed paragraph, 150-250 words, ready for image model" }`,
        },
        {
          role: "user",
          content: JSON.stringify({
            brand: {
              name: brand.name,
              tagline: brand.tagline,
              industry: brand.industry,
              category: brand.category,
              summary: brand.summary,
              keywords: brand.keywords,
              tone: brand.tone,
              audience: brand.audience?.primary,
            },
            colors: {
              primary,
              secondary,
              accent,
              background,
              fullPalette: palette,
              colorRule: `Dominant ${primary}, supporting ${secondary}, highlights ${accent}`,
            },
            visualStyle: {
              aesthetic: vs.aesthetic || toneVisual,
              photography: vs.photography,
              illustration: vs.illustration,
              shapes: vs.shapes,
              lighting: vs.lighting,
              textures: vs.textures,
              composition: vs.composition,
              brandMotifs: vs.brandMotifs || brand.keywords,
            },
            designSystemRules: brand.designSystem?.imageStyleRules,
            campaign: {
              conceptName: concept.name,
              imageScene: concept.imageScene,
              purpose: brief?.purpose,
              keyMessage: brief?.keyMessage,
              useCase: brief?.useCase,
            },
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Prompt craft error: ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty prompt craft response");

  try {
    const parsed = JSON.parse(content);
    if (parsed.prompt?.trim()) return parsed.prompt.trim();
  } catch {
    // fallback below
  }

  return buildFallbackPrompt(brand, concept, brief);
}

function buildFallbackPrompt(brand: BrandInput, concept: ConceptInput, brief?: CampaignBrief): string {
  const { primary, secondary, accent, palette } = resolvePalette(brand);
  const vs = brand.visualStyle || {};
  const toneKey = (brand.tone?.primary || "professional").toLowerCase();

  return [
    `Premium social media hero image art-directed exclusively for ${brand.name}, a ${brand.industry || "business"} brand.`,
    `Brand positioning: ${brand.summary || brand.tagline || brand.name}.`,
    `STRICT color dominance: ${primary} covers ~60% of the frame (backgrounds, key objects, lighting gel), ${secondary} ~25%, accent ${accent} ~15%.`,
    `Full palette reference: ${palette.map((c) => `${c.hex} (${c.usage || "color"})`).join(", ")}.`,
    `Visual aesthetic: ${vs.aesthetic || TONE_VISUAL[toneKey]}.`,
    vs.photography ? `Photography style: ${vs.photography}.` : "",
    vs.lighting ? `Lighting: ${vs.lighting}.` : "",
    vs.shapes ? `Shapes/forms: ${vs.shapes}.` : "",
    vs.textures ? `Textures: ${vs.textures}.` : "",
    `Brand motifs to include visually: ${(vs.brandMotifs || brand.keywords || []).slice(0, 5).join(", ")}.`,
    `Campaign angle "${concept.name}": ${concept.imageScene}`,
    brief?.purpose ? `Campaign goal: ${brief.purpose}.` : "",
    brief?.keyMessage ? `Must visually evoke: ${brief.keyMessage}.` : "",
    `Composition: ${vs.composition || "clean hero shot with negative space for copy overlay, Instagram-ready 1:1"}.`,
    `NOT generic stock imagery. Must feel unmistakably like ${brand.name}'s website and brand world.`,
    `Absolutely no text, logos, words, letters, or watermarks in the image.`,
  ].filter(Boolean).join(" ");
}

async function generateOneImage(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: prompt.slice(0, 4000),
      n: 1,
      size: "1024x1024",
      output_format: "png",
      quality: "high",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    // quality: high may not be supported — retry without
    if (err.includes("quality")) {
      const retry = await fetch("https://api.openai.com/v1/images/generations", {
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
      if (!retry.ok) throw new Error(`Image API error: ${(await retry.text()).slice(0, 300)}`);
      const retryData = await retry.json();
      const b64 = retryData.data?.[0]?.b64_json;
      if (b64) return `data:image/png;base64,${b64}`;
    }
    throw new Error(`Image API error: ${err.slice(0, 300)}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (b64) return `data:image/png;base64,${b64}`;

  const imageUrl = data.data?.[0]?.url;
  if (!imageUrl) throw new Error("No image data returned");

  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error("Failed to download generated image");
  const bytes = new Uint8Array(await imgRes.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:image/png;base64,${btoa(binary)}`;
}

async function generateConceptImage(
  apiKey: string,
  brand: BrandInput,
  concept: ConceptInput,
  conceptIndex: number,
  brief?: CampaignBrief,
) {
  const prompt = await craftBrandImagePrompt(apiKey, brand, concept, brief);
  const url = await generateOneImage(apiKey, prompt);
  return { conceptIndex, name: concept.name, url, imageScene: concept.imageScene, promptUsed: prompt.slice(0, 500) };
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

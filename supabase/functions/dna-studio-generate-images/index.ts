import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ColorRole = { hex: string; usage?: string };

type BrandInput = {
  name: string;
  industry?: string;
  category?: string;
  tone?: { primary?: string; description?: string };
  colorPalette?: ColorRole[];
  detectedColors?: string[];
};

type ConceptInput = {
  name: string;
  imageScene: string;
};

function buildImagePrompt(brand: BrandInput, scene: string): string {
  const palette = brand.colorPalette?.length
    ? brand.colorPalette
    : (brand.detectedColors || []).map((hex, i) => ({
      hex,
      usage: i === 0 ? "primary" : "accent",
    }));

  const primary = palette.find((c) => c.usage === "primary")?.hex || palette[0]?.hex || "#6366f1";
  const secondary = palette.find((c) => c.usage === "secondary")?.hex || palette[1]?.hex || primary;
  const accent = palette.find((c) => c.usage === "accent")?.hex || palette[2]?.hex || secondary;
  const tone = brand.tone?.primary || "professional";

  return [
    `Professional social media campaign hero image for ${brand.name}.`,
    `Industry: ${brand.industry || "business"}. Visual mood: ${tone}, ${brand.tone?.description || "modern and polished"}.`,
    `Color palette strictly: primary ${primary}, secondary ${secondary}, accent ${accent}.`,
    `Use these exact hex colors prominently in the composition, lighting, and gradients.`,
    `Scene: ${scene}`,
    `Style: high-end marketing photography or premium 3D illustration, clean composition, negative space for text overlay.`,
    `CRITICAL: No text, no logos, no words, no letters, no watermarks anywhere in the image.`,
  ].join(" ");
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

async function generateOneImage(apiKey: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt.slice(0, 4000),
      n: 1,
      size: "1024x1024",
      quality: "standard",
      response_format: "b64_json",
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`DALL-E error: ${err.slice(0, 300)}`);
  }

  const data = await response.json();
  const b64 = data.data?.[0]?.b64_json;
  if (!b64) throw new Error("No image data returned");
  return `data:image/png;base64,${b64}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { brand, concepts, concept, conceptIndex } = await req.json();
    if (!brand?.name) throw new Error("brand is required");
    if (!concept && (!Array.isArray(concepts) || concepts.length === 0)) {
      throw new Error("concept or concepts array is required");
    }

    const body = { concept, conceptIndex, concepts };

    const apiKey = await getSecret("OPENAI_API_KEY");

    // Single concept mode (frontend fires 3 parallel calls for progressive card loading)
    if (body.concept && typeof body.conceptIndex === "number") {
      const concept = body.concept as ConceptInput;
      if (!concept.imageScene?.trim()) throw new Error("imageScene is required");
      const prompt = buildImagePrompt(brand, concept.imageScene.trim());
      const url = await generateOneImage(apiKey, prompt);
      return new Response(JSON.stringify({
        images: [{ conceptIndex: body.conceptIndex, name: concept.name, url, imageScene: concept.imageScene }],
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const toGenerate = (body.concepts as ConceptInput[]).slice(0, 3);

    const images = await Promise.all(
      toGenerate.map(async (concept, i) => {
        if (!concept.imageScene?.trim()) return null;
        const prompt = buildImagePrompt(brand, concept.imageScene.trim());
        const url = await generateOneImage(apiKey, prompt);
        return {
          conceptIndex: i,
          name: concept.name,
          url,
          imageScene: concept.imageScene,
        };
      }),
    );

    const valid = images.filter((img): img is NonNullable<typeof img> => img !== null);

    if (valid.length === 0) {
      throw new Error("No images could be generated — missing image scenes");
    }

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

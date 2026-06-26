import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLATFORM_RULES: Record<string, string> = {
  instagram: "Visual, emoji-friendly, strong hook in first line. Max 2200 chars. 5-10 hashtags.",
  linkedin: "Professional thought-leadership tone. Max 3000 chars. 3-5 hashtags.",
  twitter: "Punchy, conversational. STRICT max 280 characters including hashtags.",
  facebook: "Conversational, shareable, community-focused. Max 500 chars. 2-4 hashtags.",
};

type ColorRole = { hex: string; usage?: string; name?: string };

type BrandInput = {
  name: string;
  tagline?: string;
  industry?: string;
  category?: string;
  keywords?: string[];
  tone?: { primary?: string; description?: string; formality?: number; energy?: number; warmth?: number };
  audience?: { primary?: string; secondary?: string; ageRange?: string };
  colorPalette?: ColorRole[];
  detectedColors?: string[];
  summary?: string;
  logoUrl?: string | null;
  previewImage?: string | null;
};

type CampaignBrief = {
  purpose: string;
  useCase?: string;
  keyMessage?: string;
  ctaIntent?: string;
  audienceOverride?: string;
};

/** Design system is always derived from extracted DNA — never user-editable */
function buildDesignSystemFromDna(brand: BrandInput) {
  const palette = brand.colorPalette?.length
    ? brand.colorPalette
    : (brand.detectedColors || []).map((hex, i) => ({
      hex,
      usage: i === 0 ? "primary" : i === 1 ? "secondary" : "accent",
    }));

  const primary = palette.find((c) => c.usage === "primary")?.hex || palette[0]?.hex || "#6366f1";
  const secondary = palette.find((c) => c.usage === "secondary")?.hex || palette[1]?.hex || primary;
  const accent = palette.find((c) => c.usage === "accent")?.hex || palette[2]?.hex || secondary;

  const tone = brand.tone?.primary || "professional";
  const toneDesc = brand.tone?.description || "Clear, confident brand voice";

  const imageStyleRules = [
    `Brand: ${brand.name}`,
    `Primary color ${primary}, secondary ${secondary}, accent ${accent}`,
    `Visual tone: ${tone} — ${toneDesc}`,
    `Industry aesthetic: ${brand.industry || "general"} / ${brand.category || "business"}`,
    `Composition: clean, modern, on-brand photography or illustration`,
    `Color grading must match brand palette — no off-brand hues`,
    `No text, logos, or watermarks rendered inside the image`,
    brand.logoUrl ? `Reference brand has logo at ${brand.logoUrl} — style should feel cohesive` : "",
  ].filter(Boolean).join(". ");

  const copyVoiceRules = [
    `Voice: ${tone} (${toneDesc})`,
    `Formality ${brand.tone?.formality ?? 60}/100, energy ${brand.tone?.energy ?? 50}/100, warmth ${brand.tone?.warmth ?? 50}/100`,
    `Always sound like ${brand.name}, never generic marketing speak`,
    `Use keywords where natural: ${(brand.keywords || []).slice(0, 6).join(", ")}`,
  ].join(". ");

  return {
    brandName: brand.name,
    palette: { primary, secondary, accent, all: palette },
    tone: { primary: tone, description: toneDesc },
    imageStyleRules,
    copyVoiceRules,
    tagline: brand.tagline || "",
    industry: brand.industry || "",
    defaultAudience: brand.audience?.primary || "General audience",
  };
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const brand: BrandInput = body.brand;
    const platforms: string[] = body.platforms;
    const brief: CampaignBrief = body.brief || { purpose: body.goal || "" };

    if (!brand?.name) throw new Error("brand is required");
    if (!brief.purpose?.trim()) {
      throw new Error("Campaign purpose is required — describe what this campaign is for");
    }

    const selectedPlatforms = Array.isArray(platforms) && platforms.length
      ? platforms
      : ["instagram", "linkedin", "twitter", "facebook"];

    const designSystem = buildDesignSystemFromDna(brand);
    const campaignAudience = brief.audienceOverride?.trim() || designSystem.defaultAudience;

    const apiKey = await getSecret("OPENAI_API_KEY");
    const platformContext = selectedPlatforms
      .map((p) => `- ${p}: ${PLATFORM_RULES[p] || "Platform-appropriate copy"}`)
      .join("\n");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a world-class social media strategist.

CRITICAL RULE — TWO LAYERS:
1. DESIGN (LOCKED FROM BRAND DNA): Colors, visual style, tone of voice, and image aesthetics are FIXED from the brand's extracted DNA. You MUST NOT invent new brand colors, change voice, or drift from the design system.
2. MESSAGING (FROM USER BRIEF): Ad copy, captions, CTAs, campaign angles, and what the post is ABOUT come entirely from the user's campaign brief. The user defines purpose and message — you write copy that delivers it in the brand's locked voice.

Each concept needs ONE unique "imageScene" — a concise 2-3 sentence purely VISUAL description for AI image generation (subjects, setting, mood, composition). No text/logos in scene. Must reflect user campaign purpose AND brand colors visually.

Return JSON:
{
  "designSystem": { "primaryColor": "#hex", "tone": "...", "note": "Design locked from brand DNA" },
  "concepts": [
    {
      "name": "Campaign angle name tied to user purpose",
      "description": "1 sentence — how this angle serves the user's stated purpose",
      "imageScene": "Visual scene for hero image — 2-3 sentences, no text/logos, brand colors in environment",
      "assets": [
        {
          "platform": "instagram|linkedin|twitter|facebook",
          "caption": "post copy about USER purpose in brand voice",
          "hashtags": ["tag1","tag2"],
          "cta": "call to action aligned with user ctaIntent or purpose",
          "imagePrompt": "Full prompt reference combining design rules + imageScene"
        }
      ]
    }
  ]
}
Generate exactly 3 distinct creative angles with 3 DIFFERENT imageScene visuals, all serving the SAME user purpose but with different hooks.
Each concept must include one asset per requested platform.
Platform rules:\n${platformContext}`,
          },
          {
            role: "user",
            content: JSON.stringify({
              designSystem,
              userBrief: {
                purpose: brief.purpose.trim(),
                useCase: brief.useCase?.trim() || null,
                keyMessage: brief.keyMessage?.trim() || null,
                ctaIntent: brief.ctaIntent?.trim() || null,
                targetAudience: campaignAudience,
              },
              platforms: selectedPlatforms,
              brandContext: {
                name: brand.name,
                tagline: brand.tagline,
                industry: brand.industry,
                summary: brand.summary,
              },
            }),
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`OpenAI error: ${err}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty AI response");

    const parsed = JSON.parse(content);

    return new Response(JSON.stringify({
      ...parsed,
      designSystem: parsed.designSystem || {
        primaryColor: designSystem.palette.primary,
        tone: designSystem.tone.primary,
        note: "Design locked from extracted brand DNA",
      },
    }), {
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

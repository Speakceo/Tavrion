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
    const { brand, goal, platforms } = await req.json();
    if (!brand || !goal) throw new Error("brand and goal are required");

    const selectedPlatforms: string[] = Array.isArray(platforms) && platforms.length
      ? platforms
      : ["instagram", "linkedin", "twitter", "facebook"];

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
            content: `You are a world-class social media strategist. Generate on-brand campaign content.
Return JSON:
{
  "concepts": [
    {
      "name": "Campaign concept name",
      "description": "1 sentence theme",
      "assets": [
        {
          "platform": "instagram|linkedin|twitter|facebook",
          "caption": "post copy",
          "hashtags": ["tag1","tag2"],
          "cta": "call to action",
          "imagePrompt": "detailed image generation prompt using brand colors, no text in image"
        }
      ]
    }
  ]
}
Generate exactly 3 concepts. Each concept must include one asset per requested platform.
Platform rules:\n${platformContext}`,
          },
          {
            role: "user",
            content: JSON.stringify({
              goal,
              platforms: selectedPlatforms,
              brand: {
                name: brand.name,
                tagline: brand.tagline,
                industry: brand.industry,
                tone: brand.tone,
                audience: brand.audience,
                keywords: brand.keywords,
                colors: brand.colorPalette || brand.detectedColors,
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

    return new Response(JSON.stringify(parsed), {
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

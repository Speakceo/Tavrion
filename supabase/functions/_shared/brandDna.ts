export type BrandDna = {
  name: string;
  tagline?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string | null;
  favicon?: string | null;
  colorPalette?: { hex: string; usage?: string }[];
  industry?: string;
  tone?: string;
  summary?: string;
};

function pickColor(palette: { hex: string; usage?: string }[], usage: string, fallback: string): string {
  return palette.find((c) => c.usage === usage)?.hex || fallback;
}

/** Fetch brand DNA via dna-studio-analyze (colors, logo, tone). */
export async function fetchBrandDna(sourceUrl: string): Promise<BrandDna | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return null;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/dna-studio-analyze`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ url: sourceUrl }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;

    const palette = data.colorPalette || data.detectedColors?.map((hex: string, i: number) => ({
      hex,
      usage: i === 0 ? "primary" : i === 1 ? "secondary" : "accent",
    })) || [];

    const primary = pickColor(palette, "primary", palette[0]?.hex || "#6366f1");
    const secondary = pickColor(palette, "secondary", palette[1]?.hex || "#1e293b");
    const accent = pickColor(palette, "accent", palette[2]?.hex || primary);

    return {
      name: data.brand?.name || data.title || "Assistant",
      tagline: data.brand?.tagline || data.description?.slice(0, 120),
      primaryColor: primary,
      secondaryColor: secondary,
      accentColor: accent,
      logoUrl: data.logoUrl || data.favicon || null,
      favicon: data.favicon || null,
      colorPalette: palette,
      industry: data.brand?.industry,
      tone: data.brand?.tone?.primary,
      summary: data.summary,
    };
  } catch {
    return null;
  }
}

export function brandDnaToBotFields(dna: BrandDna | null, fallbackName: string) {
  if (!dna) {
    return {
      bot_name: fallbackName,
      primary_color: "#6366f1",
      secondary_color: "#1e293b",
      accent_color: "#3b82f6",
      logo_url: null,
      brand_dna: {},
      welcome_message: `Hi! I'm the ${fallbackName} assistant. Ask me anything about our site.`,
    };
  }
  return {
    bot_name: dna.name || fallbackName,
    primary_color: dna.primaryColor,
    secondary_color: dna.secondaryColor,
    accent_color: dna.accentColor,
    logo_url: dna.logoUrl,
    brand_dna: dna,
    welcome_message: dna.tagline
      ? `Hi! I'm ${dna.name}. ${dna.tagline} — ask me anything!`
      : `Hi! I'm the ${dna.name} assistant. Ask me anything about our site.`,
  };
}

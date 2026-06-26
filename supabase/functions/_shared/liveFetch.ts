const LIVE_QUERY_RE = /\b(price|pricing|cost|fee|fees|plan|plans|subscription|subscribe|how much|current|latest|today|now|live|updated|rate|rates|tier|tiers|package|packages|quote|billing|per month|\/mo|annual)\b/i;

const PRICING_URL_RE = /pricing|price|plans?|subscribe|billing|cost/i;

export function needsLiveFetch(message: string): boolean {
  return LIVE_QUERY_RE.test(message);
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

export async function fetchLivePageContent(url: string): Promise<{ url: string; title: string; content: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TavrionBot-LiveFetch/1.0 (+https://jointavrion.com)" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    const title = extractMeta(html, "og:title")
      || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim()
      || url;
    const description = extractMeta(html, "og:description") || extractMeta(html, "description");
    const body = stripHtmlToText(html).slice(0, 8000);
    const content = [title, description, body].filter(Boolean).join("\n\n");
    if (content.length < 40) return null;
    return { url: res.url || url, title, content };
  } catch {
    return null;
  }
}

export function rankUrlsForLiveFetch(
  message: string,
  chunkUrls: { url: string; title?: string }[],
  sourceUrl: string,
): string[] {
  const seen = new Set<string>();
  const ranked: { url: string; score: number }[] = [];

  const add = (url: string, score: number) => {
    if (!url || seen.has(url)) return;
    try {
      const u = new URL(url);
      if (!["http:", "https:"].includes(u.protocol)) return;
      seen.add(url);
      ranked.push({ url, score });
    } catch { /* skip */ }
  };

  add(sourceUrl, 1);

  for (const c of chunkUrls) {
    let score = 2;
    if (PRICING_URL_RE.test(c.url)) score += 10;
    if (PRICING_URL_RE.test(c.title || "")) score += 5;
    if (needsLiveFetch(message) && PRICING_URL_RE.test(`${c.url} ${c.title}`)) score += 8;
    add(c.url, score);
  }

  if (needsLiveFetch(message)) {
    try {
      const base = new URL(sourceUrl);
      for (const path of ["/pricing", "/plans", "/price", "/subscribe", "/billing"]) {
        add(`${base.origin}${path}`, 12);
      }
    } catch { /* skip */ }
  }

  return ranked.sort((a, b) => b.score - a.score).slice(0, 3).map((r) => r.url);
}

export async function buildLiveContext(urls: string[]): Promise<{ text: string; sources: { url: string; title: string }[] }> {
  const results = await Promise.all(urls.map((u) => fetchLivePageContent(u)));
  const valid = results.filter((r): r is NonNullable<typeof r> => r !== null);
  if (!valid.length) return { text: "", sources: [] };

  const text = valid.map((p, i) =>
    `[LIVE ${i + 1}] ${p.title} (${p.url}) — fetched just now:\n${p.content}`
  ).join("\n\n");

  return {
    text,
    sources: valid.map((p) => ({ url: p.url, title: p.title })),
  };
}

export function extractUrlsFromText(text: string): string[] {
  const urls = new Set<string>();
  for (const m of text.matchAll(/https?:\/\/[^\s<>"')\]]+/gi)) {
    urls.add(m[0].replace(/[.,;:!?)]+$/, ""));
    if (urls.size >= 5) break;
  }
  return [...urls];
}

import { createClient } from "npm:@supabase/supabase-js@2";
import { brandDnaToBotFields, fetchBrandDna } from "./brandDna.ts";

export const MAX_PAGES = 75;
const MAX_DEPTH_QUEUE = 500;
const CHUNK_SIZE = 1200;
const CHUNK_OVERLAP = 150;
const CONTENT_MAX = 30000;

function ensureHttpUrl(input: string): URL {
  const parsed = new URL(input.startsWith("http") ? input : `https://${input}`);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only http/https URLs supported");
  return parsed;
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html: string): string {
  return html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";
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

function extractPageContent(html: string, url: string): { title: string; content: string } {
  const title = extractTitle(html) || url;
  const metaParts = [
    extractMeta(html, "description"),
    extractMeta(html, "og:description"),
    extractMeta(html, "twitter:description"),
    extractMeta(html, "og:title"),
  ].filter(Boolean);

  const bodyText = stripHtmlToText(html);
  const headings: string[] = [];
  for (const m of html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/gi)) {
    const t = m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (t) headings.push(t);
    if (headings.length >= 12) break;
  }

  return {
    title,
    content: [title, ...metaParts, ...headings, bodyText].filter(Boolean).join("\n\n").slice(0, CONTENT_MAX),
  };
}

function extractLinks(html: string, base: URL): string[] {
  const links = new Set<string>();
  for (const m of html.matchAll(/<a[^>]*href=["']([^"'#]+)["']/gi)) {
    try {
      const href = m[1].trim();
      if (!href || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
      const u = new URL(href, base);
      if (u.hostname !== base.hostname) continue;
      if (/\.(pdf|zip|png|jpg|jpeg|gif|svg|webp|mp4|mp3|css|js|woff2?)$/i.test(u.pathname)) continue;
      u.hash = "";
      links.add(u.toString());
    } catch { /* skip */ }
  }
  return [...links];
}

function chunkText(text: string): string[] {
  const chunks: string[] = [];
  if (text.length <= CHUNK_SIZE) return text.length > 40 ? [text] : [];
  let i = 0;
  while (i < text.length) {
    const slice = text.slice(i, i + CHUNK_SIZE).trim();
    if (slice.length > 40) chunks.push(slice);
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }
  return chunks;
}

async function fetchRaw(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "TavrionBot-Crawler/2.0 (+https://jointavrion.com)" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

async function fetchPage(url: string): Promise<string | null> {
  const raw = await fetchRaw(url);
  if (!raw) return null;
  const ct = raw.slice(0, 200).toLowerCase();
  if (raw.length < 50) return null;
  return raw;
}

async function discoverSitemapUrls(base: URL): Promise<string[]> {
  const found = new Set<string>();
  const sitemapPaths = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap-index.xml", "/wp-sitemap.xml"];

  for (const path of sitemapPaths) {
    const xml = await fetchRaw(`${base.origin}${path}`);
    if (!xml || !xml.includes("<loc")) continue;

    for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
      try {
        const u = new URL(m[1].trim());
        if (u.hostname === base.hostname && !/\.(pdf|zip|png|jpg|jpeg|gif|svg)$/i.test(u.pathname)) {
          u.hash = "";
          found.add(u.toString());
        }
      } catch { /* skip */ }
      if (found.size >= MAX_PAGES) break;
    }
    if (found.size > 0) break;
  }

  return [...found].slice(0, MAX_PAGES);
}

async function crawlSite(startUrl: string): Promise<{ url: string; title: string; content: string }[]> {
  const base = ensureHttpUrl(startUrl);
  const sitemapUrls = await discoverSitemapUrls(base);
  const queue = [...new Set([base.toString(), ...sitemapUrls])];
  const visited = new Set<string>();
  const pages: { url: string; title: string; content: string }[] = [];

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    const html = await fetchPage(url);
    if (!html) continue;

    const { title, content } = extractPageContent(html, url);
    if (content.length < 30) continue;

    pages.push({ url, title, content });

    if (pages.length < MAX_PAGES && visited.size < MAX_DEPTH_QUEUE) {
      for (const link of extractLinks(html, base)) {
        if (!visited.has(link) && !queue.includes(link)) queue.push(link);
      }
    }
  }

  return pages;
}

async function embedTexts(apiKey: string, texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: texts }),
  });
  if (!res.ok) throw new Error(`Embedding API error: ${res.status}`);
  const data = await res.json();
  return data.data.map((d: { embedding: number[] }) => d.embedding);
}

export async function prepareCrawl(
  supabase: ReturnType<typeof createClient>,
  body: { url?: string; name?: string; botId?: string },
): Promise<{ id: string; source_url: string; name: string }> {
  const { url, name, botId } = body;

  if (botId) {
    const { data, error } = await supabase.from("tavrion_bots").select("id, source_url, name").eq("id", botId).single();
    if (error || !data) throw new Error("Bot not found");
    await supabase.from("tavrion_bots").update({
      status: "crawling", crawl_error: null, max_pages: MAX_PAGES, crawl_depth: 3,
      updated_at: new Date().toISOString(),
    }).eq("id", botId);
    return data;
  }

  if (!url?.trim()) throw new Error("url is required");
  const parsed = ensureHttpUrl(url.trim());
  const botName = name?.trim() || parsed.hostname.replace(/^www\./, "");

  const { data, error } = await supabase.from("tavrion_bots").insert({
    name: botName,
    source_url: parsed.toString(),
    bot_name: botName,
    status: "crawling",
    max_pages: MAX_PAGES,
    crawl_depth: 3,
  }).select("id, source_url, name").single();

  if (error || !data) throw new Error(error?.message || "Failed to create bot");
  return data;
}

export async function executeCrawlJob(
  supabase: ReturnType<typeof createClient>,
  openaiKey: string,
  botId: string,
) {
  const { data: bot, error } = await supabase.from("tavrion_bots").select("id, source_url, name").eq("id", botId).single();
  if (error || !bot) throw new Error("Bot not found");

  await supabase.from("tavrion_bot_chunks").delete().eq("bot_id", bot.id);
  await supabase.from("tavrion_bot_pages").delete().eq("bot_id", bot.id);

  const [dna, pages] = await Promise.all([
    fetchBrandDna(bot.source_url),
    crawlSite(bot.source_url),
  ]);

  const theme = brandDnaToBotFields(dna, bot.name);

  if (pages.length === 0) {
    await supabase.from("tavrion_bots").update({
      status: "error",
      crawl_error: "No pages could be crawled from this URL. The site may block bots or require JavaScript rendering.",
      ...theme,
      updated_at: new Date().toISOString(),
    }).eq("id", bot.id);
    throw new Error("No pages could be crawled");
  }

  const allChunks: { bot_id: string; page_id: string; content: string; metadata: Record<string, string> }[] = [];
  let pageCount = 0;

  for (const page of pages) {
    const { data: pageRow } = await supabase.from("tavrion_bot_pages").insert({
      bot_id: bot.id,
      url: page.url,
      title: page.title,
      content: page.content,
      word_count: page.content.split(/\s+/).length,
    }).select("id").single();

    if (!pageRow) continue;
    pageCount++;

    for (const chunk of chunkText(page.content)) {
      allChunks.push({
        bot_id: bot.id,
        page_id: pageRow.id,
        content: chunk,
        metadata: { url: page.url, title: page.title },
      });
    }
  }

  let chunkCount = 0;
  for (let i = 0; i < allChunks.length; i += 25) {
    const batch = allChunks.slice(i, i + 25);
    const embeddings = await embedTexts(openaiKey, batch.map((c) => c.content));
    await supabase.from("tavrion_bot_chunks").insert(
      batch.map((c, j) => ({
        bot_id: c.bot_id,
        page_id: c.page_id,
        content: c.content,
        embedding: embeddings[j],
        metadata: c.metadata,
      })),
    );
    chunkCount += batch.length;
  }

  const { data: updatedBot } = await supabase.from("tavrion_bots").update({
    status: "ready",
    pages_crawled: pageCount,
    chunks_count: chunkCount,
    last_crawled_at: new Date().toISOString(),
    crawl_error: null,
    ...theme,
    updated_at: new Date().toISOString(),
  }).eq("id", bot.id).select("*").single();

  return {
    bot: updatedBot,
    brandDna: dna,
    pages: pages.map((p) => ({ url: p.url, title: p.title, words: p.content.split(/\s+/).length })),
    crawlEngine: "edge-fallback",
    ragEngine: "edge-fallback",
    pipeline: { maxPages: MAX_PAGES, chunks: chunkCount, sitemap: true, brandDna: !!dna },
  };
}

export async function runFallbackCrawl(
  supabase: ReturnType<typeof createClient>,
  openaiKey: string,
  body: { url?: string; name?: string; botId?: string; welcomeMessage?: string; primaryColor?: string },
) {
  const bot = await prepareCrawl(supabase, body);
  return executeCrawlJob(supabase, openaiKey, bot.id);
}

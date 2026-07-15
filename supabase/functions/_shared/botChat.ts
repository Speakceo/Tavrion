import { createClient } from "npm:@supabase/supabase-js@2";
import {
  buildLiveContext,
  extractUrlsFromText,
  needsLiveFetch,
  rankUrlsForLiveFetch,
} from "./liveFetch.ts";

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

async function embedQuery(apiKey: string, text: string): Promise<number[]> {
  if (!apiKey || /YOUR_|_HERE|placeholder|changeme/i.test(apiKey)) {
    throw new Error(
      "OPENAI_API_KEY is missing or still a placeholder in app_secrets. Set a valid OpenAI key.",
    );
  }
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const errBody = await res.json();
      detail = errBody?.error?.message ? `: ${errBody.error.message}` : "";
    } catch { /* ignore */ }
    if (res.status === 401) {
      throw new Error(`Embedding error: 401 — OpenAI rejected the API key in app_secrets${detail}`);
    }
    throw new Error(`Embedding error: ${res.status}${detail}`);
  }
  const data = await res.json();
  return data.data[0].embedding;
}

type ChunkRow = { id: string; content: string; embedding: number[]; metadata: { url?: string; title?: string } };

export type SourceLink = { url: string; title: string; live?: boolean };

export type ChatResult = {
  reply: string;
  sources: SourceLink[];
  liveFetched: boolean;
};

async function retrieveChunks(
  supabase: ReturnType<typeof createClient>,
  botId: string,
  queryEmbedding: number[],
  topK = 8,
): Promise<ChunkRow[]> {
  const { data } = await supabase
    .from("tavrion_bot_chunks")
    .select("id, content, embedding, metadata")
    .eq("bot_id", botId);

  if (!data?.length) return [];

  return data
    .filter((row) => Array.isArray(row.embedding) && row.embedding.length > 0)
    .map((row) => ({
      ...row,
      embedding: row.embedding as number[],
      score: cosineSimilarity(queryEmbedding, row.embedding as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

function dedupeSources(sources: SourceLink[]): SourceLink[] {
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.url)) return false;
    seen.add(s.url);
    return true;
  }).slice(0, 5);
}

export async function chatWithBot(
  supabase: ReturnType<typeof createClient>,
  openaiKey: string,
  bot: {
    id: string;
    name: string;
    source_url: string;
    bot_name?: string;
    welcome_message?: string;
  },
  message: string,
  sessionId: string,
  channel: "web" | "whatsapp" = "web",
): Promise<ChatResult> {
  const queryEmbedding = await embedQuery(openaiKey, message);
  const chunks = await retrieveChunks(supabase, bot.id, queryEmbedding);

  const chunkSources: SourceLink[] = chunks
    .filter((c) => c.metadata?.url)
    .map((c) => ({ url: c.metadata!.url!, title: c.metadata?.title || c.metadata!.url! }));

  let liveBlock = "";
  let liveSources: SourceLink[] = [];
  const liveFetched = needsLiveFetch(message);

  if (liveFetched) {
    const urls = rankUrlsForLiveFetch(message, chunkSources, bot.source_url);
    const live = await buildLiveContext(urls);
    liveBlock = live.text;
    liveSources = live.sources.map((s) => ({ ...s, live: true }));
  }

  const storedContext = chunks.length > 0
    ? chunks.map((c, i) => `[${i + 1}] ${c.metadata?.title || "Page"} (${c.metadata?.url || ""}):\n${c.content}`).join("\n\n")
    : "";

  const contextParts = [
    liveBlock ? `=== LIVE WEBSITE DATA (fetched just now — prefer for pricing/current info) ===\n${liveBlock}` : "",
    storedContext ? `=== KNOWLEDGE BASE (from crawl) ===\n${storedContext}` : "",
  ].filter(Boolean).join("\n\n");

  const context = contextParts || "No relevant content found.";

  const { data: history } = await supabase
    .from("tavrion_bot_messages")
    .select("role, content")
    .eq("bot_id", bot.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(8);

  const systemPrompt = `You are ${bot.bot_name || bot.name}, an AI assistant for the website ${bot.source_url}.
Answer using the provided website content. Be helpful, concise, and friendly.
${liveFetched ? "IMPORTANT: For pricing, plans, fees, or time-sensitive questions, prioritize LIVE WEBSITE DATA over the knowledge base — it was just fetched." : ""}
When referencing pages, include the full URL on its own line so users can click through.
If the answer is not in the context, say you don't have that information and suggest visiting ${bot.source_url}.
Never invent prices or facts not in the context.

WEBSITE CONTENT:
${context}`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...(history || []).map((h) => ({ role: h.role, content: h.content })),
    { role: "user", content: message },
  ];

  await supabase.from("tavrion_bot_messages").insert({
    bot_id: bot.id,
    session_id: sessionId,
    role: "user",
    content: message,
    channel,
  });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature: 0.2,
      max_tokens: 900,
    }),
  });

  if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
  const data = await res.json();
  const reply = data.choices[0].message.content as string;

  await supabase.from("tavrion_bot_messages").insert({
    bot_id: bot.id,
    session_id: sessionId,
    role: "assistant",
    content: reply,
    channel,
  });

  const replyUrls = extractUrlsFromText(reply).map((url) => ({
    url,
    title: new URL(url).hostname,
  }));

  const sources = dedupeSources([...liveSources, ...chunkSources, ...replyUrls]);

  return { reply, sources, liveFetched };
}

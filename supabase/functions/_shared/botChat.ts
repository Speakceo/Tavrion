import { createClient } from "npm:@supabase/supabase-js@2";

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
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text }),
  });
  if (!res.ok) throw new Error(`Embedding error: ${res.status}`);
  const data = await res.json();
  return data.data[0].embedding;
}

type ChunkRow = { id: string; content: string; embedding: number[]; metadata: { url?: string; title?: string } };

async function retrieveChunks(
  supabase: ReturnType<typeof createClient>,
  botId: string,
  queryEmbedding: number[],
  topK = 6,
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
): Promise<string> {
  const queryEmbedding = await embedQuery(openaiKey, message);
  const chunks = await retrieveChunks(supabase, bot.id, queryEmbedding);

  const context = chunks.length > 0
    ? chunks.map((c, i) => `[${i + 1}] ${c.metadata?.title || "Page"} (${c.metadata?.url || ""}):\n${c.content}`).join("\n\n")
    : "No relevant content found in the knowledge base.";

  const { data: history } = await supabase
    .from("tavrion_bot_messages")
    .select("role, content")
    .eq("bot_id", bot.id)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(8);

  const systemPrompt = `You are ${bot.bot_name || bot.name}, an AI assistant for the website ${bot.source_url}.
Answer questions ONLY using the provided website content. Be helpful, concise, and friendly.
If the answer is not in the context, say you don't have that information on the website and suggest visiting ${bot.source_url}.
Never make up facts. Cite page titles when helpful.

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
      temperature: 0.3,
      max_tokens: 800,
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

  return reply;
}

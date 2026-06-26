"""LangGraph RAG agent for Tavrion Bot.

Uses https://github.com/langchain-ai/langgraph for stateful retrieve-then-answer flow.
"""

from __future__ import annotations

import math
from typing import Annotated, TypedDict

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langgraph.graph import END, StateGraph
from langgraph.graph.message import add_messages


class BotState(TypedDict):
    messages: Annotated[list[BaseMessage], add_messages]
    bot_id: str
    bot_name: str
    source_url: str
    question: str
    context: str
    chunks: list[dict]
    answer: str


def cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


def retrieve_chunks(
    chunks: list[dict],
    query_embedding: list[float],
    top_k: int = 6,
) -> list[dict]:
    scored = []
    for chunk in chunks:
        emb = chunk.get("embedding")
        if not emb or not isinstance(emb, list):
            continue
        scored.append({**chunk, "score": cosine_similarity(query_embedding, emb)})
    scored.sort(key=lambda x: x["score"], reverse=True)
    return scored[:top_k]


def build_rag_graph(openai_key: str):
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=openai_key)
    llm = ChatOpenAI(model="gpt-4o-mini", temperature=0.3, api_key=openai_key)

    def retrieve_node(state: BotState) -> dict:
        if state.get("context"):
            return {}
        query_vec = embeddings.embed_query(state["question"])
        top = retrieve_chunks(state["chunks"], query_vec)
        if top:
            context = "\n\n".join(
                f"[{i+1}] {c.get('metadata', {}).get('title', 'Page')} "
                f"({c.get('metadata', {}).get('url', '')}):\n{c['content']}"
                for i, c in enumerate(top)
            )
        else:
            context = "No relevant content found in the knowledge base."
        return {"context": context}

    def generate_node(state: BotState) -> dict:
        live_note = ""
        if "LIVE WEBSITE DATA" in state["context"]:
            live_note = (
                "IMPORTANT: For pricing, plans, fees, or time-sensitive questions, "
                "prioritize LIVE WEBSITE DATA over the knowledge base — it was just fetched. "
            )
        system = SystemMessage(content=f"""You are {state['bot_name']}, an AI assistant for {state['source_url']}.
Answer questions using the website content below. Be helpful, concise, and friendly.
{live_note}When referencing pages, include the full URL on its own line so users can click through.
If the answer is not in the context, say you don't have that information and suggest visiting {state['source_url']}.
Never invent prices or facts not in the context.

WEBSITE CONTENT:
{state['context']}""")

        history = [m for m in state["messages"] if isinstance(m, (HumanMessage, AIMessage))]
        response = llm.invoke([system, *history[-6:], HumanMessage(content=state["question"])])
        answer = response.content if isinstance(response.content, str) else str(response.content)
        return {
            "answer": answer,
            "messages": [HumanMessage(content=state["question"]), AIMessage(content=answer)],
        }

    graph = StateGraph(BotState)
    graph.add_node("retrieve", retrieve_node)
    graph.add_node("generate", generate_node)
    graph.set_entry_point("retrieve")
    graph.add_edge("retrieve", "generate")
    graph.add_edge("generate", END)

    return graph.compile()


async def run_rag_chat(
    openai_key: str,
    bot: dict,
    chunks: list[dict],
    question: str,
    history: list[dict] | None = None,
) -> dict:
    from live_fetch import (
        build_live_context,
        extract_urls_from_text,
        needs_live_fetch,
        rank_urls_for_live_fetch,
    )

    chunk_sources = [
        {"url": c.get("metadata", {}).get("url", ""), "title": c.get("metadata", {}).get("title", "")}
        for c in chunks
        if c.get("metadata", {}).get("url")
    ]

    live_fetched = needs_live_fetch(question)
    live_block = ""
    live_sources: list[dict] = []

    if live_fetched:
        urls = rank_urls_for_live_fetch(question, chunk_sources, bot["source_url"])
        live_block, live_sources = await build_live_context(urls)

    graph = build_rag_graph(openai_key)

    messages: list[BaseMessage] = []
    for item in history or []:
        if item.get("role") == "user":
            messages.append(HumanMessage(content=item["content"]))
        elif item.get("role") == "assistant":
            messages.append(AIMessage(content=item["content"]))

    # Pre-retrieve top chunks for context assembly
    embeddings = OpenAIEmbeddings(model="text-embedding-3-small", api_key=openai_key)
    query_vec = embeddings.embed_query(question)
    top = retrieve_chunks(chunks, query_vec, top_k=8)
    stored_context = "\n\n".join(
        f"[{i+1}] {c.get('metadata', {}).get('title', 'Page')} "
        f"({c.get('metadata', {}).get('url', '')}):\n{c['content']}"
        for i, c in enumerate(top)
    ) if top else ""

    context_parts = []
    if live_block:
        context_parts.append(
            f"=== LIVE WEBSITE DATA (fetched just now — prefer for pricing/current info) ===\n{live_block}"
        )
    if stored_context:
        context_parts.append(f"=== KNOWLEDGE BASE (from crawl) ===\n{stored_context}")
    full_context = "\n\n".join(context_parts) if context_parts else "No relevant content found."

    result = graph.invoke({
        "messages": messages,
        "bot_id": bot["id"],
        "bot_name": bot.get("bot_name") or bot.get("name", "Assistant"),
        "source_url": bot["source_url"],
        "question": question,
        "context": full_context,
        "chunks": chunks,
        "answer": "",
    })

    reply = result["answer"]
    reply_urls = [{"url": u, "title": __import__("urllib.parse").urlparse(u).netloc} for u in extract_urls_from_text(reply)]

    seen: set[str] = set()
    sources: list[dict] = []
    for s in [*live_sources, *chunk_sources, *reply_urls]:
        url = s.get("url", "")
        if not url or url in seen:
            continue
        seen.add(url)
        sources.append({"url": url, "title": s.get("title") or url, "live": s.get("live", False)})
        if len(sources) >= 5:
            break

    return {"reply": reply, "sources": sources, "liveFetched": live_fetched}

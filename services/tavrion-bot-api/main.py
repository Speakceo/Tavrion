"""Tavrion Bot API — Crawl4AI crawl + LangGraph RAG."""

from __future__ import annotations

import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from supabase import create_client

from crawler import chunk_pages, crawl_website, embed_chunks
from graph import run_rag_chat

load_dotenv()

app = FastAPI(title="Tavrion Bot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_supabase():
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return create_client(url, key)


def get_openai_key() -> str:
    key = os.environ.get("OPENAI_API_KEY")
    if not key:
        raise HTTPException(500, "OPENAI_API_KEY not configured")
    return key


class CrawlRequest(BaseModel):
    url: str | None = None
    name: str | None = None
    botId: str | None = None
    welcomeMessage: str | None = None
    primaryColor: str | None = None


class ChatRequest(BaseModel):
    embedKey: str | None = None
    botId: str | None = None
    message: str | None = None
    sessionId: str | None = None
    action: str | None = None


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "engines": {"crawl": "crawl4ai", "rag": "langgraph"},
    }


@app.post("/crawl")
async def crawl(req: CrawlRequest):
    sb = get_supabase()
    openai_key = get_openai_key()

    if req.botId:
        bot_res = sb.table("tavrion_bots").select("id, source_url, name").eq("id", req.botId).single().execute()
        if not bot_res.data:
            raise HTTPException(404, "Bot not found")
        bot = bot_res.data
        sb.table("tavrion_bots").update({
            "status": "crawling",
            "crawl_error": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", bot["id"]).execute()
    else:
        if not req.url:
            raise HTTPException(400, "url is required")
        source = req.url if req.url.startswith("http") else f"https://{req.url}"
        from urllib.parse import urlparse
        hostname = urlparse(source).hostname or "Bot"
        bot_name = req.name or hostname.replace("www.", "")

        insert = sb.table("tavrion_bots").insert({
            "name": bot_name,
            "source_url": source,
            "bot_name": bot_name,
            "welcome_message": req.welcomeMessage or f"Hi! I'm the {bot_name} assistant. Ask me anything about our site.",
            "primary_color": req.primaryColor or "#6366f1",
            "status": "crawling",
        }).execute()
        if not insert.data:
            raise HTTPException(500, "Failed to create bot")
        bot = insert.data[0]

    bot_id = bot["id"]
    sb.table("tavrion_bot_chunks").delete().eq("bot_id", bot_id).execute()
    sb.table("tavrion_bot_pages").delete().eq("bot_id", bot_id).execute()

    try:
        pages = await crawl_website(bot["source_url"], max_pages=20)
        if not pages:
            sb.table("tavrion_bots").update({
                "status": "error",
                "crawl_error": "Crawl4AI could not extract content from this URL",
                "updated_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", bot_id).execute()
            raise HTTPException(400, "No pages could be crawled")

        chunks = chunk_pages(pages)
        if not chunks:
            raise HTTPException(400, "No content chunks generated")

        page_count = 0
        chunk_count = 0

        for page in pages:
            page_row = sb.table("tavrion_bot_pages").insert({
                "bot_id": bot_id,
                "url": page.url,
                "title": page.title,
                "content": page.content,
                "word_count": len(page.content.split()),
            }).execute()
            if not page_row.data:
                continue
            page_count += 1
            page_id = page_row.data[0]["id"]

            page_chunks = [c for c in chunks if c["metadata"]["url"] == page.url]
            if not page_chunks:
                page_chunks = [{"content": page.content[:900], "metadata": {"url": page.url, "title": page.title}}]

            texts = [c["content"] for c in page_chunks]
            embeddings = await embed_chunks(openai_key, texts)

            rows = [{
                "bot_id": bot_id,
                "page_id": page_id,
                "content": c["content"],
                "embedding": embeddings[i],
                "metadata": c["metadata"],
            } for i, c in enumerate(page_chunks)]

            sb.table("tavrion_bot_chunks").insert(rows).execute()
            chunk_count += len(rows)

        updated = sb.table("tavrion_bots").update({
            "status": "ready",
            "pages_crawled": page_count,
            "chunks_count": chunk_count,
            "last_crawled_at": datetime.now(timezone.utc).isoformat(),
            "crawl_error": None,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", bot_id).select("*").execute()

        return {
            "bot": updated.data[0] if updated.data else bot,
            "pages": [{"url": p.url, "title": p.title, "words": len(p.content.split())} for p in pages],
            "crawlEngine": "crawl4ai",
            "ragEngine": "langgraph",
        }
    except HTTPException:
        raise
    except Exception as e:
        sb.table("tavrion_bots").update({
            "status": "error",
            "crawl_error": str(e),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", bot_id).execute()
        raise HTTPException(400, str(e)) from e


@app.post("/chat")
async def chat(req: ChatRequest):
    sb = get_supabase()
    openai_key = get_openai_key()

    query = sb.table("tavrion_bots").select("*")
    if req.embedKey:
        query = query.eq("embed_key", req.embedKey)
    elif req.botId:
        query = query.eq("id", req.botId)
    else:
        raise HTTPException(400, "embedKey or botId is required")

    bot_res = query.single().execute()
    if not bot_res.data:
        raise HTTPException(404, "Bot not found")
    bot = bot_res.data

    if req.action == "config":
        return {
            "bot": {
                "id": bot["id"],
                "name": bot.get("bot_name") or bot["name"],
                "welcomeMessage": bot.get("welcome_message"),
                "primaryColor": bot.get("primary_color"),
                "status": bot["status"],
                "sourceUrl": bot["source_url"],
            }
        }

    if not req.message:
        raise HTTPException(400, "message is required")
    if bot["status"] != "ready":
        raise HTTPException(400, "Bot is not ready yet. Please wait for crawling to finish.")

    session_id = req.sessionId or __import__("uuid").uuid4().hex

    chunks_res = sb.table("tavrion_bot_chunks").select("content, embedding, metadata").eq("bot_id", bot["id"]).execute()
    chunks = chunks_res.data or []

    history_res = (
        sb.table("tavrion_bot_messages")
        .select("role, content")
        .eq("bot_id", bot["id"])
        .eq("session_id", session_id)
        .order("created_at")
        .limit(8)
        .execute()
    )

    sb.table("tavrion_bot_messages").insert({
        "bot_id": bot["id"],
        "session_id": session_id,
        "role": "user",
        "content": req.message,
        "channel": "web",
    }).execute()

    reply = await run_rag_chat(
        openai_key,
        bot,
        chunks,
        req.message,
        history_res.data,
    )

    sb.table("tavrion_bot_messages").insert({
        "bot_id": bot["id"],
        "session_id": session_id,
        "role": "assistant",
        "content": reply,
        "channel": "web",
    }).execute()

    return {
        "reply": reply,
        "sessionId": session_id,
        "ragEngine": "langgraph",
        "bot": {
            "id": bot["id"],
            "name": bot.get("bot_name") or bot["name"],
            "welcomeMessage": bot.get("welcome_message"),
            "primaryColor": bot.get("primary_color"),
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", "8000")))

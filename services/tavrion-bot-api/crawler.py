"""Crawl4AI-powered website crawler for Tavrion Bot.

Uses https://github.com/unclecode/crawl4ai for LLM-ready markdown extraction.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig
from crawl4ai.deep_crawling import BFSDeepCrawlStrategy


@dataclass
class CrawledPage:
    url: str
    title: str
    content: str


async def crawl_website(start_url: str, max_pages: int = 20) -> list[CrawledPage]:
    """Multi-page BFS crawl via Crawl4AI deep crawling."""
    if not start_url.startswith("http"):
        start_url = f"https://{start_url}"

    browser_config = BrowserConfig(headless=True, verbose=False)
    run_config = CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        word_count_threshold=10,
        deep_crawl_strategy=BFSDeepCrawlStrategy(
            max_depth=2,
            include_external=False,
            max_pages=max_pages,
        ),
        verbose=False,
    )

    pages: list[CrawledPage] = []
    seen: set[str] = set()

    async with AsyncWebCrawler(config=browser_config) as crawler:
        results = await crawler.arun(start_url, config=run_config)

        if not isinstance(results, list):
            results = [results]

        for result in results:
            if not result.success:
                continue
            url = result.url or start_url
            if url in seen:
                continue
            seen.add(url)

            markdown = (result.markdown or "").strip()
            title = (result.metadata.get("title") if result.metadata else None) or url

            if len(markdown) < 30:
                cleaned = (result.cleaned_html or "").strip()
                if cleaned:
                    markdown = cleaned[:12000]
                else:
                    continue

            pages.append(CrawledPage(url=url, title=title, content=markdown[:12000]))

    if not pages:
        pages = await _single_page_fallback(start_url)

    return pages[:max_pages]


async def _single_page_fallback(url: str) -> list[CrawledPage]:
    """Fallback single-page crawl when deep crawl returns nothing."""
    browser_config = BrowserConfig(headless=True, verbose=False)
    run_config = CrawlerRunConfig(cache_mode=CacheMode.BYPASS, word_count_threshold=5)

    async with AsyncWebCrawler(config=browser_config) as crawler:
        result = await crawler.arun(url, config=run_config)
        if not result.success:
            return []

        markdown = (result.markdown or "").strip()
        title = (result.metadata.get("title") if result.metadata else None) or url
        if len(markdown) < 20:
            return []

        return [CrawledPage(url=url, title=title, content=markdown[:12000])]


def chunk_pages(pages: list[CrawledPage], chunk_size: int = 900, overlap: int = 120) -> list[dict]:
    from langchain_text_splitters import RecursiveCharacterTextSplitter

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
    )

    chunks: list[dict] = []
    for page in pages:
        for text in splitter.split_text(page.content):
            if len(text.strip()) < 40:
                continue
            chunks.append({
                "content": text.strip(),
                "metadata": {"url": page.url, "title": page.title},
            })
    return chunks


async def embed_chunks(openai_key: str, texts: list[str]) -> list[list[float]]:
    from openai import OpenAI

    client = OpenAI(api_key=openai_key)
    batch_size = 20
    all_embeddings: list[list[float]] = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        response = client.embeddings.create(model="text-embedding-3-small", input=batch)
        all_embeddings.extend([item.embedding for item in response.data])

    return all_embeddings

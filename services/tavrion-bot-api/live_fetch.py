"""Live page fetch for price/time-sensitive bot queries."""

from __future__ import annotations

import re
from urllib.parse import urljoin, urlparse

import httpx

LIVE_QUERY_RE = re.compile(
    r"\b(price|pricing|cost|fee|fees|plan|plans|subscription|subscribe|how much|"
    r"current|latest|today|now|live|updated|rate|rates|tier|tiers|package|packages|"
    r"quote|billing|per month|/mo|annual)\b",
    re.I,
)
PRICING_URL_RE = re.compile(r"pricing|price|plans?|subscribe|billing|cost", re.I)


def needs_live_fetch(message: str) -> bool:
    return bool(LIVE_QUERY_RE.search(message))


def _strip_html(html: str) -> str:
    html = re.sub(r"<script[\s\S]*?</script>", " ", html, flags=re.I)
    html = re.sub(r"<style[\s\S]*?</style>", " ", html, flags=re.I)
    html = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", html).strip()


def _extract_meta(html: str, name: str) -> str:
    escaped = re.escape(name)
    patterns = [
        rf'<meta[^>]*(?:name|property)=["\']{escaped}["\'][^>]*content=["\']([^"\']*)["\']',
        rf'<meta[^>]*content=["\']([^"\']*)["\'][^>]*(?:name|property)=["\']{escaped}["\']',
    ]
    for pat in patterns:
        m = re.search(pat, html, re.I)
        if m and m.group(1).strip():
            return m.group(1).strip()
    return ""


async def fetch_live_page_content(url: str) -> dict | None:
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            res = await client.get(url, headers={"User-Agent": "TavrionBot-LiveFetch/1.0"})
        if res.status_code >= 400:
            return None
        html = res.text
        title = (
            _extract_meta(html, "og:title")
            or (re.search(r"<title[^>]*>([\s\S]*?)</title>", html, re.I) or [None, ""])[1]
        )
        title = re.sub(r"<[^>]+>", "", title or "").strip() or url
        description = _extract_meta(html, "og:description") or _extract_meta(html, "description")
        body = _strip_html(html)[:8000]
        content = "\n\n".join(p for p in [title, description, body] if p)
        if len(content) < 40:
            return None
        return {"url": str(res.url), "title": title, "content": content}
    except Exception:
        return None


def rank_urls_for_live_fetch(
    message: str,
    chunk_urls: list[dict],
    source_url: str,
) -> list[str]:
    seen: set[str] = set()
    ranked: list[tuple[str, int]] = []

    def add(url: str, score: int) -> None:
        if not url or url in seen:
            return
        try:
            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https"):
                return
            seen.add(url)
            ranked.append((url, score))
        except Exception:
            pass

    add(source_url, 1)
    for c in chunk_urls:
        url = c.get("url", "")
        title = c.get("title", "")
        score = 2
        if PRICING_URL_RE.search(url):
            score += 10
        if PRICING_URL_RE.search(title):
            score += 5
        if needs_live_fetch(message) and PRICING_URL_RE.search(f"{url} {title}"):
            score += 8
        add(url, score)

    if needs_live_fetch(message):
        try:
            base = urlparse(source_url)
            for path in ("/pricing", "/plans", "/price", "/subscribe", "/billing"):
                add(f"{base.scheme}://{base.netloc}{path}", 12)
        except Exception:
            pass

    ranked.sort(key=lambda x: x[1], reverse=True)
    return [u for u, _ in ranked[:3]]


async def build_live_context(urls: list[str]) -> tuple[str, list[dict]]:
    import asyncio

    results = await asyncio.gather(*(fetch_live_page_content(u) for u in urls))
    valid = [r for r in results if r]
    if not valid:
        return "", []

    text = "\n\n".join(
        f"[LIVE {i + 1}] {p['title']} ({p['url']}) — fetched just now:\n{p['content']}"
        for i, p in enumerate(valid)
    )
    sources = [{"url": p["url"], "title": p["title"], "live": True} for p in valid]
    return text, sources


def extract_urls_from_text(text: str) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    for m in re.finditer(r"https?://[^\s<>\"')\]]+", text, re.I):
        u = m.group(0).rstrip(".,;:!?)")
        if u not in seen:
            seen.add(u)
            urls.append(u)
        if len(urls) >= 5:
            break
    return urls

"""Fetch brand DNA from dna-studio-analyze edge function."""

from __future__ import annotations

import os
import httpx


async def fetch_brand_dna(source_url: str) -> dict | None:
    supabase_url = os.environ.get("SUPABASE_URL")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
    if not supabase_url or not service_key:
        return None

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(
                f"{supabase_url}/functions/v1/dna-studio-analyze",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {service_key}",
                },
                json={"url": source_url},
            )
        if res.status_code != 200:
            return None
        data = res.json()
        if data.get("error"):
            return None

        palette = data.get("colorPalette") or []
        primary = next((c["hex"] for c in palette if c.get("usage") == "primary"), palette[0]["hex"] if palette else "#6366f1")
        secondary = next((c["hex"] for c in palette if c.get("usage") == "secondary"), palette[1]["hex"] if len(palette) > 1 else "#1e293b")
        accent = next((c["hex"] for c in palette if c.get("usage") == "accent"), palette[2]["hex"] if len(palette) > 2 else primary)

        brand = data.get("brand") or {}
        return {
            "name": brand.get("name") or data.get("title") or "Assistant",
            "tagline": brand.get("tagline") or (data.get("description") or "")[:120],
            "primaryColor": primary,
            "secondaryColor": secondary,
            "accentColor": accent,
            "logoUrl": data.get("logoUrl") or data.get("favicon"),
            "colorPalette": palette,
            "industry": brand.get("industry"),
            "tone": (brand.get("tone") or {}).get("primary"),
            "summary": data.get("summary"),
        }
    except Exception:
        return None


def dna_to_bot_fields(dna: dict | None, fallback_name: str) -> dict:
    if not dna:
        return {
            "bot_name": fallback_name,
            "primary_color": "#6366f1",
            "secondary_color": "#1e293b",
            "accent_color": "#3b82f6",
            "logo_url": None,
            "brand_dna": {},
            "welcome_message": f"Hi! I'm the {fallback_name} assistant. Ask me anything about our site.",
        }
    name = dna.get("name") or fallback_name
    tagline = dna.get("tagline")
    welcome = f"Hi! I'm {name}. {tagline} — ask me anything!" if tagline else f"Hi! I'm the {name} assistant. Ask me anything about our site."
    return {
        "bot_name": name,
        "primary_color": dna["primaryColor"],
        "secondary_color": dna["secondaryColor"],
        "accent_color": dna["accentColor"],
        "logo_url": dna.get("logoUrl"),
        "brand_dna": dna,
        "welcome_message": welcome,
    }

#!/usr/bin/env python3
"""Generate Clippy icons via Gemini Nano Banana 2 Lite (gemini-3.1-flash-lite-image)."""
from __future__ import annotations

import base64
import json
import os
import pathlib
import sys
import urllib.error
import urllib.request

MODEL = "gemini-3.1-flash-lite-image"

APP_PROMPT = """Design a premium 2026 macOS app icon for "Clippy" — a clipboard manager with personality.

Concept (human-form tech clipboard, Clippy vibe):
- An anthropomorphic tech clipboard character: friendly, slightly cheeky assistant energy (nod to classic Clippy) but fully modern 2026 — NOT Microsoft Clippy, NOT a paperclip face, NO eyes on a paperclip
- Form: sleek clipboard body as a character silhouette — rounded board, soft metallic/glass clip as a "head" accent, subtle paper sheet like a torso/face plane, optional tiny limbs or posture that reads as helpful assistant without being cartoon-mascot clutter
- Feel: human-adjacent tech companion — warm, approachable, smart productivity tool; like a future OS utility icon with soul

Style:
- Square macOS Big Sur+ app icon, soft rounded-square composition, centered, generous padding
- Soft 3D / refined product render, premium glass + matte materials, subtle depth
- Palette: deep charcoal/slate clipboard, warm cream paper, single vivid teal/cyan accent spark or check (paste energy). Cool slate-to-teal mist gradient background
- High contrast silhouette readable at 16–32px
- NO text, NO letters, NO watermark, NO Microsoft branding, NO literal googly-eyed paperclip

Output one polished square icon."""

TRAY_PROMPT = """Design a macOS menu-bar tray template icon for "Clippy", a clipboard manager.

Requirements:
- Pure black silhouette (#000000) on fully transparent background
- Anthropomorphic clipboard silhouette: board + top clip, simple friendly character posture readable as Clippy-vibe helper (NOT a paperclip with eyes)
- Thick strokes, solid black only — no gray, no color, no soft glow
- Extremely readable at 16–22px in the macOS menu bar
- Square canvas, centered, generous padding
- NO text, NO letters, NO shadows

This will be used as Electron trayTemplate.png (template image)."""


def load_key() -> str:
    for name in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"):
        val = os.environ.get(name)
        if val:
            return val
    for path in (
        pathlib.Path.home() / ".cli-secrets.env",
        pathlib.Path.home() / ".gemini" / ".env",
    ):
        if not path.exists():
            continue
        for line in path.read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            k = k.strip()
            v = v.strip().strip('"').strip("'")
            if k in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY") and v:
                return v
    raise SystemExit("No Gemini API key found")


def generate(prompt: str, out_path: pathlib.Path) -> None:
    api_key = load_key()
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}"
        f":generateContent?key={api_key}"
    )
    body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["TEXT", "IMAGE"],
            "imageConfig": {"aspectRatio": "1:1"},
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as e:
        err = e.read().decode("utf-8", errors="replace")
        raise SystemExit(f"HTTP {e.code}: {err[:2000]}") from e

    saved = False
    for cand in data.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            if "text" in part:
                print("TEXT:", part["text"][:400])
            inline = part.get("inlineData") or part.get("inline_data")
            if not inline or not inline.get("data"):
                continue
            raw = base64.b64decode(inline["data"])
            out_path.parent.mkdir(parents=True, exist_ok=True)
            out_path.write_bytes(raw)
            mime = inline.get("mimeType") or inline.get("mime_type") or "image/png"
            print(f"SAVED {out_path} ({len(raw)} bytes, {mime})")
            saved = True
    if not saved:
        print(json.dumps(data)[:3000], file=sys.stderr)
        raise SystemExit("No image in response")


def main() -> None:
    root = pathlib.Path(__file__).resolve().parents[1]
    generate(APP_PROMPT, root / "img" / "clippy-icon-nano.png")
    generate(TRAY_PROMPT, root / "img" / "clippy-tray-nano.png")


if __name__ == "__main__":
    main()

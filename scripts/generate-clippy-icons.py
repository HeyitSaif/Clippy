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

APP_PROMPT = """Premium 2026 macOS app icon for Clippy clipboard manager.

Subject: anthropomorphic tech clipboard character with Clippy personality — dark charcoal clipboard body, silver metal clip on top, cream paper face with tiny friendly smile/eyes (cute but modern, not childish), glowing cyan checkmark on the paper, small subtle arms in a helpful pose.

CRITICAL composition rules:
- The ENTIRE canvas IS the app icon. Full-bleed rounded-square icon.
- Soft cool slate-to-teal mist gradient INSIDE the icon only.
- NO photo backgrounds, NO desk, NO landscape, NO floating icon on a scene, NO outer margin with scenery.
- Soft 3D product render, premium materials, readable at small sizes.
- NO text, NO watermark, NO Microsoft paperclip mascot."""

TRAY_PROMPT = """macOS menu bar tray template icon.

Draw a SIMPLE black silhouette of a friendly clipboard character (board + top clip + tiny arms optional) centered on a PURE FLAT WHITE (#FFFFFF) background.

Rules:
- Solid pure black (#000000) shapes only
- Flat white background (NO checkerboard, NO transparency pattern, NO gray)
- Thick strokes, readable at 16px
- Square, centered, padding
- NO color, NO gradients, NO text"""


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

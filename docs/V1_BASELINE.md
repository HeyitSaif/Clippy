# Clippy v1 Baseline (Archive)

This document records v1 behavior for migration and reference. v1 source lives in [`legacy/v1/`](../legacy/v1/).

## Data paths

Electron `userData` / `electron-store` paths depend on the host OS. v1 used the product name **`electron-clippy`**.

| Resource | macOS | Windows | Linux |
|----------|-------|---------|-------|
| v1 electron-store config | `~/Library/Application Support/electron-clippy/config.json` | `%APPDATA%\electron-clippy\config.json` | `~/.config/electron-clippy/config.json` |
| Store key | `Items Main` (array of clip objects) | same | same |
| v2 SQLite DB | `~/Library/Application Support/clippy/clippy.db` | `%APPDATA%\clippy\clippy.db` | `~/.config/clippy/clippy.db` |
| v2 image files | `…/clippy/images/` | `…\clippy\images\` | `…/clippy/images/` |
| v2 thumbnails | `…/clippy/thumbs/` | `…\clippy\thumbs\` | `…/clippy/thumbs/` |

v2 imports v1 data once on first launch if the legacy config file exists (`importLegacyV1` in `src/main/db/database.ts`).

## macOS data paths (legacy table)

| Resource | Path |
|----------|------|
| electron-store config | `~/Library/Application Support/electron-clippy/config.json` |
| Store key | `Items Main` (array of clip objects) |
| v2 SQLite DB | `~/Library/Application Support/clippy/clippy.db` |
| v2 image files | `~/Library/Application Support/clippy/images/` |

## v1 clip object shapes

**Text clip**
```json
{
  "type": "text",
  "text": "...",
  "html": "...",
  "rtf": "...",
  "hash": "sha256 hex",
  "timestamp": 1234567890
}
```

**Image clip**
```json
{
  "type": "image",
  "width": 800,
  "height": 600,
  "buffer": "data:image/png;base64,...",
  "thumbBuffer": "data:image/png;base64,...",
  "thumbWidth": 70,
  "thumbHeight": 52,
  "hash": "sha256 hex of thumbBuffer",
  "timestamp": 1234567890
}
```

## v1 behavior summary

- Polls clipboard every 500ms
- Global shortcuts: `Alt+Space` toggle; paste slots (v1 used `Cmd/Ctrl+1..5`; v2 uses platform-specific slot shortcuts — see [PLATFORMS.md](PLATFORMS.md))
- Tray: auto-paste toggle, clear history, don't-hide-on-blur, exit
- Auto-paste on macOS via AppleScript Cmd+V
- History cap intended at ~1000 items (buggy slice in `saveitems()`)
- Renderer used `nodeIntegration: true` and shared DataStore singleton

## Known v1 bugs (do not replicate)

1. `saveitems()` slice drops newest item
2. `addElement()` mutates stored text when truncating for display
3. Tray checkbox states never update after click
4. `ready` IPC event sent but never handled in renderer

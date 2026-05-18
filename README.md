# Clippy v2

A modern macOS-first clipboard manager built with Electron, React, and SQLite.

## Features

- Clipboard history for text, images, and file paths
- Command-palette-style floating panel with search and keyboard navigation
- Global shortcuts: `Alt+Space` toggle, `Cmd+1`–`9` quick paste slots
- Pin clips, snippets, tags, regex search (`/pattern/`), filter modes (`type:image`, `pinned:true`)
- Rich preview panel, export/import history
- Secure architecture: `contextIsolation`, preload IPC bridge, main-process clipboard access
- SQLite + file-backed image storage (fast startup, no JSON bloat)
- One-time migration from v1 `electron-store` data
- Todo tab placeholder for future features

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run dist        # macOS dmg + zip
npm run dist:dir    # unpacked app for testing
```

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt+Space` | Show/hide panel |
| `Cmd+1`–`9` | Paste Nth recent clip |
| `↑` / `↓` | Navigate list |
| `Enter` | Paste selected clip |
| `Esc` | Hide panel |
| `Cmd+F` | Focus search |
| `Cmd+P` | Preview selected clip |

## v1 archive

Legacy v1 source is in [`legacy/v1/`](legacy/v1/). Migration notes in [`docs/V1_BASELINE.md`](docs/V1_BASELINE.md).

## macOS permissions

Auto-paste requires **Accessibility** permission for Clippy in System Settings → Privacy & Security → Accessibility.

## License

GPL-3.0-or-later

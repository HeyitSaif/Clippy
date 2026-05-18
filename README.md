# Clippy v2

A modern cross-platform clipboard manager for **macOS**, **Windows**, and **Linux**. Built with Electron, React, and SQLite.

Clippy runs in the system tray, captures clipboard history (text, images, file paths), and lets you search, pin, tag, and paste items back into any app — with global shortcuts and focus restoration.

## Features

- Clipboard history for text, images, and file paths
- Command-palette-style floating panel with search and keyboard navigation
- Global shortcuts: toggle panel, quick paste slots 1–9
- Pin clips, snippets, tags, regex search (`/pattern/`), filter modes (`type:image`, `pinned:true`)
- Rich preview panel, export/import history
- Auto-paste into the app you were using before opening Clippy
- Secure architecture: `contextIsolation`, preload IPC bridge, main-process clipboard access
- SQLite + file-backed image storage (fast startup, no JSON bloat)
- One-time migration from v1 `electron-store` data
- System tray with auto-paste toggle, clear history, launch at login

## Supported platforms

| Platform | Status | Auto-paste | Paste slots |
|----------|--------|------------|-------------|
| macOS 12+ | Full | AppleScript (Accessibility required) | ⌘⌃1–9 |
| Windows 10+ | Full | PowerShell SendKeys | Ctrl+Alt+1–9 |
| Linux (X11) | Full* | `xdotool` required | Ctrl+Alt+1–9 |

\*On Linux, install [`xdotool`](https://github.com/jordansissel/xdotool). Wayland-only sessions may need XWayland or an X11 session for global paste simulation. See [docs/PLATFORMS.md](docs/PLATFORMS.md).

## Development

```bash
npm install
npm run dev
```

Typecheck and build:

```bash
npm run typecheck
npm run build
```

## Build installers

Build on the target OS (or use CI) — `better-sqlite3` is a native module.

| Command | Output |
|---------|--------|
| `npm run dist:mac` | macOS `.dmg` + `.zip` |
| `npm run dist:dir` | Unpacked macOS `.app` (testing) |
| `npm run dist:win` | Windows NSIS installer + portable |
| `npm run dist:dir:win` | Unpacked Windows build |
| `npm run dist:linux` | AppImage + `.deb` |
| `npm run dist:dir:linux` | Unpacked Linux build |

Unsigned macOS build (local testing):

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:dir
```

Artifacts are written to `release/`.

## Keyboard shortcuts

### Panel (in-app)

| Shortcut | Action |
|----------|--------|
| `↑` / `↓` | Navigate list |
| `Enter` / click row | Paste selected clip |
| `Esc` | Hide panel |
| `Cmd+F` / `Ctrl+F` | Focus search |
| `Cmd+P` / `Ctrl+P` | Preview selected clip |
| `Cmd+K` / `Ctrl+K` | Focus search (footer hint) |

### Global

| Shortcut | macOS | Windows / Linux | Action |
|----------|-------|-----------------|--------|
| Toggle panel | `Alt+Space` (default, configurable) | same | Show/hide Clippy |
| Paste slot N | `⌘⌃1`–`⌘⌃9` | `Ctrl+Alt+1`–`9` | Paste Nth recent clip |

Paste slots always auto-paste, even when the in-app **Auto paste** toggle is off.

On macOS, slots use **Command+Control** (not Command+Option) because global ⌘⌥+digit shortcuts are unreliable on recent macOS versions.

## Platform setup

### macOS

Auto-paste and focus restoration require **Accessibility** permission:

**System Settings → Privacy & Security → Accessibility → enable Clippy**

Clippy prompts on first launch if permission is missing. You can also open settings from **Settings → Accessibility → Open Settings**.

### Windows

No extra permission step. Auto-paste uses the standard Ctrl+V shortcut via PowerShell. Clippy stays in the system tray when the panel is closed.

### Linux

Install `xdotool`:

```bash
# Debian / Ubuntu
sudo apt install xdotool

# Fedora
sudo dnf install xdotool

# Arch
sudo pacman -S xdotool
```

Restart Clippy after installing. A setup banner appears in the app until `xdotool` is detected.

## Data locations

Clippy stores data under Electron `userData`:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/clippy/` |
| Windows | `%APPDATA%\clippy\` |
| Linux | `~/.config/clippy/` |

Contents:

- `clippy.db` — SQLite database (clips, tags, settings)
- `images/` — full-size image clips
- `thumbs/` — image thumbnails

Legacy v1 import reads from the old `electron-clippy` config path on each platform (see [docs/V1_BASELINE.md](docs/V1_BASELINE.md)).

## Documentation

- [docs/PLATFORMS.md](docs/PLATFORMS.md) — per-platform behavior, troubleshooting, Wayland notes
- [docs/V1_BASELINE.md](docs/V1_BASELINE.md) — v1 archive and migration reference
- [`legacy/v1/`](legacy/v1/) — v1 source code

## License

GPL-3.0-or-later

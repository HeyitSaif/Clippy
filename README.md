# Clippy

A local, cross-platform clipboard manager for **macOS**, **Windows**, and **Linux**.

Clippy lives in the system tray, captures clipboard history (text, images, file paths), and lets you search, pin, tag, preview, and paste back into the app you were using — with global shortcuts and focus restoration. Built with Electron, React, and SQLite.

## Features

- Clipboard history for text, images, and file paths
- Floating panel with search, filters, and full keyboard navigation
- Global toggle shortcut and quick-paste slots `1`–`9`
- Pins, snippets, tags, regex search (`/pattern/`), and filters (`type:image`, `pinned:true`)
- Preview panel, export/import, and a lightweight todo list with reminders
- Auto-paste into the previously focused app
- Local SQLite storage + file-backed images (no cloud)
- Secure Electron defaults: `contextIsolation`, preload IPC, main-process clipboard access
- Optional migration from Clippy v1 (`electron-store`)

## Platforms

| Platform    | Support | Auto-paste                           | Paste slots      |
| ----------- | ------- | ------------------------------------ | ---------------- |
| macOS 12+   | Full    | AppleScript (Accessibility required) | `⌘⌃1`–`9`        |
| Windows 10+ | Full    | PowerShell SendKeys                  | `Ctrl+Alt+1`–`9` |
| Linux (X11) | Full\*  | `xdotool` required                   | `Ctrl+Alt+1`–`9` |

\*On Linux, install [`xdotool`](https://github.com/jordansissel/xdotool). Pure Wayland may need XWayland/X11 for paste simulation. Details: [docs/PLATFORMS.md](docs/PLATFORMS.md).

### First-run setup

| Platform    | Requirement                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| **macOS**   | Enable Clippy under **System Settings → Privacy & Security → Accessibility** |
| **Windows** | No extra setup                                                               |
| **Linux**   | Install `xdotool`, then restart Clippy                                       |

## Quick start (development)

Requires Node.js 20+ and npm.

```bash
npm install
npm run dev
```

```bash
npm run typecheck   # typecheck
npm test            # unit tests
npm run build       # compile app (no installer)
```

## Build installers

Build on the target OS (or CI). `better-sqlite3` is a native module.

| Command              | Output                         |
| -------------------- | ------------------------------ |
| `npm run dist:mac`   | macOS `.dmg` + `.zip`          |
| `npm run dist:win`   | Windows NSIS + portable        |
| `npm run dist:linux` | AppImage + `.deb`              |
| `npm run dist:dir`   | Unpacked app (fast local test) |

Unsigned macOS package for local testing:

```bash
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:dir
```

Artifacts land in `release/`.

## Shortcuts

### In the panel

| Shortcut     | Action                |
| ------------ | --------------------- |
| `↑` / `↓`    | Navigate              |
| `Enter`      | Paste selected clip   |
| `Esc`        | Hide panel            |
| `Cmd/Ctrl+F` | Focus search          |
| `Cmd/Ctrl+P` | Preview selected clip |

### Global

| Action         | macOS                      | Windows / Linux  |
| -------------- | -------------------------- | ---------------- |
| Toggle panel   | `Alt+Space` (configurable) | same             |
| Paste slot `N` | `⌘⌃1`–`⌘⌃9`                | `Ctrl+Alt+1`–`9` |

Paste slots always auto-paste, even when the in-app **Auto paste** toggle is off.

On macOS, slots use **Command+Control** (not Command+Option) because global `⌘⌥`+digit shortcuts are unreliable on recent macOS versions.

## Data

Stored under Electron `userData`:

| Platform | Path                                    |
| -------- | --------------------------------------- |
| macOS    | `~/Library/Application Support/clippy/` |
| Windows  | `%APPDATA%\clippy\`                     |
| Linux    | `~/.config/clippy/`                     |

| File / folder | Purpose                                        |
| ------------- | ---------------------------------------------- |
| `clippy.db`   | SQLite database (clips, tags, settings, todos) |
| `images/`     | Full-size image clips                          |
| `thumbs/`     | Thumbnails                                     |

Logs: platform-specific Electron log directory for app name `clippy` (for example `~/Library/Logs/clippy/` on macOS).

## Documentation

| Doc                                        | Contents                                        |
| ------------------------------------------ | ----------------------------------------------- |
| [docs/PLATFORMS.md](docs/PLATFORMS.md)     | Per-OS behavior, troubleshooting, Wayland notes |
| [docs/V1_BASELINE.md](docs/V1_BASELINE.md) | v1 archive and migration reference              |
| [CONTRIBUTING.md](CONTRIBUTING.md)         | How to contribute                               |
| [`legacy/v1/`](legacy/v1/)                 | v1 source                                       |

## License

[GPL-3.0-or-later](LICENSE)

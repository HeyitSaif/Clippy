# Platform guide

Clippy v2 targets macOS, Windows, and Linux with shared UI and platform-specific input simulation for auto-paste and focus restoration.

## Architecture overview

```
User action (click row / hotkey / Enter)
        │
        ▼
PasteService.writeAndAutoPaste()
        │
        ├─ Write clip to system clipboard
        ├─ Hide Clippy window (optional)
        ├─ FocusService.activatePreviousApp()
        │     └─ system-input.ts (per OS)
        └─ simulatePasteShortcut()
              ├─ macOS: AppleScript ⌘V
              ├─ Windows: PowerShell SendKeys ^v
              └─ Linux: xdotool ctrl+v
```

Implementation: `src/main/platform/system-input.ts`, `src/main/services/paste-service.ts`, `src/main/services/focus-service.ts`.

## macOS

### Requirements

- macOS 12 or later recommended
- Accessibility permission for auto-paste and focus restore

### Global shortcuts

| Feature | Accelerator |
|---------|-------------|
| Toggle (default) | `Alt+Space` |
| Paste slots | `Command+Control+1` … `9` |

### Window behavior

- Vibrancy / translucent panel
- Closing the panel hides the app (`app.hide()`)
- App stays running in the menu bar / tray

### Build

```bash
npm run dist:mac
# or unsigned local test:
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:dir
```

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Auto-paste does nothing | Grant Accessibility in System Settings; restart Clippy |
| Paste slots not firing | Check for shortcut conflicts; review logs in `~/Library/Logs/clippy/` |
| Panel does not hide on blur | Toggle **Hide on blur** in Settings or tray menu |

## Windows

### Requirements

- Windows 10 or later
- PowerShell available (default on modern Windows)

### Global shortcuts

| Feature | Accelerator |
|---------|-------------|
| Toggle (default) | `Alt+Space` |
| Paste slots | `Control+Alt+1` … `9` |

### Auto-paste

Uses `[System.Windows.Forms.SendKeys]::SendWait("^v")` — no Accessibility-style permission dialog.

Focus restoration captures the foreground window handle (`GetForegroundWindow`) before Clippy opens and restores it (`SetForegroundWindow`) before pasting.

### Window behavior

- Opaque panel background (no vibrancy)
- Closing the panel hides it; app keeps running in the system tray
- Single-instance: launching again focuses the existing instance

### Build

```bash
npm run dist:win
```

Build must run on Windows (or Windows CI) for native module compilation.

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Paste goes to wrong window | Ensure the target app was focused before opening Clippy |
| Global shortcut not registered | Another app may own the shortcut; change toggle shortcut in Settings |
| Tray icon missing | Clippy falls back to a built-in icon if `resources/trayTemplate.png` is unavailable |

## Linux

### Requirements

- X11 session or XWayland (for `xdotool`)
- **`xdotool` installed and on `PATH`**

```bash
sudo apt install xdotool    # Debian/Ubuntu
sudo dnf install xdotool    # Fedora
sudo pacman -S xdotool      # Arch
```

### Global shortcuts

| Feature | Accelerator |
|---------|-------------|
| Toggle (default) | `Alt+Space` |
| Paste slots | `Control+Alt+1` … `9` |

Electron `globalShortcut` works on X11. On pure Wayland without XWayland, global shortcuts and `xdotool` may not work.

### Auto-paste

- Captures active window: `xdotool getactivewindow`
- Reactivates: `xdotool windowactivate --sync <id>`
- Pastes: `xdotool key --clearmodifiers ctrl+v`

Clippy shows a setup banner until `xdotool` is detected.

### Window behavior

- Opaque panel background
- Tray icon; closing the panel hides it without quitting

### Build

```bash
npm run dist:linux
```

Produces AppImage and `.deb` by default (see `package.json` → `build.linux`).

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Setup banner persists | Install `xdotool`, restart Clippy |
| Auto-paste on Wayland | Use X11/XWayland session, or paste manually (clip still copied) |
| Hotkeys unreliable | Desktop environment may intercept Ctrl+Alt; try changing shortcuts |

## Shared behavior (all platforms)

### Tray

- Left-click tray icon: toggle panel
- Context menu: auto-paste, hide-on-blur, launch at login, clear history, quit

### Clipboard capture

Polls the system clipboard in the main process; deduplicates by content hash; stores in SQLite.

### Search

- Plain text search via FTS5 (maintained in application code)
- Regex: `/pattern/`
- Filters: `type:text`, `type:image`, `pinned:true`, tag names

### Settings

| Setting | Description |
|---------|-------------|
| Auto paste | Paste on Enter / row click when enabled |
| Hide on blur | Hide panel when focus leaves Clippy |
| Launch at login | OS login item (best supported on macOS and Windows) |
| Toggle shortcut | Global show/hide shortcut (default `Alt+Space`) |
| Ignore patterns | Regex lines; matching clipboard text is not saved |

### Quit

Use **Quit Clippy** from the tray menu. Closing the panel does not exit the app.

## Data paths summary

| Resource | macOS | Windows | Linux |
|----------|-------|---------|-------|
| v2 data dir | `~/Library/Application Support/clippy/` | `%APPDATA%\clippy\` | `~/.config/clippy/` |
| v1 legacy config | `~/Library/Application Support/electron-clippy/config.json` | `%APPDATA%\electron-clippy\config.json` | `~/.config/electron-clippy/config.json` |

# Platform guide

Shared UI across platforms; paste and focus restoration are OS-specific.

## Flow

```
User action (row click / Enter / hotkey)
        │
        ▼
PasteService.writeAndAutoPaste()
        ├─ Write clip to system clipboard
        ├─ Hide Clippy window (optional)
        ├─ FocusService.activatePreviousApp()
        └─ simulatePasteShortcut()
              ├─ macOS: AppleScript ⌘V
              ├─ Windows: PowerShell SendKeys ^v
              └─ Linux: xdotool ctrl+v
```

Code: `src/main/platform/system-input.ts`, `src/main/services/paste-service.ts`, `src/main/services/focus-service.ts`.

## macOS

**Requirements:** macOS 12+, Accessibility permission for auto-paste and focus restore.

| Feature          | Shortcut    |
| ---------------- | ----------- |
| Toggle (default) | `Alt+Space` |
| Paste slots      | `⌘⌃1`–`⌘⌃9` |

- Vibrancy / translucent panel
- Closing the panel hides the app (`app.hide()`); tray keeps it running

```bash
npm run dist:mac
CSC_IDENTITY_AUTO_DISCOVERY=false npm run dist:dir   # unsigned local test
```

| Issue                       | Fix                                                        |
| --------------------------- | ---------------------------------------------------------- |
| Auto-paste does nothing     | Grant Accessibility; restart Clippy                        |
| Paste slots not firing      | Check shortcut conflicts; logs in `~/Library/Logs/clippy/` |
| Panel does not hide on blur | Enable **Hide on blur** in Settings or tray                |

## Windows

**Requirements:** Windows 10+, PowerShell (default on modern Windows).

| Feature          | Shortcut         |
| ---------------- | ---------------- |
| Toggle (default) | `Alt+Space`      |
| Paste slots      | `Ctrl+Alt+1`–`9` |

- Auto-paste via `[System.Windows.Forms.SendKeys]::SendWait("^v")` — no permission prompt
- Focus restore uses `GetForegroundWindow` / `SetForegroundWindow`
- Opaque panel; single-instance (relaunch focuses existing app)

```bash
npm run dist:win   # build on Windows or Windows CI
```

| Issue                      | Fix                                                     |
| -------------------------- | ------------------------------------------------------- |
| Paste goes to wrong window | Focus the target app before opening Clippy              |
| Global shortcut missing    | Another app owns it — change toggle in Settings         |
| Tray icon missing          | Falls back to a built-in icon if tray assets are absent |

## Linux

**Requirements:** X11 or XWayland; **`xdotool` on `PATH`**.

```bash
sudo apt install xdotool     # Debian/Ubuntu
sudo dnf install xdotool     # Fedora
sudo pacman -S xdotool       # Arch
```

| Feature          | Shortcut         |
| ---------------- | ---------------- |
| Toggle (default) | `Alt+Space`      |
| Paste slots      | `Ctrl+Alt+1`–`9` |

- Capture / activate / paste via `xdotool`
- Setup banner shows until `xdotool` is detected
- Pure Wayland without XWayland: global shortcuts and paste simulation may fail

```bash
npm run dist:linux   # AppImage + .deb
```

| Issue                 | Fix                                                        |
| --------------------- | ---------------------------------------------------------- |
| Setup banner persists | Install `xdotool`, restart Clippy                          |
| Auto-paste on Wayland | Use X11/XWayland, or paste manually (clip is still copied) |
| Hotkeys unreliable    | DE may intercept Ctrl+Alt — change shortcuts in Settings   |

## Shared behavior

**Tray:** left-click toggles the panel; context menu covers auto-paste, hide-on-blur, launch at login, clear history, quit.

**Clipboard:** main-process polling, hash dedupe, SQLite storage.

**Search:** FTS5 plain text; regex `/pattern/`; filters `type:text`, `type:image`, `pinned:true`, tags.

**Settings**

| Setting         | Description                                       |
| --------------- | ------------------------------------------------- |
| Auto paste      | Paste on Enter / row click when enabled           |
| Hide on blur    | Hide when focus leaves Clippy                     |
| Launch at login | Login item (best on macOS / Windows)              |
| Toggle shortcut | Global show/hide (default `Alt+Space`)            |
| Ignore patterns | Regex lines; matching clipboard text is not saved |

Closing the panel does not quit. Use **Quit Clippy** from the tray.

## Data paths

| Resource  | macOS                                   | Windows                                 | Linux                                   |
| --------- | --------------------------------------- | --------------------------------------- | --------------------------------------- |
| v2 data   | `~/Library/Application Support/clippy/` | `%APPDATA%\clippy\`                     | `~/.config/clippy/`                     |
| v1 legacy | `…/electron-clippy/config.json`         | `%APPDATA%\electron-clippy\config.json` | `~/.config/electron-clippy/config.json` |

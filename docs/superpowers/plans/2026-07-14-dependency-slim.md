# Dependency optimization notes

## Runtime deps after slim (5)
- `better-sqlite3` — keep (core DB/FTS)
- `@tanstack/react-virtual` — keep (list virtualization)
- `clsx` + `tailwind-merge` — keep (tiny, used by `cn()`)
- `electron-log` — keep (10 main-process files)

## Removed
- `zod` (unused)
- `@electron-toolkit/preload` (unused)
- `@electron-toolkit/utils` → `app.setAppUserModelId`
- `run-applescript` → `osascript` via `execFile`
- `electron-builder-squirrel-windows` (NSIS/portable only)
- direct `esbuild` (transitive via vite)

## Intentionally not changed
- Do not add `clipboard-event` (opaque binaries)
- Do not swap `better-sqlite3` for sql.js
- `electron-vite@6` beta — pin to stable when GA; downgrade to 5 needs separate smoke test
- Optional later: re-add `zod` only for IPC input validation

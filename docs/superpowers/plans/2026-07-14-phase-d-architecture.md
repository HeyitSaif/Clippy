# Phase D Clipboard Architecture

**Goal:** FTS triggers, thumb custom protocol, two-tier clipboard poll — no risky npm clipboard packages.

**Package decision:** Keep in-house polling. Do NOT add `clipboard-event` (opaque binaries) or abandoned watchers. Tier-1 = formats fingerprint; Tier-2 = full scrape.

## Parallel tracks
1. FTS external content + triggers (fts_version 6)
2. clippy-thumb:// protocol
3. ClipboardService two-tier formats short-circuit

## Verify
- npm test && npm run typecheck
- No commit/push unless asked
- Do not run dev server

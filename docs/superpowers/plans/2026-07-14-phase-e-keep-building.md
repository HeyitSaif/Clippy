# Phase E — Keep Building

**Goal:** More perf/quality after Phase D. No risky deps. No commit/push. No dev server.

## Parallel tracks
1. **DB write perf** — wrap import/clear/trim in transactions; remove dead `toListItemFromRow`; cache hot prepared statements
2. **clippy-image://** — same pattern as thumbs for ClipPreview full images; drop base64 IPC for images
3. **Deslop + tests** — remove unused code, expand Vitest coverage for clipboard-watch + search edge cases

## Verify
`npm test && npm run typecheck`

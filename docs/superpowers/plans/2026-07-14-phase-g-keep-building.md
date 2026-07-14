# Phase G — Keep Building

**Goal:** Next review-driven improvements. No risky deps. No commit/push. No dev server.

## Parallel tracks
1. **Regex search** — scan until `limit` matches (or hard safety cap), not “first 500 rows then filter”
2. **File filter** — add `file` chip in ClipboardTab + ClipFilter type
3. **Hardening leftovers** — sandbox `readImageAsDataUrl` under imagesDir; expand path-utils tests
4. **Small UX** — ensure searchSortMode change refreshes list (already broadcasts); optional `file` in EMPTY messages

## Verify
`npm test && npm run typecheck`

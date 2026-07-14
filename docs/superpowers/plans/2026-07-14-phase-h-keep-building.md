# Phase H — Keep Building

**Goal:** List scale + search UX polish. No commit/push. No dev server.

## Parallel tracks
1. **Load more** — raise/list pagination: useClips supports appending next page (limit 200 offset) when scrolling near end; ClipList calls onNearEnd
2. **HighlightText** — support regex highlight when query is `/pattern/`; strip filter tokens already ok
3. **Filter chip density** — ensure File chip doesn't break toolbar layout (CSS if needed)

## Verify
`npm test && npm run typecheck`

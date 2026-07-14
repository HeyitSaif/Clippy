# Clippy Todo — Phased Build

**Decision:** Ship MVP first, then layer features without rewriting.

## Phase 1 — MVP (now)
- SQLite `todos` + `todo_lists`
- Add / toggle complete / edit / delete
- Default list “Inbox”
- Todo tab UI (glass, keyboard-friendly)
- Settings: show completed, default list

## Phase 2 — Dates & priority
- `due_at`, `priority` (none/low/med/high)
- Filters: active / done / overdue
- Sort: priority → due → created

## Phase 3 — Lists & rotate
- Multiple lists; Daily + Weekly special lists
- Auto-rotate after local midnight (carry incomplete daily → next day; archive completed)
- Setting: rotate hour (default 0)

## Phase 4 — Reminders
- `remind_at`; main-process timer; Notification API
- Settings: enable reminders, sound off by default

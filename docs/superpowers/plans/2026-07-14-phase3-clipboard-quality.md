# Phase 3 Clipboard Quality Implementation Plan

> **For agentic workers:** Execute task-by-task. Checkbox syntax for tracking.

**Goal:** Fix search ranking/settings, capture CPU waste, UI double-refresh, and add Vitest — without a structural rewrite (Phase D later).

**Architecture:** Keep Electron + SQLite FTS5. Harden shared search helpers; inject `searchSortMode` from settings in IPC; cheap clipboard fingerprints before PNG work; event-driven UI refresh.

**Tech Stack:** TypeScript, better-sqlite3 FTS5/bm25, React, Vitest

---

### Task 1: Shared search helpers + types
### Task 2: ClipRepository.search sort modes + safer regex/tags
### Task 3: Settings UI + IPC sort injection
### Task 4: ClipboardService capture perf
### Task 5: useClips race guard + ClipboardTab drop duplicate refresh
### Task 6: Vitest + verify green

Out of scope: FTS triggers, thumb protocol, native clipboard packages.

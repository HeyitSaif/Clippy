import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TODO_SYSTEM_LIST_IDS } from "@shared/types";
import { todoFromClip } from "@shared/clip-to-todo";
import { ClipList } from "../components/ClipList";
import { ClipPreview } from "../components/ClipPreview";
import { Toast } from "../components/Toast";
import { IconSearch, IconTag, IconX } from "../components/icons";
import { useClips, type ClipFilter } from "../hooks/useClips";
import { useToast } from "../hooks/useToast";
import { cn } from "../lib/utils";

const FILTERS: { id: ClipFilter; label: string; ariaLabel: string }[] = [
  { id: "all", label: "All", ariaLabel: "All clips" },
  { id: "text", label: "Text", ariaLabel: "Text clips" },
  { id: "image", label: "Img", ariaLabel: "Image clips" },
  { id: "file", label: "File", ariaLabel: "File clips" },
  { id: "pinned", label: "Pin", ariaLabel: "Pinned clips" },
  { id: "snippet", label: "Snip", ariaLabel: "Snippets" },
];

const EMPTY: Record<ClipFilter, { title: string; hint?: string }> = {
  all: {
    title: "Copy something — it'll show up here",
    hint: "Paste with Enter · Search with ⌘K",
  },
  text: { title: "No text clips" },
  image: { title: "No image clips" },
  file: { title: "No file clips" },
  pinned: { title: "No pinned clips", hint: "Pin clips to keep them handy" },
  snippet: { title: "No snippets yet", hint: "Save a clip as a reusable snippet" },
};

export function ClipboardTab() {
  const {
    clips,
    loading,
    query,
    setQuery,
    filter,
    setFilter,
    loadMore,
    togglePin,
    toggleSnippet,
    renameSnippet,
    deleteClip,
    updateTags,
  } = useClips();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const tagRef = useRef<HTMLInputElement>(null);
  const { message, show } = useToast();

  const selectedClip = useMemo(
    () => clips.find((c) => c.id === selectedId) ?? null,
    [clips, selectedId],
  );

  const selectedIndex = useMemo(
    () => (selectedId ? clips.findIndex((c) => c.id === selectedId) : -1),
    [clips, selectedId],
  );

  useEffect(() => {
    setSelectedId(clips[0]?.id ?? null);
  }, [query, filter]);

  useEffect(() => {
    if (selectedId && !clips.some((c) => c.id === selectedId)) {
      setSelectedId(clips[0]?.id ?? null);
    }
  }, [clips, selectedId]);

  useEffect(() => {
    const unsub = window.clippy.onWindowFocused(() => {
      searchRef.current?.focus();
      searchRef.current?.select();
    });
    searchRef.current?.focus();
    return unsub;
  }, []);

  const handleCopy = useCallback(
    async (id: string) => {
      await window.clippy.copyClip(id);
      show("Copied");
    },
    [show],
  );

  const handlePaste = useCallback(
    async (id: string) => {
      const ok = await window.clippy.pasteClip(id);
      show(ok ? "Pasted" : "Paste failed — check setup in Settings");
    },
    [show],
  );

  const handleTogglePin = useCallback(
    async (id: string) => {
      const ok = await togglePin(id);
      if (!ok) show("Action failed — restart Clippy");
    },
    [togglePin, show],
  );

  const handleToggleSnippet = useCallback(
    async (id: string) => {
      const clip = clips.find((c) => c.id === id);
      if (!clip) return;
      if (clip.isSnippet) {
        const ok = await toggleSnippet(id);
        if (ok) show("Snippet removed");
        else show("Action failed — restart Clippy");
        return;
      }
      const suggested = (clip.snippetName ?? clip.preview).slice(0, 40);
      const name = window.prompt("Snippet name", suggested);
      if (name === null) return;
      const ok = await toggleSnippet(id, name.trim() || suggested);
      if (ok) show("Saved as snippet");
      else show("Action failed — restart Clippy");
    },
    [clips, toggleSnippet, show],
  );

  const handleRenameSnippet = useCallback(
    async (id: string) => {
      const clip = clips.find((c) => c.id === id);
      if (!clip?.isSnippet) return;
      const current = clip.snippetName ?? clip.preview.slice(0, 40);
      const name = window.prompt("Rename snippet", current);
      if (name === null) return;
      const trimmed = name.trim();
      if (!trimmed) return;
      const ok = await renameSnippet(id, trimmed);
      if (ok) show("Snippet renamed");
      else show("Action failed — restart Clippy");
    },
    [clips, renameSnippet, show],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await deleteClip(id);
      if (ok) show("Deleted");
      else show("Delete failed — restart Clippy");
    },
    [deleteClip, show],
  );

  const handleCreateTodo = useCallback(
    async (id: string) => {
      try {
        const [clip, settings] = await Promise.all([
          window.clippy.getClip(id),
          window.clippy.getSettings(),
        ]);
        if (!clip) {
          show("Clip not found");
          return;
        }
        const { title, notes } = todoFromClip(clip);
        const listId =
          settings.todoDefaultListId || TODO_SYSTEM_LIST_IDS.inbox;
        await window.clippy.createTodo({ title, listId, notes });
        show("Added to Todo");
      } catch {
        show("Could not create todo");
      }
    },
    [show],
  );

  const handleAddTag = useCallback(
    async (raw: string) => {
      if (!selectedClip) return;
      const tag = raw.trim().replace(/^#/, "").toLowerCase();
      if (!tag || selectedClip.tags.includes(tag)) {
        setTagInput("");
        return;
      }
      const ok = await updateTags(selectedClip.id, [...selectedClip.tags, tag]);
      setTagInput("");
      if (ok) show("Tag added");
      else show("Tag failed — restart Clippy");
    },
    [selectedClip, updateTags, show],
  );

  const handleRemoveTag = useCallback(
    async (tag: string) => {
      if (!selectedClip) return;
      const ok = await updateTags(
        selectedClip.id,
        selectedClip.tags.filter((t) => t !== tag),
      );
      if (!ok) show("Tag failed — restart Clippy");
    },
    [selectedClip, updateTags, show],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement;
      const inInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "Escape") {
        if (previewId) {
          setPreviewId(null);
          e.preventDefault();
          return;
        }
        void window.clippy.hideWindow();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }

      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "t"
      ) {
        e.preventDefault();
        tagRef.current?.focus();
        return;
      }

      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "s" &&
        selectedIndex >= 0
      ) {
        e.preventDefault();
        void handleToggleSnippet(clips[selectedIndex].id);
        return;
      }

      if (inInput && !((e.metaKey || e.ctrlKey) && e.key === "Backspace"))
        return;

      if (clips.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = Math.min(Math.max(selectedIndex, 0) + 1, clips.length - 1);
        setSelectedId(clips[next]?.id ?? null);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const next = Math.max(Math.max(selectedIndex, 0) - 1, 0);
        setSelectedId(clips[next]?.id ?? null);
      } else if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        void handlePaste(clips[selectedIndex].id);
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "c" &&
        selectedIndex >= 0
      ) {
        e.preventDefault();
        void handleCopy(clips[selectedIndex].id);
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "p" &&
        selectedIndex >= 0
      ) {
        e.preventDefault();
        setPreviewId(clips[selectedIndex].id);
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key === "Backspace" &&
        selectedIndex >= 0
      ) {
        e.preventDefault();
        void handleDelete(clips[selectedIndex].id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    clips,
    selectedIndex,
    handlePaste,
    handleCopy,
    handleDelete,
    handleToggleSnippet,
    previewId,
  ]);

  const handleNearEnd = useCallback(() => {
    void loadMore();
  }, [loadMore]);

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div className="no-drag toolbar shrink-0">
        <div className="search-wrap">
          <IconSearch size={12} className="search-icon" />
          <input
            ref={searchRef}
            type="search"
            placeholder="Search…  /regex/  #tag"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="glass-search glass-search-compact"
            aria-label="Search clips"
          />
          {query && (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear search"
              onClick={() => setQuery("")}
            >
              <IconX size={11} />
            </button>
          )}
        </div>
        <div className="filter-row" role="toolbar" aria-label="Filter clips">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-label={f.ariaLabel}
              aria-pressed={filter === f.id}
              className={cn(
                "filter-chip",
                filter === f.id && "filter-chip-active",
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="clip-count" aria-live="polite">
            {loading ? "…" : clips.length}
          </span>
        </div>
        {selectedClip && (
          <div className="tag-bar no-drag" aria-label="Tags for selected clip">
            <IconTag
              size={11}
              className="shrink-0 text-[var(--text-tertiary)]"
              aria-hidden
            />
            {selectedClip.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="tag-chip tag-chip-active"
                onClick={() => void handleRemoveTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                #{tag}
                <IconX size={9} aria-hidden />
              </button>
            ))}
            <input
              ref={tagRef}
              type="text"
              value={tagInput}
              placeholder="Add tag…"
              className="tag-input"
              aria-label="Add tag"
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleAddTag(tagInput);
                } else if (e.key === "Escape") {
                  setTagInput("");
                  searchRef.current?.focus();
                }
              }}
            />
          </div>
        )}
      </div>

      {loading && clips.length === 0 ? (
        <div
          className="flex flex-1 flex-col gap-1 px-2.5 py-1.5"
          aria-busy="true"
          aria-label="Loading clips"
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="shimmer clip-shimmer" />
          ))}
        </div>
      ) : clips.length === 0 ? (
        <div className="empty-state">
          <span>{EMPTY[filter].title}</span>
          {EMPTY[filter].hint && (
            <span className="empty-state-hint">{EMPTY[filter].hint}</span>
          )}
        </div>
      ) : (
        <ClipList
          clips={clips}
          selectedId={selectedId}
          searchQuery={query}
          onSelect={setSelectedId}
          onCopy={handleCopy}
          onPaste={handlePaste}
          onTogglePin={handleTogglePin}
          onToggleSnippet={handleToggleSnippet}
          onRenameSnippet={handleRenameSnippet}
          onCreateTodo={handleCreateTodo}
          onDelete={handleDelete}
          onPreview={setPreviewId}
          onNearEnd={handleNearEnd}
        />
      )}

      <ClipPreview clipId={previewId} onClose={() => setPreviewId(null)} />
      <Toast message={message} />
    </div>
  );
}

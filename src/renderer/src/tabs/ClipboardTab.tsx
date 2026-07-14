import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClipList } from "../components/ClipList";
import { ClipPreview } from "../components/ClipPreview";
import { Toast } from "../components/Toast";
import { IconSearch, IconTag, IconX } from "../components/icons";
import { useClips, type ClipFilter } from "../hooks/useClips";
import { useToast } from "../hooks/useToast";
import { cn } from "../lib/utils";

const FILTERS: { id: ClipFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "text", label: "Text" },
  { id: "image", label: "Img" },
  { id: "file", label: "File" },
  { id: "pinned", label: "Pin" },
  { id: "snippet", label: "Snip" },
];

const EMPTY: Record<ClipFilter, string> = {
  all: "Copy something — it'll show up here",
  text: "No text clips",
  image: "No image clips",
  file: "No file clips",
  pinned: "No pinned clips",
  snippet: "No snippets yet",
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
      const ok = await toggleSnippet(id);
      if (ok) show("Snippet updated");
      else show("Action failed — restart Clippy");
    },
    [toggleSnippet, show],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      const ok = await deleteClip(id);
      if (ok) show("Deleted");
      else show("Delete failed — restart Clippy");
    },
    [deleteClip, show],
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
        <div className="filter-row">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={cn(
                "filter-chip",
                filter === f.id && "filter-chip-active",
              )}
            >
              {f.label}
            </button>
          ))}
          <span className="clip-count">{loading ? "…" : clips.length}</span>
        </div>
        {selectedClip && (
          <div className="tag-bar no-drag">
            <IconTag
              size={11}
              className="shrink-0 text-[var(--text-tertiary)]"
            />
            {selectedClip.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className="tag-chip tag-chip-active"
                onClick={() => void handleRemoveTag(tag)}
                title="Remove tag"
              >
                #{tag}
                <IconX size={9} />
              </button>
            ))}
            <input
              ref={tagRef}
              type="text"
              value={tagInput}
              placeholder="Add tag…"
              className="tag-input"
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
        <div className="flex flex-1 flex-col gap-1 px-3 py-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="shimmer h-8 rounded-md" />
          ))}
        </div>
      ) : clips.length === 0 ? (
        <div className="empty-state">{EMPTY[filter]}</div>
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

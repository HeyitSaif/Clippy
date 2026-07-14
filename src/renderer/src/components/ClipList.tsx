import { memo, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ClipListItem } from "@shared/types";
import { isNearEnd, NEAR_END_THRESHOLD } from "@shared/clip-pagination";
import { thumbUrl } from "@shared/thumb-protocol";
import { cn, formatRelativeTime } from "../lib/utils";
import { HighlightText } from "./HighlightText";
import { IconTip } from "./IconTip";
import {
  IconCopy,
  IconEye,
  IconFile,
  IconImage,
  IconPaste,
  IconCheckSquare,
  IconPin,
  IconText,
  IconTrash,
} from "./icons";

interface ClipListProps {
  clips: ClipListItem[];
  selectedId: string | null;
  searchQuery: string;
  onSelect: (id: string) => void;
  onCopy: (id: string) => void;
  onPaste: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleSnippet: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
  onNearEnd?: () => void;
}

const ROW_H = 36;
const ROW_H_IMG = 42;

export function ClipList({
  clips,
  selectedId,
  searchQuery,
  onSelect,
  onCopy,
  onPaste,
  onTogglePin,
  onToggleSnippet,
  onDelete,
  onPreview,
  onNearEnd,
}: ClipListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  /** Fire onNearEnd once per list length while near end (resets when length changes). */
  const nearEndFiredForLength = useRef(-1);
  const selectedIndex = selectedId
    ? clips.findIndex((c) => c.id === selectedId)
    : -1;

  const virtualizer = useVirtualizer({
    count: clips.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (i) =>
      clips[i]?.type === "image" && clips[i]?.hasThumb ? ROW_H_IMG : ROW_H,
    overscan: 8,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    if (!onNearEnd || clips.length === 0) return;
    const last = virtualItems[virtualItems.length - 1];
    if (!last) return;
    if (!isNearEnd(last.index, clips.length, NEAR_END_THRESHOLD)) return;
    if (nearEndFiredForLength.current === clips.length) return;
    nearEndFiredForLength.current = clips.length;
    onNearEnd();
  }, [clips.length, onNearEnd, virtualItems]);

  useEffect(() => {
    if (selectedIndex >= 0 && selectedIndex < clips.length) {
      virtualizer.scrollToIndex(selectedIndex, { align: "auto" });
    }
  }, [selectedIndex, clips.length, virtualizer]);

  if (clips.length === 0) return null;

  return (
    <div
      ref={parentRef}
      className="clip-scroll flex-1 overflow-y-auto px-1.5 pb-1.5"
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualItems.map((virtualRow) => {
          const clip = clips[virtualRow.index];
          return (
            <div
              key={clip.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ClipRow
                clip={clip}
                index={virtualRow.index}
                selected={clip.id === selectedId}
                searchQuery={searchQuery}
                onSelect={onSelect}
                onCopy={onCopy}
                onPaste={onPaste}
                onTogglePin={onTogglePin}
                onToggleSnippet={onToggleSnippet}
                onDelete={onDelete}
                onPreview={onPreview}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ClipRow = memo(function ClipRow({
  clip,
  index,
  selected,
  searchQuery,
  onSelect,
  onCopy,
  onPaste,
  onTogglePin,
  onToggleSnippet,
  onDelete,
  onPreview,
}: {
  clip: ClipListItem;
  index: number;
  selected: boolean;
  searchQuery: string;
  onSelect: (id: string) => void;
  onCopy: (id: string) => void;
  onPaste: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleSnippet: (id: string) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const isImage = clip.type === "image" && clip.hasThumb;
  const thumbSrc = isImage ? thumbUrl(clip.id) : undefined;
  const slot = index < 9 && !searchQuery.trim() ? index + 1 : null;

  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={() => {
        onSelect(clip.id);
        void onPaste(clip.id);
      }}
      className={cn(
        "clip-row group",
        isImage && "clip-row-image",
        selected && "clip-row-selected",
      )}
      style={{ minHeight: isImage ? ROW_H_IMG : ROW_H }}
    >
      {slot !== null && <span className="clip-slot">{slot}</span>}
      {!isImage && <TypeGlyph type={clip.type} />}
      <div className="min-w-0 flex-1 flex items-center gap-1">
        {clip.isPinned && (
          <IconPin size={8} className="shrink-0 text-[var(--accent)]" />
        )}
        {clip.isSnippet && <span className="clip-badge">S</span>}
        {isImage ? (
          thumbSrc ? (
            <img src={thumbSrc} alt="" className="clip-thumb" />
          ) : (
            <div className="clip-thumb clip-thumb-placeholder" />
          )
        ) : (
          <p className="clip-preview">
            <HighlightText text={clip.preview} query={searchQuery} />
          </p>
        )}
      </div>
      <span className="clip-time">{formatRelativeTime(clip.createdAt)}</span>
      <div className="clip-actions no-drag">
        <IconTip
          label="Copy"
          onClick={(e) => {
            e.stopPropagation();
            onCopy(clip.id);
          }}
        >
          <IconCopy size={11} />
        </IconTip>
        <IconTip
          label="Paste"
          accent
          onClick={(e) => {
            e.stopPropagation();
            onPaste(clip.id);
          }}
        >
          <IconPaste size={11} />
        </IconTip>
        <IconTip
          label={clip.isPinned ? "Unpin" : "Pin"}
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin(clip.id);
          }}
        >
          <IconPin size={11} />
        </IconTip>
        <IconTip
          label={clip.isSnippet ? "Remove snippet" : "Save as snippet"}
          onClick={(e) => {
            e.stopPropagation();
            onToggleSnippet(clip.id);
          }}
        >
          <IconCheckSquare size={11} />
        </IconTip>
        <IconTip
          label="Preview"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(clip.id);
          }}
        >
          <IconEye size={11} />
        </IconTip>
        <IconTip
          label="Delete"
          danger
          onClick={(e) => {
            e.stopPropagation();
            onDelete(clip.id);
          }}
        >
          <IconTrash size={11} />
        </IconTip>
      </div>
    </div>
  );
});

function TypeGlyph({ type }: { type: ClipListItem["type"] }) {
  const icon =
    type === "image" ? (
      <IconImage size={10} />
    ) : type === "file" ? (
      <IconFile size={10} />
    ) : (
      <IconText size={10} />
    );
  return <span className="clip-type-glyph">{icon}</span>;
}

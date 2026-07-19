import { useEffect, useState } from "react";
import { imageUrl } from "@shared/thumb-protocol";
import type { ClipRecord } from "@shared/types";
import { cn } from "../lib/utils";
import { IconX } from "./icons";

interface ClipPreviewProps {
  clipId: string | null;
  onClose: () => void;
}

export function ClipPreview({ clipId, onClose }: ClipPreviewProps) {
  const [clip, setClip] = useState<ClipRecord | null>(null);

  useEffect(() => {
    if (!clipId) {
      setClip(null);
      return;
    }
    let cancelled = false;
    void window.clippy.getClip(clipId).then((next) => {
      if (!cancelled) setClip(next);
    });
    return () => {
      cancelled = true;
    };
  }, [clipId]);

  if (!clipId || !clip) return null;

  return (
    <div
      className="no-drag preview-panel"
      role="dialog"
      aria-label="Clip preview"
    >
      <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-[var(--text-tertiary)]">
          Preview
        </span>
        <button
          type="button"
          onClick={onClose}
          className="icon-btn icon-btn-sm"
          aria-label="Close preview"
        >
          <IconX size={12} />
        </button>
      </div>
      <div className="clip-scroll preview-panel-body">
        {clip.type === "image" ? (
          <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--glass-border-subtle)] shadow-md">
            <img
              src={imageUrl(clip.id)}
              alt="Clip preview"
              className="max-h-52 w-full object-contain"
            />
          </div>
        ) : (
          <pre
            className={cn(
              "whitespace-pre-wrap break-words text-[12px] font-medium leading-relaxed tracking-[-0.01em] text-[var(--text-primary)]",
            )}
          >
            {clip.textContent ?? clip.preview}
          </pre>
        )}
        {clip.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Tags">
            {clip.tags.map((t) => (
              <span key={t} className="tag-chip">
                #{t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

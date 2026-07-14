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
    void window.clippy.getClip(clipId).then(setClip);
  }, [clipId]);

  if (!clipId || !clip) return null;

  return (
    <div className="no-drag preview-panel">
      <div className="flex items-center justify-between border-b border-[var(--glass-border-subtle)] px-3 py-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
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
      <div className="clip-scroll max-h-[200px] overflow-y-auto p-3">
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
              "whitespace-pre-wrap break-words text-[12px] leading-relaxed text-[var(--text-primary)]",
            )}
          >
            {clip.textContent ?? clip.preview}
          </pre>
        )}
        {clip.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {clip.tags.map((t) => (
              <span key={t} className="tag-chip">
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

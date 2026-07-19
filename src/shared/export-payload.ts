import type { ClipRecord, ClipType, ExportPayload } from "./types";

const CLIP_TYPES = new Set<ClipType>(["text", "image", "file"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value : null;
}

function asBoolean(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((t): t is string => typeof t === "string");
}

function normalizeClip(raw: unknown): ClipRecord | null {
  if (!isObject(raw)) return null;
  const type = raw.type;
  if (typeof type !== "string" || !CLIP_TYPES.has(type as ClipType))
    return null;
  const hash = typeof raw.hash === "string" ? raw.hash : "";
  if (!hash) return null;
  const preview = typeof raw.preview === "string" ? raw.preview : "";

  return {
    id: typeof raw.id === "string" ? raw.id : hash,
    type: type as ClipType,
    hash,
    preview,
    textContent: asStringOrNull(raw.textContent),
    htmlContent: asStringOrNull(raw.htmlContent),
    rtfContent: asStringOrNull(raw.rtfContent),
    imagePath: asStringOrNull(raw.imagePath),
    thumbPath: asStringOrNull(raw.thumbPath),
    filePath: asStringOrNull(raw.filePath),
    isPinned: asBoolean(raw.isPinned),
    isSnippet: asBoolean(raw.isSnippet),
    snippetName: asStringOrNull(raw.snippetName),
    tags: normalizeTags(raw.tags),
    createdAt: asNumber(raw.createdAt, Date.now()),
    updatedAt: asNumber(raw.updatedAt, Date.now()),
  };
}

export type ParseExportResult =
  | { ok: true; payload: ExportPayload }
  | { ok: false; error: string };

/**
 * Fail-closed parse of a Clippy v2 export JSON value.
 * Rejects non-objects, missing clips arrays, and rows that lack type/hash.
 */
export function parseExportPayload(raw: unknown): ParseExportResult {
  if (!isObject(raw)) {
    return { ok: false, error: "Export file is not a JSON object" };
  }
  if (!Array.isArray(raw.clips)) {
    return { ok: false, error: "Export file missing clips array" };
  }

  const clips: ClipRecord[] = [];
  for (let i = 0; i < raw.clips.length; i++) {
    const clip = normalizeClip(raw.clips[i]);
    if (!clip) {
      return { ok: false, error: `Invalid clip at index ${i}` };
    }
    clips.push(clip);
  }

  return {
    ok: true,
    payload: {
      version: 2,
      exportedAt: asNumber(raw.exportedAt, Date.now()),
      clips,
    },
  };
}

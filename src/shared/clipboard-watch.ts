/**
 * Pure helpers for clipboard change detection (tier-1 formats fingerprint).
 * Kept free of Electron APIs so Vitest can cover them in Node.
 */

/** How often to deep-verify image clipboard content when formats are unchanged. */
export const IMAGE_DEEP_VERIFY_EVERY = 8;

/** Stable fingerprint of clipboard format list (order-independent). */
export function formatsKey(formats: readonly string[]): string {
  if (formats.length === 0) return "";
  return [...formats].sort().join("|");
}

/** True when any format is an image MIME (e.g. image/png). */
export function formatsIncludeImage(formats: readonly string[]): boolean {
  return formats.some((f) => f.startsWith("image/"));
}

/** True when any format is a text MIME (e.g. text/plain). */
export function formatsIncludeText(formats: readonly string[]): boolean {
  return formats.some((f) => f.startsWith("text/"));
}

/**
 * Cheap image identity from dimensions + bitmap byte length (no hashing).
 * Used to skip sha256 when the clipboard image is unchanged.
 */
export function imageCheapKey(
  width: number,
  height: number,
  byteLength: number,
): string {
  return `${width}x${height}:${byteLength}`;
}

/**
 * When formats are unchanged and we already captured an image, skip deep reads
 * except every Nth idle tick (catches rare same-format replacements).
 */
export function shouldDeepVerifyImage(
  idleStreak: number,
  every = IMAGE_DEEP_VERIFY_EVERY,
): boolean {
  if (every <= 1) return true;
  return idleStreak > 0 && idleStreak % every === 0;
}

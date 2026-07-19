/** Max UTF-8 bytes retained for text/html/rtf clip bodies (protects scrape/DB/FTS). */
export const MAX_CLIP_TEXT_BYTES = 1_048_576; // 1 MiB

/** Cheap UTF-8 byte length without Node Buffer (safe in Vitest / shared). */
export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

/**
 * Truncate a string to at most `maxBytes` UTF-8 bytes (never splits a code point).
 * Returns whether truncation occurred.
 */
export function truncateUtf8(
  value: string,
  maxBytes: number = MAX_CLIP_TEXT_BYTES,
): { value: string; truncated: boolean } {
  if (maxBytes <= 0) return { value: "", truncated: value.length > 0 };
  const encoded = new TextEncoder().encode(value);
  if (encoded.byteLength <= maxBytes) {
    return { value, truncated: false };
  }
  let end = maxBytes;
  // Walk back over continuation bytes (10xxxxxx) so we don't slice mid-code-point.
  while (end > 0 && (encoded[end] & 0xc0) === 0x80) end--;
  const sliced = new TextDecoder().decode(encoded.subarray(0, end));
  return { value: sliced, truncated: true };
}

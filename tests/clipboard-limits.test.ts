import { describe, expect, it } from "vitest";
import {
  MAX_CLIP_TEXT_BYTES,
  truncateUtf8,
  utf8ByteLength,
} from "../src/shared/clipboard-limits";

describe("truncateUtf8", () => {
  it("returns unchanged when under the limit", () => {
    const { value, truncated } = truncateUtf8("hello", 100);
    expect(value).toBe("hello");
    expect(truncated).toBe(false);
  });

  it("truncates to max UTF-8 bytes", () => {
    const big = "a".repeat(MAX_CLIP_TEXT_BYTES + 50);
    const { value, truncated } = truncateUtf8(big);
    expect(truncated).toBe(true);
    expect(utf8ByteLength(value)).toBeLessThanOrEqual(MAX_CLIP_TEXT_BYTES);
  });

  it("does not split a multi-byte code point", () => {
    // '€' is 3 bytes in UTF-8
    const s = "€€€";
    const { value, truncated } = truncateUtf8(s, 4);
    expect(truncated).toBe(true);
    expect(value).toBe("€");
    expect(utf8ByteLength(value)).toBe(3);
  });
});

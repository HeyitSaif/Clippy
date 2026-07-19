import { describe, expect, it } from "vitest";
import { parseExportPayload } from "../src/shared/export-payload";

describe("parseExportPayload", () => {
  it("rejects non-objects", () => {
    expect(parseExportPayload(null).ok).toBe(false);
    expect(parseExportPayload("x").ok).toBe(false);
  });

  it("rejects missing clips array", () => {
    const result = parseExportPayload({ version: 2 });
    expect(result.ok).toBe(false);
  });

  it("rejects invalid clip rows fail-closed", () => {
    const result = parseExportPayload({
      version: 2,
      clips: [{ type: "text", preview: "no hash" }],
    });
    expect(result.ok).toBe(false);
  });

  it("accepts a minimal valid export", () => {
    const result = parseExportPayload({
      version: 2,
      exportedAt: 1,
      clips: [
        {
          type: "text",
          hash: "abc",
          preview: "hi",
          textContent: "hi",
          htmlContent: null,
          rtfContent: null,
          imagePath: null,
          thumbPath: null,
          filePath: null,
          isPinned: false,
          isSnippet: false,
          snippetName: null,
          tags: ["a"],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.clips).toHaveLength(1);
      expect(result.payload.clips[0].hash).toBe("abc");
      expect(result.payload.clips[0].tags).toEqual(["a"]);
    }
  });
});

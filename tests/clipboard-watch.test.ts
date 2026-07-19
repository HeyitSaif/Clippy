import { describe, expect, it } from "vitest";
import {
  formatsIncludeImage,
  formatsIncludeText,
  formatsKey,
  imageCheapKey,
  shouldDeepVerifyImage,
} from "../src/shared/clipboard-watch";

describe("formatsKey", () => {
  it("returns empty string for empty formats", () => {
    expect(formatsKey([])).toBe("");
  });

  it("joins a single format", () => {
    expect(formatsKey(["text/plain"])).toBe("text/plain");
  });

  it("is order-independent (sorted then joined)", () => {
    const a = formatsKey(["text/html", "text/plain", "image/png"]);
    const b = formatsKey(["image/png", "text/plain", "text/html"]);
    expect(a).toBe(b);
    expect(a).toBe("image/png|text/html|text/plain");
  });

  it("does not mutate the input array", () => {
    const formats = ["z", "a"];
    formatsKey(formats);
    expect(formats).toEqual(["z", "a"]);
  });

  it("differs when format sets differ", () => {
    expect(formatsKey(["text/plain"])).not.toBe(formatsKey(["text/html"]));
    expect(formatsKey(["text/plain"])).not.toBe(
      formatsKey(["text/plain", "text/html"]),
    );
  });
});

describe("formatsIncludeImage / formatsIncludeText", () => {
  it("detects image MIME prefixes", () => {
    expect(formatsIncludeImage(["text/plain", "image/png"])).toBe(true);
    expect(formatsIncludeImage(["text/plain"])).toBe(false);
  });

  it("detects text MIME prefixes", () => {
    expect(formatsIncludeText(["text/plain", "image/png"])).toBe(true);
    expect(formatsIncludeText(["image/png"])).toBe(false);
  });
});

describe("imageCheapKey / shouldDeepVerifyImage", () => {
  it("builds a stable size+byteLength key", () => {
    expect(imageCheapKey(100, 50, 20000)).toBe("100x50:20000");
  });

  it("deep-verifies on every Nth idle tick", () => {
    expect(shouldDeepVerifyImage(0, 8)).toBe(false);
    expect(shouldDeepVerifyImage(7, 8)).toBe(false);
    expect(shouldDeepVerifyImage(8, 8)).toBe(true);
    expect(shouldDeepVerifyImage(16, 8)).toBe(true);
  });
});

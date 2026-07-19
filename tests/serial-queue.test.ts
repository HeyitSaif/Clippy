import { describe, expect, it } from "vitest";
import { createSerialQueue } from "../src/shared/serial-queue";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("createSerialQueue", () => {
  it("runs overlapping jobs sequentially", async () => {
    const enqueue = createSerialQueue();
    const order: number[] = [];

    const a = enqueue(async () => {
      order.push(1);
      await sleep(30);
      order.push(2);
      return "a";
    });
    const b = enqueue(async () => {
      order.push(3);
      return "b";
    });

    await expect(Promise.all([a, b])).resolves.toEqual(["a", "b"]);
    expect(order).toEqual([1, 2, 3]);
  });

  it("keeps the chain alive after a rejected job", async () => {
    const enqueue = createSerialQueue();
    const first = enqueue(async () => {
      throw new Error("boom");
    });
    const second = enqueue(async () => "ok");

    await expect(first).rejects.toThrow("boom");
    await expect(second).resolves.toBe("ok");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createNameplateTexture,
  hash01,
  MAX_NAMEPLATE_CHARS,
} from "./textures";

/** Konteks Canvas 2D tiruan: tiap karakter selebar 20 px. */
function fakeContext() {
  const drawn: string[] = [];
  const measureText = vi.fn((text: string) => ({ width: text.length * 20 }));
  const context = {
    measureText,
    fillText: (text: string) => drawn.push(text),
    fillRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    arcTo: () => {},
    closePath: () => {},
    fill: () => {},
    stroke: () => {},
  };
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
    context as never,
  );
  return { drawn, measureText };
}

describe("createNameplateTexture", () => {
  afterEach(() => vi.restoreAllMocks());

  it("judul pendek digambar apa adanya", () => {
    const { drawn } = fakeContext();
    createNameplateTexture("R01", "Shop", "project").dispose();
    expect(drawn).toEqual(["R01", "Shop"]);
  });

  it("judul panjang dipotong dengan elipsis", () => {
    const { drawn } = fakeContext();
    createNameplateTexture("R01", "A".repeat(40), "project").dispose();
    const title = drawn[1];
    expect(title.endsWith("…")).toBe(true);
    expect(title.length).toBeLessThan(40);
  });

  it("judul raksasa tidak membuat pengukuran teks meledak", () => {
    const { measureText } = fakeContext();
    createNameplateTexture("R01", "A".repeat(100_000), "project").dispose();
    // Paling banyak satu pengukuran per karakter yang tersisa setelah dipotong.
    expect(measureText.mock.calls.length).toBeLessThan(
      MAX_NAMEPLATE_CHARS + 10,
    );
    for (const [text] of measureText.mock.calls) {
      expect(text.length).toBeLessThanOrEqual(MAX_NAMEPLATE_CHARS + 1);
    }
  });
});

describe("hash01", () => {
  it("deterministik dan selalu di [0, 1)", () => {
    for (let n = -50; n < 200; n++) {
      const value = hash01(n * 1.37);
      expect(value).toBe(hash01(n * 1.37));
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});

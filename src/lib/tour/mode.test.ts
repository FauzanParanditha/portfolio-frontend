import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readTourMode,
  resetTourModeForTest,
  subscribeTourMode,
  writeTourMode,
} from "./mode";

describe("pilihan tampilan tur", () => {
  beforeEach(() => resetTourModeForTest());
  afterEach(() => {
    vi.restoreAllMocks();
    resetTourModeForTest();
  });

  it("belum memilih = null", () => {
    expect(readTourMode()).toBeNull();
  });

  it("pilihan disimpan dan bertahan (localStorage)", () => {
    writeTourMode("simple");
    expect(readTourMode()).toBe("simple");
    expect(window.localStorage.getItem("tour-mode")).toBe("simple");
    writeTourMode("3d");
    expect(readTourMode()).toBe("3d");
  });

  it("nilai tak dikenal di storage diabaikan", () => {
    window.localStorage.setItem("tour-mode", "<script>");
    expect(readTourMode()).toBeNull();
  });

  it("storage diblokir: pilihan tetap berlaku selama halaman terbuka, tanpa galat", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("blocked", "SecurityError");
    });
    expect(readTourMode()).toBeNull();
    expect(() => writeTourMode("simple")).not.toThrow();
    expect(readTourMode()).toBe("simple");
  });

  it("pelanggan diberi tahu saat pilihan berubah, dan berhenti setelah lepas", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTourMode(listener);
    writeTourMode("simple");
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
    writeTourMode("3d");
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("tab lain mengubah pilihan: nilai dari storage yang dipakai", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeTourMode(listener);
    writeTourMode("3d");
    window.localStorage.setItem("tour-mode", "simple");
    window.dispatchEvent(new StorageEvent("storage", { key: "tour-mode" }));
    expect(readTourMode()).toBe("simple");
    // Kunci lain tidak memicu apa pun.
    listener.mockClear();
    window.dispatchEvent(new StorageEvent("storage", { key: "lainnya" }));
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

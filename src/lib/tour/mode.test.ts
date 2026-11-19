import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readTourMode,
  resetTourModeForTest,
  subscribeTourMode,
  TOUR_MODE_SCRIPT,
  writeTourMode,
} from "./mode";

const rootMode = () => document.documentElement.getAttribute("data-tour-mode");

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

  it("pilihan tercermin di <html data-tour-mode> (dibaca CSS tata letak)", () => {
    expect(rootMode()).toBeNull();
    writeTourMode("simple");
    expect(rootMode()).toBe("simple");
    writeTourMode("3d");
    expect(rootMode()).toBe("3d");
    resetTourModeForTest();
    expect(rootMode()).toBeNull();
  });

  describe("skrip pra-paint (root layout)", () => {
    const run = () => new Function(TOUR_MODE_SCRIPT)();

    it("memasang atribut dari pilihan tersimpan, sebelum React berjalan", () => {
      window.localStorage.setItem("tour-mode", "simple");
      run();
      expect(rootMode()).toBe("simple");
    });

    it("tanpa pilihan atau nilai tak dikenal: tidak memasang apa pun", () => {
      run();
      expect(rootMode()).toBeNull();
      window.localStorage.setItem("tour-mode", '"><script>');
      run();
      expect(rootMode()).toBeNull();
    });

    it("storage diblokir: tidak melempar, halaman tetap jalan", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("blocked", "SecurityError");
      });
      expect(run).not.toThrow();
      expect(rootMode()).toBeNull();
    });

    it("sepakat dengan readTourMode untuk tiap nilai", () => {
      for (const value of ["3d", "simple", "", "SIMPLE", "auto"]) {
        resetTourModeForTest();
        window.localStorage.setItem("tour-mode", value);
        run();
        expect(rootMode()).toBe(readTourMode());
      }
    });
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
    expect(rootMode()).toBe("simple");
    // Kunci lain tidak memicu apa pun.
    listener.mockClear();
    window.dispatchEvent(new StorageEvent("storage", { key: "lainnya" }));
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});

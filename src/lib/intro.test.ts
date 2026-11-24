import { afterEach, describe, expect, it, vi } from "vitest";

import { INTRO_ATTRIBUTE, INTRO_SESSION_SCRIPT, markIntroSeen } from "./intro";

const run = () => new Function(INTRO_SESSION_SCRIPT)();
const attribute = () => document.documentElement.getAttribute(INTRO_ATTRIBUTE);

describe("penanda intro", () => {
  afterEach(() => {
    document.documentElement.removeAttribute(INTRO_ATTRIBUTE);
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("dokumen pertama di sesi ini: intro tampil (tanpa atribut), sesinya dicatat", () => {
    run();
    expect(attribute()).toBeNull();
    expect(sessionStorage.getItem("introSeen")).toBe("1");
  });

  it("dokumen berikutnya di sesi yang sama: intro dilewati sejak sebelum paint", () => {
    run();
    run();
    expect(attribute()).toBe("seen");
  });

  it("storage diblokir (mode privat): tidak melempar, intro tampil seperti biasa", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(run).not.toThrow();
    expect(attribute()).toBeNull();
  });

  it("markIntroSeen menandai dokumen ini, supaya navigasi sisi klien tidak memutar intro lagi", () => {
    markIntroSeen();
    expect(attribute()).toBe("seen");
  });

  it("skripnya berdiri sendiri: tanpa impor, tanpa sintaks yang butuh transpilasi", () => {
    expect(INTRO_SESSION_SCRIPT).not.toMatch(
      /import|require|=>|\bconst\b|\blet\b/,
    );
  });
});

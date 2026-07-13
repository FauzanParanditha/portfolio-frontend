import { describe, expect, it } from "vitest";

import { sanitizeInternalPath } from "@/lib/sanitizeInternalPath";

describe("sanitizeInternalPath", () => {
  describe("path internal yang valid diteruskan apa adanya", () => {
    it.each([
      "/admin",
      "/admin/projects",
      "/admin/users?page=2",
      "/admin/users?page=2&sort=asc",
      "/a",
    ])("menerima %s", (path) => {
      expect(sanitizeInternalPath(path)).toBe(path);
    });
  });

  describe("nilai berbahaya / tidak valid → fallback default (/admin)", () => {
    it.each<[string, string | null | undefined]>([
      ["protocol-relative //evil.com", "//evil.com"],
      ["URL absolut https", "https://evil.com"],
      ["backslash-relative /\\evil", "/\\evil"],
      ["backslash di tengah", "/admin\\evil"],
      ["skema di tengah path", "/redirect?to=http://evil.com"],
      ["tanpa leading slash", "evil.com"],
      ["string kosong", ""],
      ["null", null],
      ["undefined", undefined],
    ])("menolak %s", (_label, value) => {
      expect(sanitizeInternalPath(value)).toBe("/admin");
    });
  });

  it("menghormati fallback custom saat nilai tidak valid", () => {
    expect(sanitizeInternalPath("//evil.com", "/dashboard")).toBe("/dashboard");
    expect(sanitizeInternalPath(null, "/home")).toBe("/home");
    expect(sanitizeInternalPath("", "/login")).toBe("/login");
  });

  it("mengabaikan fallback custom saat nilai valid", () => {
    expect(sanitizeInternalPath("/admin/settings", "/home")).toBe(
      "/admin/settings",
    );
  });
});

import { describe, expect, it } from "vitest";

import { isSafeHttpUrl, safeHttpUrl, safeImageSrc } from "@/lib/safeUrl";

describe("safeHttpUrl / isSafeHttpUrl", () => {
  describe("URL http/https absolut diterima", () => {
    it.each([
      "http://example.com",
      "https://example.com",
      "https://github.com/user/repo",
      "https://demo.example.com:8443/path?q=1#bagian",
      "HTTPS://EXAMPLE.COM/Path",
      "http://localhost:3000",
    ])("menerima %s", (value) => {
      expect(isSafeHttpUrl(value)).toBe(true);
      expect(safeHttpUrl(value)).toBe(value);
    });

    it("memangkas spasi di sekitar URL yang aman", () => {
      expect(safeHttpUrl("  https://example.com/x  ")).toBe(
        "https://example.com/x",
      );
    });
  });

  describe("skema berbahaya, relatif, dan nilai non-string ditolak", () => {
    it.each<[string, unknown]>([
      ["javascript:", "javascript:alert(1)"],
      ["javascript: campuran huruf besar-kecil", "JaVaScRiPt:alert(1)"],
      ["javascript: dengan spasi di depan", " javascript:alert(1)"],
      ["javascript: dengan tab/newline di depan", "\t\njavascript:alert(1)"],
      ["javascript: dengan tab di tengah skema", "java\tscript:alert(1)"],
      [
        "javascript: berpura-pura punya host",
        "javascript://example.com/%0aalert(1)",
      ],
      ["data:", "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=="],
      ["vbscript:", "vbscript:msgbox(1)"],
      ["file:", "file:///etc/passwd"],
      ["mailto:", "mailto:a@example.com"],
      ["ftp:", "ftp://example.com/x"],
      ["http tanpa host", "http://"],
      ["URL relatif root", "/projects/abc"],
      ["URL relatif tanpa slash", "github.com/user/repo"],
      ["protocol-relative", "//evil.com"],
      ["string kosong", ""],
      ["hanya spasi", "   "],
      ["null", null],
      ["undefined", undefined],
      ["angka", 42],
      ["boolean", true],
      ["objek", { href: "https://example.com" }],
      ["array", ["https://example.com"]],
      ["objek URL (bukan string)", new URL("https://example.com")],
    ])("menolak %s", (_label, value) => {
      expect(isSafeHttpUrl(value)).toBe(false);
      expect(safeHttpUrl(value)).toBeNull();
    });
  });
});

describe("safeImageSrc", () => {
  it.each([
    "https://images.unsplash.com/photo-1",
    "http://localhost:8080/uploads/abc.png",
    "/uploads/abc.png",
    "/images/cover.jpg?v=2",
  ])("menerima %s", (value) => {
    expect(safeImageSrc(value)).toBe(value);
  });

  it.each<[string, unknown]>([
    ["javascript:", "javascript:alert(1)"],
    ["javascript: dengan spasi di depan", " JaVaScRiPt:alert(1)"],
    ["data: (SVG)", "data:image/svg+xml,<svg onload=alert(1)>"],
    ["vbscript:", "vbscript:msgbox(1)"],
    ["protocol-relative", "//evil.com/x.png"],
    ["backslash-relative", "/\\evil.com/x.png"],
    ["tab yang menyamarkan protocol-relative", "/\t/evil.com/x.png"],
    ["relatif tanpa slash", "uploads/x.png"],
    ["string kosong", ""],
    ["null", null],
    ["undefined", undefined],
    ["angka", 7],
  ])("menolak %s", (_label, value) => {
    expect(safeImageSrc(value)).toBeNull();
  });
});

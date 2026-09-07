import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { canOptimizeImage, imageRemotePatterns } from "@/lib/imageHosts";

const ASLI = process.env.NEXT_PUBLIC_API_URL;

describe("imageHosts", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080/api/v1";
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = ASLI;
  });

  describe("imageRemotePatterns", () => {
    it("memuat host backend dengan path dibatasi ke /uploads", () => {
      const backend = imageRemotePatterns().find(
        (p) => p.hostname === "localhost",
      );
      expect(backend).toBeDefined();
      expect(backend?.port).toBe("8080");
      expect(backend?.pathname).toBe("/uploads/**");
    });

    it("tetap memuat host pihak ketiga yang diizinkan", () => {
      expect(
        imageRemotePatterns().some((p) => p.hostname === "images.unsplash.com"),
      ).toBe(true);
    });

    it("tidak menambah host backend bila API_URL berupa path relatif", () => {
      // Deploy satu-origin di balik reverse proxy: gambarnya same-origin.
      process.env.NEXT_PUBLIC_API_URL = "/api/v1";
      expect(imageRemotePatterns().every((p) => p.hostname !== "")).toBe(true);
      expect(imageRemotePatterns()).toHaveLength(1);
    });
  });

  describe("canOptimizeImage", () => {
    it("mengizinkan berkas unggahan dari host backend", () => {
      expect(canOptimizeImage("http://localhost:8080/uploads/abc.png")).toBe(
        true,
      );
    });

    // Izin dibatasi ke /uploads: path lain di host yang sama bukan gambar kita.
    it("menolak path lain di host backend", () => {
      expect(canOptimizeImage("http://localhost:8080/api/v1/projects")).toBe(
        false,
      );
    });

    it("mengizinkan host pihak ketiga yang terdaftar", () => {
      expect(canOptimizeImage("https://images.unsplash.com/photo-123")).toBe(
        true,
      );
    });

    // Ini kasus yang paling penting: host asing HARUS menghasilkan false,
    // karena next/image melempar saat render bila host tidak terdaftar.
    it("menolak host yang tidak terdaftar", () => {
      expect(canOptimizeImage("https://cdn.contoh-asing.com/a.png")).toBe(
        false,
      );
      expect(canOptimizeImage("https://i.imgur.com/a.png")).toBe(false);
    });

    it("membedakan protokol dan port", () => {
      expect(canOptimizeImage("https://localhost:8080/uploads/a.png")).toBe(
        false,
      );
      expect(canOptimizeImage("http://localhost:3000/uploads/a.png")).toBe(
        false,
      );
    });

    it("mengizinkan URL relatif (berkas milik aplikasi sendiri)", () => {
      expect(canOptimizeImage("/images/zns.webp")).toBe(true);
    });

    it("menolak nilai kosong dan URL tidak valid", () => {
      expect(canOptimizeImage("")).toBe(false);
      expect(canOptimizeImage("   ")).toBe(false);
      expect(canOptimizeImage("bukan url")).toBe(false);
    });
  });
});

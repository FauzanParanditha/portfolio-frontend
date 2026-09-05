import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { isGateEnabled, proxy } from "@/proxy";
import { jwtConfig } from "@/utils/var";

const ACCESS_TOKEN_COOKIE = jwtConfig.admin.accessTokenName;

/**
 * Membuat objek tiruan `NextRequest` seminimal mungkin — hanya field yang
 * dipakai oleh `proxy`: `nextUrl` ({ pathname, search }), `url`, dan
 * `cookies.has()`. Cukup untuk menguji logika redirect tanpa server Next asli.
 */
function makeRequest(
  pathname: string,
  search: string,
  hasCookie: boolean,
): NextRequest {
  return {
    nextUrl: { pathname, search },
    url: `http://localhost:3000${pathname}${search}`,
    cookies: {
      // Hanya menandai keberadaan cookie access token admin.
      has: (name: string) => hasCookie && name === ACCESS_TOKEN_COOKIE,
    },
  } as unknown as NextRequest;
}

describe("proxy (gate presence-check admin)", () => {
  // Regresi: nama cookie HARUS sama persis dengan yang di-set backend
  // (`accessTokenCookieName = "access_token"` di auth_handler.go). Test lain
  // di berkas ini memakai konstanta yang sama untuk mock, jadi mereka tetap
  // hijau walau namanya melenceng — pengecekan literal inilah pengamannya.
  it("memakai nama cookie yang sama dengan backend", () => {
    expect(ACCESS_TOKEN_COOKIE).toBe("access_token");
  });

  // Gate bisa dimatikan untuk deploy lintas-domain, saat cookie backend memang
  // tidak pernah terkirim ke domain frontend. Salah ketik TIDAK boleh diam-diam
  // melumpuhkan gate, jadi hanya nilai "mati" yang eksplisit yang diterima.
  describe("isGateEnabled", () => {
    it("aktif secara default (env tidak di-set atau kosong)", () => {
      expect(isGateEnabled(undefined)).toBe(true);
      expect(isGateEnabled("")).toBe(true);
    });

    it("mati untuk nilai mati yang dikenal, apa pun kapitalisasinya", () => {
      for (const v of ["off", "OFF", " false ", "0", "disabled"]) {
        expect(isGateEnabled(v)).toBe(false);
      }
    });

    it("tetap aktif untuk nilai tak dikenal (mis. salah ketik)", () => {
      for (const v of ["on", "true", "1", "offf", "nonaktif"]) {
        expect(isGateEnabled(v)).toBe(true);
      }
    });
  });

  it("/admin tanpa cookie → redirect ke /auth/login dengan ?redirect=%2Fadmin", () => {
    const res = proxy(makeRequest("/admin", "", false));

    // NextResponse.redirect memakai status 307 (temporary redirect).
    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth/login");
    expect(location).toContain("redirect=%2Fadmin");
  });

  it("/admin/users?page=2 tanpa cookie → redirect memuat query ter-encode", () => {
    const res = proxy(makeRequest("/admin/users", "?page=2", false));

    expect(res.status).toBe(307);
    const location = res.headers.get("location");
    expect(location).toContain("/auth/login");
    // `pathname + search` di-encode oleh searchParams.set.
    expect(location).toContain("redirect=%2Fadmin%2Fusers%3Fpage%3D2");
  });

  it("/admin dengan cookie → diteruskan (next, bukan redirect)", () => {
    const res = proxy(makeRequest("/admin", "", true));

    // NextResponse.next() memberi status 200 tanpa header location redirect.
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("/admin/projects dengan cookie → diteruskan (next)", () => {
    const res = proxy(makeRequest("/admin/projects", "", true));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("/auth/login dengan cookie → redirect ke /admin", () => {
    const res = proxy(makeRequest("/auth/login", "", true));

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/admin");
  });

  it("/auth/login tanpa cookie → diteruskan (next)", () => {
    const res = proxy(makeRequest("/auth/login", "", false));

    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });
});

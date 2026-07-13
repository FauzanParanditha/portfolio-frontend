import type { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "@/proxy";
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

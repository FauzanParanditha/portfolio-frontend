import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtConfig } from "@/utils/var";

/**
 * Proxy (dulu "middleware") proteksi route admin (gate UX presence-check).
 *
 * PENTING: ini BUKAN pengganti keamanan backend.
 * - Proxy berjalan di server sehingga BISA membaca cookie HttpOnly admin
 *   (`_aPDsbTkn` via `jwtConfig.admin.accessTokenName`); JS di browser tidak
 *   bisa membacanya — itu memang disengaja.
 * - Namun proxy TIDAK memverifikasi tanda tangan JWT: secret hanya milik
 *   backend. Jadi ini hanya cek KEHADIRAN cookie untuk mencegah flash konten
 *   admin dan mengarahkan user yang belum login.
 * - Keamanan sesungguhnya tetap di backend: `RequireRole("admin")` pada tiap
 *   endpoint `/admin/*` + validasi via panggilan `/me`. `AdminGuard` client-side
 *   tetap dipertahankan sebagai lapis kedua.
 *
 * Catatan: Next.js 16 mengganti konvensi `middleware` menjadi `proxy`
 * (nama file `proxy.ts` + fungsi `proxy`). API NextResponse/matcher identik.
 */

// Nama cookie access token diambil dari konstanta, jangan di-hardcode.
const ACCESS_TOKEN_COOKIE = jwtConfig.admin.accessTokenName;

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  // Presence-check: cukup cek keberadaan cookie, tidak membaca/verifikasi isinya.
  const hasToken = request.cookies.has(ACCESS_TOKEN_COOKIE);

  // Belum "login" tapi mencoba masuk area admin → arahkan ke halaman login.
  if (pathname.startsWith("/admin") && !hasToken) {
    const loginUrl = new URL("/auth/login", request.url);
    // Simpan path asal + query string agar bisa kembali persis setelah login
    // (mis. `/admin/users?page=2` tidak kehilangan `?page=2`).
    loginUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // Sudah punya cookie tapi membuka halaman login → langsung ke dashboard admin.
  // Presence-check saja; bila token ternyata invalid, backend + AdminGuard yang menolak.
  if (pathname === "/auth/login" && hasToken) {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Batasi hanya ke route yang relevan; jangan tangkap aset statis/_next.
  matcher: ["/admin/:path*", "/auth/login"],
};

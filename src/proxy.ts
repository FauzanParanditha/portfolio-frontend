import { jwtConfig } from "@/utils/var";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Proxy (dulu "middleware") proteksi route admin (gate UX presence-check).
 *
 * PENTING: ini BUKAN pengganti keamanan backend.
 * - Proxy berjalan di server sehingga BISA membaca cookie HttpOnly admin
 *   (`access_token` via `jwtConfig.admin.accessTokenName`, harus identik dengan
 *   nama cookie yang di-set backend); JS di browser tidak bisa membacanya — itu
 *   memang disengaja.
 * - Namun proxy TIDAK memverifikasi tanda tangan JWT: secret hanya milik
 *   backend. Jadi ini hanya cek KEHADIRAN cookie untuk mencegah flash konten
 *   admin dan mengarahkan user yang belum login.
 * - Keamanan sesungguhnya tetap di backend: `RequireRole("admin")` pada tiap
 *   endpoint `/admin/*` + validasi via panggilan `/me`. `AdminGuard` client-side
 *   tetap dipertahankan sebagai lapis kedua.
 *
 * BATAS PENTING (deploy lintas-domain): gate ini hanya melihat cookie yang
 * dikirim browser ke domain FRONTEND. Bila backend berada di domain/subdomain
 * lain dan cookie-nya host-only (mis. FE `example.com`, BE `api.example.com`
 * tanpa `COOKIE_DOMAIN`), cookie TIDAK akan pernah terlihat di sini dan setiap
 * kunjungan ke /admin dilempar ke login. Untuk topologi seperti itu, matikan
 * gate lewat `ADMIN_PROXY_GATE=off` dan andalkan `AdminGuard` + backend.
 * Catatan: proxy berjalan di Edge runtime sehingga nilai env ini di-inline
 * saat BUILD — set sebelum `pnpm build`, bukan hanya saat runtime.
 * Lihat docs/DEPLOYMENT.md di repo backend.
 *
 * Catatan: Next.js 16 mengganti konvensi `middleware` menjadi `proxy`
 * (nama file `proxy.ts` + fungsi `proxy`). API NextResponse/matcher identik.
 */

// Nama cookie access token diambil dari konstanta, jangan di-hardcode.
const ACCESS_TOKEN_COOKIE = jwtConfig.admin.accessTokenName;

/**
 * Gate aktif secara default. Dimatikan hanya bila `ADMIN_PROXY_GATE` di-set ke
 * salah satu nilai "mati" — nilai lain (termasuk kosong/tak di-set) dianggap
 * aktif, supaya salah ketik tidak diam-diam melumpuhkan gate.
 */
export function isGateEnabled(
  value: string | undefined = process.env.ADMIN_PROXY_GATE,
): boolean {
  const v = value?.trim().toLowerCase();
  return !(v === "off" || v === "false" || v === "0" || v === "disabled");
}

export function proxy(request: NextRequest) {
  // Gate dimatikan: seluruh routing admin diserahkan ke AdminGuard + backend.
  if (!isGateEnabled()) {
    return NextResponse.next();
  }

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
  // Halaman forgot/reset password sengaja TIDAK di-gate: user yang lupa
  // password justru sedang tidak punya sesi.
  matcher: ["/admin/:path*", "/auth/login"],
};

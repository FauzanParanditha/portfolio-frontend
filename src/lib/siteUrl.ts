/**
 * Mengembalikan base URL situs (untuk metadataBase, canonical, OG url, sitemap, robots).
 *
 * Sumber: env `NEXT_PUBLIC_SITE_URL`. Bila tidak diset, fallback ke
 * `http://localhost:3000` supaya build/dev tetap jalan tanpa konfigurasi.
 * Trailing slash selalu dibuang agar penggabungan path konsisten.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/**
 * Menggabungkan sebuah path ke base URL situs dengan aman (tanpa dobel slash).
 * Contoh: absoluteUrl("/projects") -> "https://domain.com/projects".
 */
export function absoluteUrl(path = "/"): string {
  const base = getSiteUrl();
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean}`;
}

/**
 * Guard anti open-redirect untuk nilai `?redirect`.
 *
 * Hanya menerima path internal yang aman: harus diawali TEPAT satu `/`
 * (bukan `//` atau `/\` yang bisa diartikan protocol-relative URL), dan
 * TIDAK boleh mengandung skema (`://`) maupun backslash (`\`).
 *
 * Bila nilai tidak valid, kembalikan `fallback` (default `/admin`) sehingga
 * penyerang tidak bisa mengarahkan user ke domain luar via parameter redirect.
 */
export function sanitizeInternalPath(
  value: string | null | undefined,
  fallback = "/admin",
): string {
  if (!value) return fallback;

  // Wajib diawali satu slash, dan karakter kedua bukan `/` atau `\`
  // (menutup celah `//evil.com` dan `/\evil.com`).
  if (value[0] !== "/" || value[1] === "/" || value[1] === "\\") {
    return fallback;
  }

  // Tolak skema absolut (`http://`, `javascript:` via `://`) dan backslash.
  if (value.includes("://") || value.includes("\\")) {
    return fallback;
  }

  return value;
}

/**
 * Alamat API untuk `fetch` DI SISI SERVER (render halaman, sitemap).
 *
 * `NEXT_PUBLIC_API_URL` adalah alamat API dari sisi BROWSER. Server Next.js
 * tidak selalu bisa memakai alamat yang sama: di dalam kontainer, alamat publik
 * bisa tidak terjangkau (API hanya diikat ke 127.0.0.1 server), dan pada deploy
 * satu-origin nilainya path relatif (`/api/v1`) yang tidak bisa di-fetch dari
 * server sama sekali.
 *
 * Karena itu `API_INTERNAL_URL` didahulukan bila diisi. Ia dibaca saat RUNTIME
 * (bukan `NEXT_PUBLIC_`, jadi tidak ikut ke bundel peramban dan boleh diubah
 * tanpa build ulang). Sama seperti alamat publiknya, nilainya sudah termasuk
 * prefix `/api/v1`.
 *
 * Kedua env sengaja diakses lewat `process.env.NAMA` literal: hanya bentuk itu
 * yang diganti Next.js dengan nilai saat build untuk `NEXT_PUBLIC_*`.
 */
export function serverApiBase(
  internal: string | undefined = process.env.API_INTERNAL_URL,
  publik: string | undefined = process.env.NEXT_PUBLIC_API_URL,
): string | null {
  const base = internal?.trim() || publik?.trim();
  if (!base) return null;
  // Path relatif tidak punya host: fetch di server akan melempar. Lebih baik
  // dianggap "tidak ada" sehingga pemanggil melewati datanya dengan tenang.
  if (!/^https?:\/\//i.test(base)) return null;
  return base.replace(/\/+$/, "");
}

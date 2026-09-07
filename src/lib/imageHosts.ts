/**
 * Daftar host gambar yang boleh dioptimasi `next/image` — SATU sumber kebenaran
 * untuk dua tempat yang harus sepakat:
 *
 *   1. `next.config.ts` → `images.remotePatterns` (izin di sisi build/server)
 *   2. komponen yang merender gambar (memutuskan `unoptimized` per gambar)
 *
 * Kalau keduanya melenceng, akibatnya fatal dan tidak kelihatan saat build:
 * `next/image` MELEMPAR saat render bila host-nya tidak terdaftar. Itulah
 * alasan kode lama memasang `unoptimized` di semua tempat — cara itu memang
 * mencegah error, tapi sekaligus mematikan seluruh optimasi gambar.
 *
 * Pendekatan sekarang: optimasi untuk host yang dikenal, dan turun anggun ke
 * `unoptimized` untuk host lain. URL gambar proyek diisi manual lewat panel
 * admin, jadi bisa menunjuk ke mana saja — halaman tidak boleh rusak karenanya.
 *
 * Berkas ini sengaja tidak mengimpor apa pun (termasuk alias `@/`) supaya aman
 * dimuat dari `next.config.ts`.
 */

export interface ImageHostPattern {
  protocol: "http" | "https";
  hostname: string;
  port?: string;
  pathname?: string;
}

/** Host gambar pihak ketiga yang sengaja diizinkan. */
const STATIC_HOSTS: ImageHostPattern[] = [
  { protocol: "https", hostname: "images.unsplash.com" },
];

/**
 * Host backend sendiri, diturunkan dari NEXT_PUBLIC_API_URL. Berkas yang
 * diunggah lewat panel admin dilayani dari `/uploads/*`, jadi izinnya dibatasi
 * ke path itu saja — bukan seluruh domain.
 */
function backendHost(): ImageHostPattern | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;

  try {
    const url = new URL(raw);
    const protocol = url.protocol.replace(":", "");
    if (protocol !== "http" && protocol !== "https") return null;

    return {
      protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      pathname: "/uploads/**",
    };
  } catch {
    // NEXT_PUBLIC_API_URL bisa berupa path relatif (mis. "/api/v1") saat
    // deploy satu-origin di balik reverse proxy. Gambarnya kalau begitu
    // same-origin dan tidak butuh remotePattern sama sekali.
    return null;
  }
}

/** Dipakai `next.config.ts` sebagai `images.remotePatterns`. */
export function imageRemotePatterns(): ImageHostPattern[] {
  const backend = backendHost();
  return backend ? [...STATIC_HOSTS, backend] : [...STATIC_HOSTS];
}

/**
 * True bila `src` boleh dilewatkan ke optimizer `next/image`.
 *
 * URL relatif selalu boleh: itu berkas milik aplikasi sendiri.
 */
export function canOptimizeImage(src: string): boolean {
  const value = src.trim();
  if (!value) return false;
  if (value.startsWith("/")) return true;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }

  return imageRemotePatterns().some((pattern) => {
    if (pattern.hostname !== url.hostname) return false;
    if (`${pattern.protocol}:` !== url.protocol) return false;
    if ((pattern.port ?? "") !== url.port) return false;

    // Hanya pola sederhana yang dipakai di sini: "/uploads/**" atau tanpa path.
    if (pattern.pathname) {
      const prefix = pattern.pathname.replace(/\*+$/, "");
      if (!url.pathname.startsWith(prefix)) return false;
    }

    return true;
  });
}

/**
 * Penyaring URL yang berasal dari data API sebelum dipasang ke `href`/`src`.
 *
 * Latar belakang: validator backend dulu menerima skema apa pun untuk
 * `repoUrl`, `demoUrl`, `coverImageUrl`, dan screenshot — termasuk
 * `javascript:` dan `data:`. Backend sedang diperketat, tapi data lama di DB
 * bisa saja sudah berisi nilai berbahaya, jadi frontend wajib defensif sendiri:
 * `<a href="javascript:...">` dieksekusi browser saat diklik (XSS).
 *
 * Pemeriksaan memakai parser `URL` milik platform — parser yang sama yang
 * dipakai browser untuk menafsirkan `href`. Mencocokkan string secara manual
 * (mis. `startsWith("http")`) rawan dikelabui variasi seperti `JaVaScRiPt:`,
 * spasi/tab di depan, atau karakter kontrol di tengah skema; parser `URL`
 * menormalkan semua itu lebih dulu, sehingga yang kita periksa adalah skema
 * yang benar-benar akan dijalankan browser.
 *
 * Berkas ini murni (tanpa impor) supaya bisa dipakai di komponen server
 * maupun klien.
 */

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

/** Origin tiruan untuk memeriksa path relatif (domain `.invalid` dicadangkan RFC 2606). */
const RELATIVE_BASE = "http://relative.invalid";

/**
 * True bila `value` adalah URL absolut ber-skema `http:`/`https:` dengan host
 * tidak kosong. Nilai non-string, string kosong, URL relatif, dan skema lain
 * (`javascript:`, `data:`, `vbscript:`, `mailto:`, dst.) ditolak.
 */
export function isSafeHttpUrl(value: unknown): value is string {
  return safeHttpUrl(value) !== null;
}

/**
 * Versi yang mengembalikan nilai siap pakai: URL yang sudah di-trim bila aman,
 * atau `null` bila tidak. Pemanggil cukup merender elemennya bila hasilnya
 * bukan `null` — sama seperti saat nilainya kosong.
 */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    // Tanpa base URL: input relatif ("/foo", "github.com/x") melempar dan
    // otomatis ditolak.
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
  if (!url.hostname) return null;

  return trimmed;
}

/**
 * Penyaring untuk `src` gambar dari data API.
 *
 * Lebih longgar dari `safeHttpUrl` dalam satu hal: path root-relative
 * (`/uploads/x.png`) juga diterima. Backend menyimpan URL unggahan sebagai
 * `PUBLIC_BASE_URL + /uploads/...`, dan bila base URL dikosongkan (deploy
 * satu-origin di balik reverse proxy) hasilnya berupa path relatif — gambar itu
 * milik origin sendiri dan aman.
 *
 * Protocol-relative (`//evil.com/x.png`) dan path ber-backslash tetap ditolak
 * karena browser bisa menafsirkannya sebagai host lain.
 */
export function safeImageSrc(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/")) {
    // Jangan cukup cek karakter kedua: parser URL membuang tab/newline, jadi
    // "/\t/evil.com" berubah jadi "//evil.com". Resolusikan terhadap origin
    // tiruan lalu pastikan origin-nya tidak berpindah.
    if (trimmed.includes("\\")) return null;
    try {
      const resolved = new URL(trimmed, RELATIVE_BASE);
      return resolved.origin === RELATIVE_BASE ? trimmed : null;
    } catch {
      return null;
    }
  }

  return safeHttpUrl(trimmed);
}

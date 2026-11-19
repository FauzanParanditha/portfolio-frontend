/**
 * Teks profil yang tampil di lebih dari satu tempat (beranda dan tur ruang
 * server). Satu sumber, supaya kedua tampilan tidak pernah berbeda isi.
 */

export const PROFILE = {
  name: "Fauzan Paranditha",
  role: "Fullstack programmer",
  /** Headline hero, dipecah per baris seperti tampil di beranda. */
  headlineLines: [
    "Building reliable web",
    "applications with clean",
    "architecture, strong",
    "performance, and real impact.",
  ],
  about:
    "With over 5 years of experience in fullstack development, I build web applications that stay maintainable as they grow. I work across the stack — Go APIs, PostgreSQL, and Next.js interfaces — and care about clean architecture, versioned migrations, and tests that make refactoring safe.",
  /** Angka kredibilitas di kartu hero. */
  stats: [
    { value: "5+", label: "Years" },
    { value: "Go·TS", label: "Core stack" },
    { value: "76%", label: "Handler tests" },
  ],
  githubUrl: "https://github.com/FauzanParanditha",
  linkedinUrl: "https://www.linkedin.com/in/paranditha/",
} as const;

export const HEADLINE = PROFILE.headlineLines.join(" ");

/**
 * URL CV. Diambil dari env supaya berkasnya bisa diganti tanpa menyentuh kode
 * — dan supaya tombolnya TIDAK tampil bila berkasnya belum ada, alih-alih
 * mengirim recruiter ke halaman 404.
 *
 * Isi `NEXT_PUBLIC_CV_URL` di `.env.local`, mis. `/cv/fauzan-paranditha.pdf`
 * setelah menaruh berkasnya di `public/cv/`.
 */
export const CV_URL = process.env.NEXT_PUBLIC_CV_URL;

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

/** Satu cara menghubungi langsung, di luar form: surel, WhatsApp, lokasi. */
export interface ContactChannel {
  title: string;
  value: string;
  /** Tanpa `href` = hanya keterangan (lokasi). */
  href?: string;
}

/**
 * Susun kanal kontak dari nilai env. Nilai kosong diperlakukan sama dengan
 * tidak diisi (`.env` sering memuat `KUNCI=` tanpa nilai): surel dan lokasi
 * jatuh ke bawaannya, WhatsApp tidak ditampilkan.
 */
export function contactChannels(env: {
  email?: string;
  phone?: string;
  location?: string;
}): ContactChannel[] {
  const email = env.email?.trim() || "paranditha@gmail.com";
  const phone = env.phone?.trim();
  const location = env.location?.trim() || "Tangerang Selatan, ID";
  // wa.me hanya menerima angka; nomor tanpa satu angka pun bukan nomor.
  const digits = phone?.replace(/\D/g, "") ?? "";
  return [
    { title: "Email", value: email, href: `mailto:${email}` },
    ...(phone && digits
      ? [{ title: "WhatsApp", value: phone, href: `https://wa.me/${digits}` }]
      : []),
    { title: "Location", value: location },
  ];
}

/** Kanal kontak situs ini. Nama env ditulis utuh supaya di-inline saat build. */
export const CONTACT_CHANNELS = contactChannels({
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  phone: process.env.NEXT_PUBLIC_CONTACT_PHONE,
  location: process.env.NEXT_PUBLIC_CONTACT_LOCATION,
});

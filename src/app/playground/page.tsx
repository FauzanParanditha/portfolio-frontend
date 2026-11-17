import { PlaygroundShell } from "@/components/playground/PlaygroundShell";
import { MAX_STATIONS, toPlaygroundProject } from "@/lib/playground/layout";
import { getProjectsPage } from "@/lib/server/portfolio";
import type { Metadata } from "next";

/**
 * /playground — "Server Room": ruang server 3D tempat tiap rak adalah satu
 * proyek. Halaman opsional; portfolio biasa tidak bergantung padanya.
 *
 * Komponen SERVER: daftar proyek diambil di sini supaya daftar rak (tautan
 * asli ke /projects/[slug]) sudah ada di HTML pertama. Kanvas 3D baru dimuat
 * di browser oleh PlaygroundShell.
 */

// Sama dengan beranda: data proyek jarang berubah.
export const revalidate = 300;

const title = "Server Room";
const description =
  "Walk a robot dog through a 3D server room where every rack is one of my projects.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/playground" },
  // Tanpa ini pratinjau tautan /playground mewarisi judul & URL beranda.
  // Metadata digabung dangkal: `openGraph`/`twitter` di sini MENGGANTI milik
  // root layout seluruhnya, jadi field yang ingin dipertahankan diulang.
  openGraph: {
    type: "website",
    siteName: "Paranditha",
    locale: "id_ID",
    title,
    description,
    url: "/playground",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: title }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    creator: "@paranditha",
    images: ["/opengraph-image"],
  },
};

export default async function PlaygroundPage() {
  // Satu lebih banyak dari kapasitas rak: cukup untuk tahu ada "sisanya".
  const { projects, total } = await getProjectsPage({
    page: 1,
    limit: MAX_STATIONS + 1,
  });

  return (
    <main>
      <PlaygroundShell
        // Proyek ke-25 hanya dipakai untuk mendeteksi "ada sisanya"; yang
        // dikirim ke browser cukup sebanyak rak.
        projects={projects.slice(0, MAX_STATIONS).map(toPlaygroundProject)}
        // `total` dari meta API bisa cacat (bukan angka); jangan sampai NaN
        // menghilangkan rak arsip.
        total={
          Number.isFinite(total)
            ? Math.max(total, projects.length)
            : projects.length
        }
      />
    </main>
  );
}

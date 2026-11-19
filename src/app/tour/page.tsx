import { TourShell } from "@/components/tour/TourShell";
import {
  MAX_STATIONS,
  toPlaygroundExperience,
  toPlaygroundProject,
} from "@/lib/playground/layout";
import {
  getExperiences,
  getFeaturedProjects,
  getProjectsPage,
  getTags,
} from "@/lib/server/portfolio";
import { groupSkills } from "@/lib/skills";
import type { Metadata } from "next";

/**
 * /tour — pratinjau beranda versi "tur ruang server".
 *
 * Isi yang sama dengan beranda (profil, keahlian, proyek, pengalaman, kontak)
 * ditambah status API live, disajikan sebagai kartu yang digulir dengan ruang
 * server 3D di belakangnya. Komponen SERVER: semua data diambil di sini, jadi
 * HTML pertama sudah lengkap tanpa menunggu JavaScript.
 *
 * Masih pratinjau: `noindex`, supaya mesin pencari tidak melihat dua halaman
 * berisi sama. Canonical-nya ke diri sendiri — `noindex` bersama canonical ke
 * halaman LAIN adalah dua sinyal yang bertentangan. Keputusan menukar beranda diambil
 * setelah pengukuran di perangkat sungguhan (lihat docs/TOUR.md).
 */

// Sama dengan beranda: data portfolio jarang berubah.
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Server Room Tour",
  description:
    "Scroll through a 3D server room: projects, experience, live API status, and contact.",
  alternates: { canonical: "/tour" },
  robots: { index: false, follow: true },
};

export default async function TourPage() {
  const [{ projects, total }, featured, experiences, tags] = await Promise.all([
    // Satu lebih banyak dari kapasitas rak: cukup untuk tahu ada "sisanya".
    getProjectsPage({ page: 1, limit: MAX_STATIONS + 1 }),
    getFeaturedProjects(),
    getExperiences(),
    getTags(),
  ]);

  return (
    <TourShell
      projects={projects.slice(0, MAX_STATIONS).map(toPlaygroundProject)}
      // `total` dari meta API bisa cacat (bukan angka); jangan sampai NaN
      // menghilangkan rak arsip.
      total={
        Number.isFinite(total)
          ? Math.max(total, projects.length)
          : projects.length
      }
      featured={featured.map(toPlaygroundProject)}
      experiences={experiences.map(toPlaygroundExperience)}
      skills={groupSkills(tags)}
    />
  );
}

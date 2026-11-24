import { IntroOverlay } from "@/components/IntroOverlay";
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

/**
 * Beranda — tur ruang server. Komponen SERVER.
 *
 * Seluruh isi portfolio (profil, keahlian, proyek, pengalaman, status API,
 * kontak) disajikan sebagai kartu HTML yang digulir, dengan ruang server 3D di
 * belakangnya. Semua data diambil di sini, jadi HTML pertama sudah lengkap
 * tanpa menunggu JavaScript; kanvas hanyalah peningkatan (lihat docs/TOUR.md).
 *
 * Metadata (judul, canonical `/`, Open Graph) memakai bawaan root layout.
 * Beranda lama masih bisa dibuka di /classic selama masa pembandingan.
 */

// Data portfolio jarang berubah; segarkan tiap 5 menit.
export const revalidate = 300;

export default async function Home() {
  const [{ projects, total }, featured, experiences, tags] = await Promise.all([
    // Satu lebih banyak dari kapasitas rak: cukup untuk tahu ada "sisanya".
    getProjectsPage({ page: 1, limit: MAX_STATIONS + 1 }),
    getFeaturedProjects(),
    getExperiences(),
    getTags(),
  ]);

  return (
    <>
      {/* Lapisan pembuka: murni CSS, tidak menahan input, hilang sendiri. */}
      <IntroOverlay />
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
    </>
  );
}

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

export const metadata: Metadata = {
  title: "Server Room",
  description:
    "Walk a robot dog through a 3D server room where every rack is one of my projects.",
  alternates: { canonical: "/playground" },
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
        projects={projects.map(toPlaygroundProject)}
        total={total}
      />
    </main>
  );
}

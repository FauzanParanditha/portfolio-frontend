import { getProjectBySlug } from "@/lib/server/portfolio";
import type { Metadata } from "next";

/**
 * Metadata halaman detail proyek.
 *
 * Memakai `getProjectBySlug` yang SAMA dengan halamannya. Ini yang membuat
 * kedua pemanggilan menyatu jadi satu permintaan lewat cache `fetch` Next —
 * sebelumnya layout punya fetch sendiri dengan `revalidate: 3600` sementara
 * halaman mengambil lagi di browser, jadi satu halaman berarti dua permintaan
 * ke endpoint yang sama.
 */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  // Fallback sopan bila project tidak ditemukan / backend mati.
  if (!project?.title) {
    return {
      title: "Project",
      description:
        "Detail project dari portofolio Fauzan Paranditha — fullstack programmer.",
      alternates: { canonical: `/projects/${slug}` },
    };
  }

  const description =
    project.shortDesc?.trim() ||
    "Detail project dari portofolio Fauzan Paranditha — fullstack programmer.";

  // Pakai cover project bila ada; jika tidak, biarkan undefined agar
  // openGraph.images mewarisi OG image default dari root layout.
  const images = project.coverImageUrl
    ? [{ url: project.coverImageUrl, alt: project.title }]
    : undefined;

  return {
    title: project.title,
    description,
    alternates: { canonical: `/projects/${slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description,
      url: `/projects/${slug}`,
      ...(images ? { images } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: project.title,
      description,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
  };
}

// Layout hanya meneruskan children; seluruh isi dirender halamannya, yang kini
// juga komponen server.
export default function ProjectDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

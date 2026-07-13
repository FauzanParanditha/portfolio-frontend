import type { Metadata } from "next";

type ProjectDetail = {
  title?: string;
  shortDesc?: string;
  coverImageUrl?: string | null;
};

type ProjectDetailResponse = { data?: ProjectDetail };

/**
 * Ambil detail project by slug dari backend (server-side).
 * Dibungkus try/catch: bila gagal/404, kembalikan null agar generateMetadata
 * bisa memakai fallback yang sopan tanpa melempar error.
 */
async function fetchProject(slug: string): Promise<ProjectDetail | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;

  try {
    const res = await fetch(`${apiUrl}/projects/${slug}`, {
      // Cache 1 jam; cukup segar untuk metadata tanpa membebani backend.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;

    const json = (await res.json()) as ProjectDetailResponse;
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await fetchProject(slug);

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

// Layout server hanya meneruskan children — page client tidak diubah.
export default function ProjectDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

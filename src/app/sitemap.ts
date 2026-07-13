import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

// Regenerasi sitemap tiap 1 jam (ISR) supaya project baru ikut terdaftar.
export const revalidate = 3600;

type ProjectListItem = { slug: string };
type ProjectListResponse = { data?: ProjectListItem[] };

/**
 * Ambil daftar slug project publik dari backend untuk entri /projects/[slug].
 * Dibungkus try/catch: bila backend mati/gagal, kembalikan array kosong
 * sehingga build tetap sukses dengan hanya route statis.
 */
async function fetchProjectSlugs(): Promise<string[]> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return [];

  try {
    const res = await fetch(`${apiUrl}/projects?limit=100`, {
      // Selaras dengan revalidate sitemap.
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const json = (await res.json()) as ProjectListResponse;
    return (json.data ?? [])
      .map((p) => p.slug)
      .filter((s): s is string => typeof s === "string" && s.length > 0);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();

  // Route statis yang selalu ada.
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 1,
    },
    {
      url: `${siteUrl}/projects`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
  ];

  const slugs = await fetchProjectSlugs();
  const projectRoutes: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${siteUrl}/projects/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...projectRoutes];
}

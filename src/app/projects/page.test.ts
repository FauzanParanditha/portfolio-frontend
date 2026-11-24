import { afterEach, describe, expect, it, vi } from "vitest";

// Halaman ini komponen server async; metadata-nya diuji tanpa backend.
const mockGetUsedProjectTags = vi.fn();
vi.mock("@/lib/server/portfolio", () => ({
  getProjectsPage: vi.fn(),
  getUsedProjectTags: () => mockGetUsedProjectTags(),
}));

import { generateMetadata } from "@/app/projects/page";

const meta = (params: Record<string, string>) =>
  generateMetadata({ searchParams: Promise.resolve(params) });

describe("/projects — metadata", () => {
  afterEach(() => {
    mockGetUsedProjectTags.mockReset();
  });

  it("punya judul dan canonical sendiri (tidak mewarisi milik beranda), dan boleh diindeks", async () => {
    const result = await meta({});
    expect(result.title).toBe("Projects");
    expect(result.alternates).toEqual({ canonical: "/projects" });
    expect(result.robots).toEqual({ index: true, follow: true });
    // Tanpa filter tag, daftar tag tidak perlu diambil.
    expect(mockGetUsedProjectTags).not.toHaveBeenCalled();
  });

  it("pratinjau tautan (Open Graph, Twitter) memakai judul dan URL halaman ini, dengan gambar bawaan", async () => {
    const result = await meta({ page: "2" });
    expect(result.openGraph).toMatchObject({
      title: "Projects (page 2)",
      url: "/projects?page=2",
      siteName: "Paranditha",
      images: [{ url: "/opengraph-image", width: 1200, height: 630 }],
    });
    expect(result.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Projects (page 2)",
      images: ["/opengraph-image"],
    });
  });

  it("filter tag disahkan terhadap tag yang benar-benar dipakai", async () => {
    mockGetUsedProjectTags.mockResolvedValue(["Go", "Next.js"]);
    const known = await meta({ tag: "go" });
    expect(known.alternates).toEqual({ canonical: "/projects?tag=Go" });
    expect(known.robots).toEqual({ index: true, follow: true });

    const unknown = await meta({ tag: "tidak-ada" });
    expect(unknown.alternates).toEqual({ canonical: "/projects" });
    expect(unknown.robots).toEqual({ index: false, follow: true });
  });

  it("hasil pencarian tidak diindeks, tetapi tautannya tetap diikuti", async () => {
    const result = await meta({ q: "api" });
    expect(result.robots).toEqual({ index: false, follow: true });
    expect(result.alternates).toEqual({ canonical: "/projects" });
  });
});

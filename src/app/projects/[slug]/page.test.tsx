import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { Project } from "@/types/portfolio";

// Halaman ini komponen server async: data diambil lewat getProjectBySlug.
// Mock agar test berjalan tanpa backend/jaringan.
const mockGetProjectBySlug = vi.fn();
vi.mock("@/lib/server/portfolio", () => ({
  getProjectBySlug: (slug: string) => mockGetProjectBySlug(slug),
}));

// notFound() asli melempar error khusus Next; cukup tiru perilaku melemparnya.
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

// next/image butuh konfigurasi runtime Next; di sini cukup <img> biasa supaya
// atribut `src` yang dirender bisa diperiksa langsung.
vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
  }: Pick<ComponentProps<"img">, "alt"> & { src: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

import ProjectDetailPage from "@/app/projects/[slug]/page";

function makeProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p-1",
    slug: "proyek-uji",
    title: "Proyek Uji",
    shortDesc: "Deskripsi singkat",
    longDescription: "Deskripsi panjang",
    results: [],
    technicalDetails: {},
    isFeatured: false,
    sortOrder: 1,
    tags: [],
    features: [],
    screenshots: [],
    ...overrides,
  } as Project;
}

async function renderPage(project: Project) {
  mockGetProjectBySlug.mockResolvedValue(project);
  const ui = await ProjectDetailPage({
    params: Promise.resolve({ slug: project.slug }),
  });
  return render(ui);
}

describe("Halaman detail proyek — penyaringan URL", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("merender tombol Code & Live Demo bila URL-nya http/https", async () => {
    await renderPage(
      makeProject({
        repoUrl: "https://github.com/user/repo",
        demoUrl: "https://demo.example.com",
      }),
    );

    expect(screen.getByRole("link", { name: /code/i })).toHaveAttribute(
      "href",
      "https://github.com/user/repo",
    );
    expect(screen.getByRole("link", { name: /live demo/i })).toHaveAttribute(
      "href",
      "https://demo.example.com",
    );
  });

  it.each([
    ["javascript:", "javascript:alert(document.cookie)"],
    ["JaVaScRiPt: dengan spasi di depan", " JaVaScRiPt:alert(1)"],
    ["data:", "data:text/html,<script>alert(1)</script>"],
    ["vbscript:", "vbscript:msgbox(1)"],
  ])(
    "TIDAK merender tombol bila URL berskema %s",
    async (_label, dangerous) => {
      const { container } = await renderPage(
        makeProject({ repoUrl: dangerous, demoUrl: dangerous }),
      );

      expect(screen.queryByRole("link", { name: /code/i })).toBeNull();
      expect(screen.queryByRole("link", { name: /live demo/i })).toBeNull();
      // Pastikan tidak ada satu pun href berbahaya yang lolos ke DOM.
      const hrefs = Array.from(container.querySelectorAll("a")).map(
        (a) => a.getAttribute("href") ?? "",
      );
      expect(
        hrefs.some((h) => !h.startsWith("/") && !h.startsWith("http")),
      ).toBe(false);
    },
  );

  it("tidak merender cover & screenshot yang berskema berbahaya", async () => {
    const { container } = await renderPage(
      makeProject({
        coverImageUrl: "javascript:alert(1)",
        screenshots: [
          {
            imageUrl: "data:image/svg+xml,<svg onload=alert(1)>",
            sortOrder: 1,
          },
          { imageUrl: "https://images.unsplash.com/aman", sortOrder: 2 },
        ],
      }),
    );

    const srcs = Array.from(container.querySelectorAll("img")).map((img) =>
      img.getAttribute("src"),
    );
    expect(srcs).toEqual(["https://images.unsplash.com/aman"]);
    // Galeri tetap muncul untuk screenshot yang aman.
    expect(
      screen.getByRole("heading", { name: "Gallery" }),
    ).toBeInTheDocument();
  });
});

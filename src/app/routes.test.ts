import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

/**
 * Bentuk rute setelah beranda ditukar ke tur ruang server. Halaman-halaman ini
 * komponen server async (mengambil data, memuat next/font lewat layout) dan
 * tidak bisa dirender di jsdom, jadi yang dijaga adalah sumbernya.
 */
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("rute beranda", () => {
  it("`/` adalah tur ruang server, dengan intro pembuka, dan boleh diindeks", () => {
    const home = read("src/app/page.tsx");
    expect(home).toContain("<TourShell");
    expect(home).toContain("<IntroOverlay />");
    // Hanya canonical yang disetel di sini; judul, Open Graph, dan robots
    // diwarisi dari root layout (dulu, sebagai pratinjau /tour, halaman ini
    // ber-noindex). Menambah `openGraph`/`robots` di sini akan MENGGANTI
    // milik root layout seluruhnya.
    const metadata = home.match(
      /export const metadata: Metadata = \{([\s\S]*?)\n\};/,
    )?.[1];
    expect(metadata?.replace(/\s+/g, " ").trim()).toBe(
      'alternates: { canonical: "/" },',
    );
    expect(home).not.toMatch(/noindex|index:\s*false/);
  });

  it("`/tour` (alamat pratinjau) dialihkan ke `/`, sementara, dan halamannya sudah tidak ada", async () => {
    expect(existsSync(join(process.cwd(), "src/app/tour"))).toBe(false);
    const redirects = await nextConfig.redirects?.();
    expect(redirects).toEqual([
      { source: "/tour", destination: "/", permanent: false },
    ]);
  });

  it("beranda lama di `/classic`: noindex, canonical ke diri sendiri, di luar sitemap", () => {
    const classic = read("src/app/classic/page.tsx");
    expect(classic).toContain("<HeroSection />");
    expect(classic).toMatch(
      /robots:\s*\{\s*index:\s*false,\s*follow:\s*true\s*\}/,
    );
    expect(classic).toMatch(/canonical:\s*"\/classic"/);
    const sitemap = read("src/app/sitemap.ts");
    expect(sitemap).not.toMatch(/classic|\/tour/);
  });

  it("penanda intro dan pilihan tampilan dipasang skrip inline di <head>, bukan next/script", () => {
    // <Script beforeInteractive> baru berjalan setelah paint pertama: tata
    // letak melompat (CLS 0,146 terukur) dan intro berkedip di kunjungan kedua.
    const layout = read("src/app/layout.tsx");
    const head = layout.slice(
      layout.indexOf("<head>"),
      layout.indexOf("</head>"),
    );
    expect(head).toContain(
      "<script dangerouslySetInnerHTML={{ __html: TOUR_MODE_SCRIPT }} />",
    );
    expect(head).toContain(
      "<script dangerouslySetInnerHTML={{ __html: INTRO_SESSION_SCRIPT }} />",
    );
    expect(layout).not.toMatch(/from "next\/script"/);
    // Sebagai JSX (komentar boleh menyebut namanya).
    expect(layout).not.toMatch(/<Script\s+(id|strategy)=/);
  });
});

describe("canonical", () => {
  /** Semua `page.tsx` di bawah src/app, sebagai path relatif. */
  function pages(dir = "src/app"): string[] {
    return readdirSync(join(process.cwd(), dir), {
      withFileTypes: true,
    }).flatMap((entry) =>
      entry.isDirectory()
        ? pages(`${dir}/${entry.name}`)
        : entry.name === "page.tsx"
          ? [`${dir}/${entry.name}`]
          : [],
    );
  }
  /** Area yang dikecualikan robots.txt: tidak butuh canonical. */
  const isPrivate = (path: string) => /^src\/app\/(admin|auth)\//.test(path);

  it("root layout tidak punya canonical bawaan: halaman yang lupa menyetelnya tidak boleh mengaku duplikat beranda", () => {
    const layout = read("src/app/layout.tsx");
    const metadata = layout.slice(
      layout.indexOf("export const metadata"),
      layout.indexOf("export default function RootLayout"),
    );
    // Sebagai properti (komentar boleh menyebut namanya).
    expect(metadata).not.toMatch(/^\s*(alternates|canonical)\s*:/m);
  });

  it("tiap halaman publik menyetel canonical-nya sendiri, di halaman itu atau di layout sefoldernya", () => {
    const publicPages = pages().filter((path) => !isPrivate(path));
    // Penjaga terhadap daftar kosong (mis. struktur folder berubah).
    expect(publicPages.length).toBeGreaterThanOrEqual(5);
    const missing = publicPages.filter((path) => {
      const layoutPath = path.replace(/page\.tsx$/, "layout.tsx");
      const own = read(path);
      const sibling =
        layoutPath !== "src/app/layout.tsx" &&
        existsSync(join(process.cwd(), layoutPath))
          ? read(layoutPath)
          : "";
      return !/alternates:\s*\{\s*canonical/.test(own + sibling);
    });
    expect(missing).toEqual([]);
  });

  it("canonical beranda adalah `/`", () => {
    expect(read("src/app/page.tsx")).toMatch(
      /alternates:\s*\{\s*canonical:\s*"\/"\s*\}/,
    );
  });
});

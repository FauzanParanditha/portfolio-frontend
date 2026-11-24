import { existsSync, readFileSync } from "node:fs";
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
    // Metadata bawaan root layout: canonical `/`, index. Halaman ini tidak
    // boleh menimpanya (dulu, sebagai pratinjau /tour, ia ber-noindex).
    expect(home).not.toMatch(/export const metadata/);
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

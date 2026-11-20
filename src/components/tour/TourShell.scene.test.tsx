import {
  act,
  render as rtlRender,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactElement, useEffect } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { TourCanvasProps } from "@/components/tour/TourCanvas";
import type {
  PlaygroundExperience,
  PlaygroundProject,
} from "@/lib/playground/layout";

/**
 * Jalur "3D tersedia": kanvas diganti tiruan yang merekam props-nya, supaya
 * kontrak TourShell ↔ scene (posisi gulir, sorotan rak, ganti tampilan, jeda)
 * teruji tanpa WebGL.
 */
const scene = vi.hoisted(() => ({
  props: null as TourCanvasProps | null,
  mounts: 0,
  crash: false,
  /** Bila diisi, `onReady` diserahkan ke sini alih-alih langsung dipanggil. */
  holdReady: null as ((ready: () => void) => void) | null,
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function SceneStub(props: TourCanvasProps) {
      if (scene.crash) throw new Error("konteks WebGL ditolak");
      scene.props = props;
      const { onReady } = props;
      useEffect(() => {
        scene.mounts++;
        if (scene.holdReady) scene.holdReady(onReady);
        else onReady();
      }, [onReady]);
      return <div data-testid="scene" />;
    },
}));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
// Hook status tetap yang asli; argumennya direkam untuk memeriksa kapan tur
// meminta pemeriksaan (dan kapan memintanya lebih sering).
const healthArgs = vi.hoisted(() => ({
  last: null as [boolean, boolean] | null,
}));
vi.mock("@/hooks/use-backend-health", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/hooks/use-backend-health")>();
  return {
    ...actual,
    useBackendHealth: (fast: boolean, enabled = true) => {
      healthArgs.last = [fast, enabled];
      return actual.useBackendHealth(fast, enabled);
    },
  };
});
vi.mock("@/lib/axios/public", () => ({ default: { post: vi.fn() } }));

import { AUTO_3D_QUERY, TourShell } from "@/components/tour/TourShell";
import { resetTourModeForTest } from "@/lib/tour/mode";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToString } from "react-dom/server";

function render(ui: ReactElement) {
  return rtlRender(
    <SWRConfig value={{ provider: () => new Map() }}>{ui}</SWRConfig>,
  );
}

function project(n: number): PlaygroundProject {
  return {
    id: `id-${n}`,
    title: `Project ${n}`,
    slug: `project-${n}`,
    shortDesc: `Description ${n}`,
    tags: [],
  };
}
const experiences: PlaygroundExperience[] = [
  {
    id: "exp-1",
    title: "Role 1",
    company: "Company 1",
    location: "Jakarta",
    startDate: "2022",
    isCurrent: true,
    description: "Did things",
    tags: [],
    highlights: [],
  },
];
const base = {
  projects: [project(1), project(2), project(3)],
  total: 3,
  featured: [project(2), project(9)],
  experiences,
  skills: [],
};

const API = "http://api.test/api/v1";
const VIEWPORT = 800;
/** Tinggi tiap bagian (px); bisa diubah per test untuk bagian yang tinggi. */
let heights: number[] = [];
const rootMode = () => document.documentElement.getAttribute("data-tour-mode");
/** Tepi atas bagian ke-`index` dalam koordinat dokumen. */
const topOf = (index: number) =>
  heights.slice(0, index).reduce((sum, height) => sum + height, 0);
let healthCalls: string[] = [];
let scrollY = 0;
/** Callback requestAnimationFrame yang menunggu "frame berikutnya". */
let frames: FrameRequestCallback[] = [];

/** Layar: lebar & tanpa permintaan pengurangan gerak, atau sebaliknya. */
function screenIs({
  wide,
  reducedMotion = false,
}: {
  wide: boolean;
  reducedMotion?: boolean;
}) {
  vi.stubGlobal("matchMedia", (query: string): Partial<MediaQueryList> => {
    const wantsWide = query.includes("min-width: 64rem");
    const wantsMotion = query.includes("no-preference");
    const wantsReduce = query.includes("prefers-reduced-motion: reduce");
    let matches = true;
    if (wantsWide) matches &&= wide;
    if (wantsMotion) matches &&= !reducedMotion;
    if (wantsReduce) matches &&= reducedMotion;
    return {
      matches,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  });
}

/** Gulir ke posisi `y` (px) lalu jalankan frame yang dijadwalkan. */
function scrollToY(y: number) {
  scrollY = y;
  flushScroll();
}

/**
 * Gulir sampai titik tengah layar berada di tengah bagian ke-`stop` (pecahan
 * boleh). Hanya untuk tata letak seragam (semua bagian setinggi layar).
 */
function scrollToStop(stop: number) {
  scrollY = stop * VIEWPORT + VIEWPORT / 2 - VIEWPORT / 2;
  flushScroll();
}

function flushScroll() {
  act(() => {
    window.dispatchEvent(new Event("scroll"));
    // Jalankan frame yang dijadwalkan penangan gulir.
    const pending = frames;
    frames = [];
    for (const callback of pending) callback(0);
  });
}

describe("TourShell (3D tersedia)", () => {
  beforeEach(() => {
    resetTourModeForTest();
    scene.props = null;
    scene.mounts = 0;
    scene.crash = false;
    scene.holdReady = null;
    healthCalls = [];
    scrollY = 0;
    heights = Array.from({ length: 6 }, () => VIEWPORT);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => null,
    } as never);
    // Tata letak tiruan: tiap bagian setinggi 800 px, bertumpuk dari atas.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const stops = [...document.querySelectorAll(".tour-stop")];
        const index = stops.indexOf(this);
        const top = index === -1 ? 0 : topOf(index) - scrollY;
        const height = index === -1 ? 0 : (heights[index] ?? VIEWPORT);
        return {
          top,
          height,
          bottom: top + height,
          left: 0,
          right: 0,
          width: 0,
          x: 0,
          y: top,
          toJSON: () => ({}),
        };
      },
    );
    vi.spyOn(window, "scrollY", "get").mockImplementation(() => scrollY);
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(VIEWPORT);
    // Seperti browser: callback baru jalan di "frame berikutnya", bukan seketika.
    frames = [];
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      frames.push(callback);
      return frames.length;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {
      frames = [];
    });
    vi.stubEnv("NEXT_PUBLIC_API_URL", API);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        healthCalls.push(url);
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              data: { status: url.endsWith("/healthz") ? "ok" : "ready" },
            }),
        });
      }),
    );
    screenIs({ wide: true });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("layar lebar: scene terpasang di belakang kartu, tidak menerima input, tersembunyi dari pembaca layar", async () => {
    const { container } = render(<TourShell {...base} />);
    const stub = await screen.findByTestId("scene");
    const layer = stub.parentElement as HTMLElement;
    expect(layer).toHaveAttribute("aria-hidden", "true");
    expect(layer.className).toMatch(/pointer-events-none/);
    expect(layer.className).toMatch(/\bfixed\b/);
    // Bawaan dari CSS: tidak ada atribut pemaksa, di .tour maupun di <html>.
    expect(container.querySelector(".tour")).not.toHaveAttribute("data-mode");
    expect(rootMode()).toBeNull();
    // Lapisan sudah terlihat setelah scene melapor siap.
    expect(layer.className).toMatch(/\bopacity-100\b/);
    expect(scene.props?.tour.stops.map((s) => s.id)).toEqual([
      "top",
      "about",
      "projects",
      "experience",
      "status",
      "contact",
    ]);
    expect(screen.getByText(/Scroll to walk/i)).toHaveClass("tour-only-3d");
  });

  it("menggulir memindahkan posisi tur dan menandai perhentian aktif", async () => {
    render(<TourShell {...base} />);
    await screen.findByTestId("scene");
    const rail = screen.getByRole("navigation", { name: "Tour stops" });
    const current = () =>
      within(rail)
        .getAllByRole("link")
        .filter((a) => a.getAttribute("aria-current") === "location")
        .map((a) => a.textContent);

    expect(scene.props?.progressRef.current).toBe(0);
    expect(current()).toEqual(["01Lobby"]);

    scrollToStop(2);
    expect(scene.props?.progressRef.current).toBeCloseTo(2);
    expect(current()).toEqual(["03Projects"]);

    // Di tengah jalan: posisi pecahan diteruskan apa adanya ke scene.
    scrollToStop(2.25);
    expect(scene.props?.progressRef.current).toBeCloseTo(2.25);
    expect(current()).toEqual(["03Projects"]);

    // Lewat setengah jalan: perhentian aktif = yang TERDEKAT, bukan yang
    // terakhir dilewati.
    scrollToStop(2.75);
    expect(scene.props?.progressRef.current).toBeCloseTo(2.75);
    expect(current()).toEqual(["04Experience"]);

    scrollToStop(99);
    expect(scene.props?.progressRef.current).toBe(5);
    expect(current()).toEqual(["06Contact"]);
  });

  it("halaman dimuat dalam keadaan sudah tergulir (kembali dari halaman lain): posisi tur langsung benar", async () => {
    scrollY = 3 * VIEWPORT;
    render(<TourShell {...base} />);
    await screen.findByTestId("scene");
    // Pengukuran memakai koordinat dokumen (rect.top + scrollY), jadi tidak
    // bergantung pada posisi gulir saat diukur.
    expect(scene.props?.progressRef.current).toBeCloseTo(3);
    const rail = screen.getByRole("navigation", { name: "Tour stops" });
    expect(
      within(rail).getByRole("link", { name: /Experience/ }),
    ).toHaveAttribute("aria-current", "location");
  });

  it("bagian lebih tinggi dari 3 layar: lompat ke jangkarnya mengaktifkan perhentian itu, dan tetap di sana selama dibaca", async () => {
    // Daftar pengalaman yang panjang: bagian ke-3 setinggi 4 layar.
    heights = [800, 800, 800, 3200, 800, 800];
    render(<TourShell {...base} />);
    await screen.findByTestId("scene");
    const rail = screen.getByRole("navigation", { name: "Tour stops" });
    const experience = within(rail).getByRole("link", { name: /Experience/ });

    // Klik rel = tepi atas bagian di atas layar.
    scrollToY(topOf(3));
    expect(scene.props?.progressRef.current).toBe(3);
    expect(experience).toHaveAttribute("aria-current", "location");

    // Di tengah dan di ujung kartu: kamera diam di perhentian itu.
    scrollToY(topOf(3) + 1200);
    expect(scene.props?.progressRef.current).toBe(3);
    scrollToY(topOf(3) + 3200 - VIEWPORT);
    expect(scene.props?.progressRef.current).toBe(3);

    // Baru bergerak setelah kartu habis.
    scrollToY(topOf(3) + 3200 - VIEWPORT + 400);
    expect(scene.props?.progressRef.current).toBeCloseTo(3.5);
  });

  it("tinggi bagian berubah (data tiba, jendela diubah): diukur ulang saat resize", async () => {
    render(<TourShell {...base} />);
    await screen.findByTestId("scene");
    scrollToY(2 * VIEWPORT);
    expect(scene.props?.progressRef.current).toBeCloseTo(2);

    // Bagian pertama menjadi dua kali lebih tinggi; posisi gulir sama.
    heights = [1600, 800, 800, 800, 800, 800];
    act(() => {
      window.dispatchEvent(new Event("resize"));
    });
    expect(scene.props?.progressRef.current).toBeCloseTo(1);
  });

  it("setelah dilepas, tidak ada penangan gulir/resize maupun frame tertunda yang tertinggal", async () => {
    const remove = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<TourShell {...base} />);
    await screen.findByTestId("scene");

    // Gulir tepat sebelum halaman ditinggalkan: satu frame masih menunggu.
    scrollY = 999;
    window.dispatchEvent(new Event("scroll"));
    expect(frames).toHaveLength(1);

    unmount();
    // Frame itu dibatalkan, tidak berjalan pada pohon yang sudah dilepas.
    expect(frames).toEqual([]);
    const removed = remove.mock.calls.map(([type]) => type);
    expect(removed).toContain("scroll");
    expect(removed).toContain("resize");
    window.dispatchEvent(new Event("scroll"));
    expect(frames).toEqual([]);
  });

  it("status baru diperiksa saat pengunjung mendekati kartunya", async () => {
    render(<TourShell {...base} />);
    await screen.findByTestId("scene");
    scrollToStop(2);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(healthCalls).toEqual([]);

    // Satu perhentian sebelum "status": mulai memeriksa, monitor ikut terisi.
    scrollToStop(3);
    await waitFor(() =>
      expect(scene.props?.health?.overall).toBe("operational"),
    );
    expect(healthCalls).toEqual([`${API}/healthz`, `${API}/readyz`]);

    scrollToStop(4);
    const card = document.getElementById("status") as HTMLElement;
    expect(within(card).getByRole("status")).toHaveTextContent("Operational");
  });

  it("pemeriksaan cepat hanya selama kartu status yang sedang dibaca", async () => {
    render(<TourShell {...base} />);
    await screen.findByTestId("scene");
    // [cepat, aktif] per perhentian: lobi … kontak.
    const seen: Array<[boolean, boolean] | null> = [];
    for (const stop of [0, 2, 3, 4, 5]) {
      scrollToStop(stop);
      seen.push(healthArgs.last);
    }
    expect(seen).toEqual([
      [false, false],
      [false, false],
      [false, true],
      [true, true],
      [false, true],
    ]);
  });

  it("menunjuk proyek di kartu menyorot raknya; proyek tanpa rak tidak menyorot apa pun", async () => {
    const user = userEvent.setup();
    render(<TourShell {...base} />);
    await screen.findByTestId("scene");
    expect(scene.props?.highlightedSlot).toBeNull();

    await user.hover(screen.getByRole("link", { name: /Project 2/ }));
    expect(scene.props?.highlightedSlot).toBe(1);
    await user.unhover(screen.getByRole("link", { name: /Project 2/ }));
    expect(scene.props?.highlightedSlot).toBeNull();

    // Fokus keyboard menyorot sama seperti mouse.
    act(() => screen.getByRole("link", { name: /Project 2/ }).focus());
    expect(scene.props?.highlightedSlot).toBe(1);
    act(() => screen.getByRole("link", { name: /Project 9/ }).focus());
    expect(scene.props?.highlightedSlot).toBeNull();
  });

  it("tombol 'Simple version' melepas scene, memaksa tata letak ringkas, dan diingat", async () => {
    const user = userEvent.setup();
    const { container, unmount } = render(<TourShell {...base} />);
    await screen.findByTestId("scene");

    await user.click(screen.getByRole("button", { name: "Simple version" }));
    expect(screen.queryByTestId("scene")).toBeNull();
    // Pilihan pengunjung hidup di <html> (dibaca CSS, dipasang sebelum paint
    // pada kunjungan berikutnya) — bukan di .tour.
    expect(rootMode()).toBe("simple");
    expect(window.localStorage.getItem("tour-mode")).toBe("simple");
    expect(container.querySelector(".tour")).not.toHaveAttribute("data-mode");
    expect(screen.getByRole("button", { name: "3D version" })).toBeVisible();

    // Kunjungan berikutnya: pilihan masih berlaku.
    unmount();
    render(<TourShell {...base} />);
    expect(screen.queryByTestId("scene")).toBeNull();
    expect(screen.getByRole("button", { name: "3D version" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "3D version" }));
    expect(await screen.findByTestId("scene")).toBeInTheDocument();
    expect(rootMode()).toBe("3d");
  });

  it("kanvas dipasang ulang: memudar masuk lagi, tidak langsung tampil dari keadaan lama", async () => {
    const user = userEvent.setup();
    render(<TourShell {...base} />);
    await screen.findByTestId("scene");
    await user.click(screen.getByRole("button", { name: "Simple version" }));

    // Scene berikutnya tidak melapor siap: lapisannya harus tetap transparan.
    const onReadyCalls: Array<() => void> = [];
    scene.holdReady = (ready) => onReadyCalls.push(ready);
    await user.click(screen.getByRole("button", { name: "3D version" }));
    const layer = (await screen.findByTestId("scene")).parentElement!;
    expect(layer.className).toMatch(/\bopacity-0\b/);

    act(() => onReadyCalls.forEach((ready) => ready()));
    expect(layer.className).toMatch(/\bopacity-100\b/);
  });

  it("layar sempit: bawaannya tanpa 3D; pengunjung bisa menyalakannya", async () => {
    screenIs({ wide: false });
    const user = userEvent.setup();
    const { container } = render(<TourShell {...base} />);
    expect(screen.queryByTestId("scene")).toBeNull();
    expect(scene.mounts).toBe(0);
    expect(container.querySelector(".tour")).not.toHaveAttribute("data-mode");

    await user.click(screen.getByRole("button", { name: "3D version" }));
    expect(await screen.findByTestId("scene")).toBeInTheDocument();
    expect(rootMode()).toBe("3d");
    expect(container.querySelector(".tour")).not.toHaveAttribute("data-mode");
  });

  it("ponsel lanskap (lebar tapi pendek) dan tablet potret: bawaannya tanpa 3D", () => {
    // Kueri bawaan menuntut lebar DAN tinggi; tiruan ini hanya meloloskan
    // yang lebar.
    vi.stubGlobal("matchMedia", (query: string): Partial<MediaQueryList> => ({
      matches: !query.includes("min-height") && !query.includes("reduce"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(<TourShell {...base} />);
    expect(screen.queryByTestId("scene")).toBeNull();
    expect(scene.mounts).toBe(0);
  });

  it("pengunjung meminta gerak dikurangi: bawaannya tanpa 3D walau layarnya lebar", () => {
    screenIs({ wide: true, reducedMotion: true });
    render(<TourShell {...base} />);
    expect(screen.queryByTestId("scene")).toBeNull();
    expect(screen.getByRole("button", { name: "3D version" })).toBeVisible();
  });

  it("memaksa 3D dengan gerak dikurangi: scene diberi tahu supaya tidak beranimasi", async () => {
    screenIs({ wide: true, reducedMotion: true });
    const user = userEvent.setup();
    render(<TourShell {...base} />);
    await user.click(screen.getByRole("button", { name: "3D version" }));
    await screen.findByTestId("scene");
    expect(scene.props?.reducedMotion).toBe(true);
  });

  it("scene gagal dimuat: jatuh ke tata letak ringkas, isi tetap utuh, tombol ganti tampilan hilang", async () => {
    scene.crash = true;
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(<TourShell {...base} />);
    await waitFor(() =>
      expect(container.querySelector(".tour")).toHaveAttribute(
        "data-mode",
        "simple",
      ),
    );
    expect(screen.queryByTestId("scene")).toBeNull();
    expect(screen.queryByRole("button", { name: /version/i })).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });

  it("tab tersembunyi: scene dijeda dan status tidak diperiksa", async () => {
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    render(<TourShell {...base} />);
    await screen.findByTestId("scene");
    expect(scene.props?.paused).toBe(true);
    scrollToStop(4);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(healthCalls).toEqual([]);
  });

  it("kueri bawaan 3D di JavaScript sama persis dengan yang di globals.css", () => {
    const css = readFileSync(
      join(process.cwd(), "src/app/globals.css"),
      "utf8",
    );
    const media = [
      ...css.matchAll(/@media ([^{]+)\{\s*html:not\(\[data-tour-mode\]\)/g),
    ].map((match) => match[1].trim());
    expect(media).toEqual([AUTO_3D_QUERY]);
  });

  it("petunjuk gulir: tersembunyi secara bawaan, tampil hanya di tata letak 3D (ditentukan CSS)", () => {
    const css = readFileSync(
      join(process.cwd(), "src/app/globals.css"),
      "utf8",
    );
    // Bawaan: tersembunyi bersama rel.
    expect(css).toMatch(/\.tour-rail,\s*\.tour-only-3d \{\s*display: none;/);
    // Tampil di kedua jalur 3D (bawaan & pilihan pengunjung), tidak pernah
    // bila tata letak ringkas dipaksa.
    const shown = [
      ...css.matchAll(/([^{}]+)\.tour-only-3d \{\s*display: block;/g),
    ].map((match) => match[1].trim());
    expect(shown).toEqual([
      'html:not([data-tour-mode]) .tour:not([data-mode="simple"])',
      'html[data-tour-mode="3d"] .tour:not([data-mode="simple"])',
    ]);

    // Jalur bawaan harus berada DI DALAM kueri media 3D: di luar itu petunjuk
    // akan tampil di ponsel, yang tidak punya ruangan untuk dijelajahi.
    const start = css.indexOf(`@media ${AUTO_3D_QUERY}`);
    expect(start).toBeGreaterThan(-1);
    // Blok @media berakhir di "}" pertama yang berdiri di awal baris.
    const block = css.slice(start, css.indexOf("\n}", start));
    expect(block).toContain(
      'html:not([data-tour-mode]) .tour:not([data-mode="simple"]) .tour-only-3d',
    );
    expect(css.slice(0, start)).not.toMatch(
      /html:not\(\[data-tour-mode\]\)[^{]*\.tour-only-3d/,
    );
  });

  it("skrip pilihan tampilan ada di <head> root layout sebagai <script> inline biasa", () => {
    // Sumbernya yang diperiksa: root layout memuat next/font dan tidak bisa
    // dirender di jsdom. <Script beforeInteractive> baru jalan setelah paint
    // pertama (terukur CLS 0,146), jadi bentuknya dijaga di sini.
    const layout = readFileSync(
      join(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );
    const head = layout.slice(
      layout.indexOf("<head>"),
      layout.indexOf("</head>"),
    );
    expect(head).toContain(
      "<script dangerouslySetInnerHTML={{ __html: TOUR_MODE_SCRIPT }} />",
    );
    expect(layout).not.toMatch(/<Script[^>]*>\s*\{TOUR_MODE_SCRIPT\}/);
    expect(layout.indexOf("<head>")).toBeLessThan(layout.indexOf("<body"));
  });

  it("panel ukur dan scene dimuat malas, tidak diimpor langsung ke bundel awal", () => {
    const shell = readFileSync(
      join(process.cwd(), "src/components/tour/TourShell.tsx"),
      "utf8",
    );
    expect(shell).toMatch(
      /dynamic\(\(\) => import\("\.\/TourPerf"\), \{ ssr: false \}\)/,
    );
    expect(shell).toMatch(
      /dynamic\(\(\) => import\("\.\/TourCanvas"\), \{ ssr: false \}\)/,
    );
    expect(shell).not.toMatch(/^import .* from "\.\/Tour(Perf|Canvas)";/m);
  });

  it("HTML dari server: isi lengkap, tanpa atribut pemaksa, dan gaya <noscript> untuk tata letak ringkas", () => {
    const html = renderToString(
      <SWRConfig value={{ provider: () => new Map() }}>
        <TourShell {...base} />
      </SWRConfig>,
    );
    expect(html).not.toContain("data-mode=");
    expect(html.match(/class="tour-stop"/g)).toHaveLength(6);
    expect(html).toMatch(
      /<noscript><style>[^<]*\.tour \.tour-stop \{ display: block !important;/,
    );
    expect(html).toMatch(/<noscript><style>[^<]*\[data-requires-js\]/);
    // Tanpa JS tidak ada ruangan: petunjuk gulir ikut disembunyikan.
    expect(html).toMatch(
      /<noscript><style>[^<]*\.tour \.tour-only-3d \{ display: none !important;/,
    );
  });
});

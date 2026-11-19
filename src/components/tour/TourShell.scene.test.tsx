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
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function SceneStub(props: TourCanvasProps) {
      if (scene.crash) throw new Error("konteks WebGL ditolak");
      scene.props = props;
      const { onReady } = props;
      useEffect(() => {
        scene.mounts++;
        onReady();
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

import { TourShell } from "@/components/tour/TourShell";
import { resetTourModeForTest } from "@/lib/tour/mode";

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
const STOP_HEIGHT = 800;
const VIEWPORT = 800;
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
    const wantsWide = query.includes("min-width: 768px");
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

/** Gulir sampai titik tengah layar berada di tengah bagian ke-`stop` (pecahan boleh). */
function scrollToStop(stop: number) {
  scrollY = stop * STOP_HEIGHT + STOP_HEIGHT / 2 - VIEWPORT / 2;
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
    healthCalls = [];
    scrollY = 0;
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => null,
    } as never);
    // Tata letak tiruan: tiap bagian setinggi 800 px, bertumpuk dari atas.
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function (this: HTMLElement) {
        const stops = [...document.querySelectorAll(".tour-stop")];
        const index = stops.indexOf(this);
        const top = index === -1 ? 0 : index * STOP_HEIGHT - scrollY;
        const height = index === -1 ? 0 : STOP_HEIGHT;
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
    // Bawaan dari CSS: tidak ada atribut pemaksa.
    expect(container.querySelector(".tour")).not.toHaveAttribute("data-mode");
    expect(scene.props?.tour.stops.map((s) => s.id)).toEqual([
      "top",
      "about",
      "projects",
      "experience",
      "status",
      "contact",
    ]);
    expect(screen.getByText(/Scroll to walk/i)).toBeInTheDocument();
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

    scrollToStop(99);
    expect(scene.props?.progressRef.current).toBe(5);
    expect(current()).toEqual(["06Contact"]);
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
    expect(container.querySelector(".tour")).toHaveAttribute(
      "data-mode",
      "simple",
    );
    expect(screen.getByRole("button", { name: "3D version" })).toBeVisible();
    expect(screen.queryByText(/Scroll to walk/i)).toBeNull();

    // Kunjungan berikutnya: pilihan masih berlaku.
    unmount();
    render(<TourShell {...base} />);
    expect(screen.queryByTestId("scene")).toBeNull();
    expect(screen.getByRole("button", { name: "3D version" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "3D version" }));
    expect(await screen.findByTestId("scene")).toBeInTheDocument();
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
    expect(container.querySelector(".tour")).toHaveAttribute("data-mode", "3d");
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
});

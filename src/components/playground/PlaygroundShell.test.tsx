import {
  act,
  render as rtlRender,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));
// Form kontak di panel kotak surat — tidak menyentuh jaringan.
vi.mock("@/lib/axios/public", () => ({
  default: { post: vi.fn() },
}));

import { PlaygroundShell } from "@/components/playground/PlaygroundShell";
import publicClient from "@/lib/axios/public";
import {
  MAX_STATIONS,
  type PlaygroundExperience,
  type PlaygroundProject,
} from "@/lib/playground/layout";

/** Cache SWR baru tiap render, supaya status tidak bocor antar-test. */
function render(ui: ReactElement) {
  return rtlRender(
    <SWRConfig value={{ provider: () => new Map() }}>{ui}</SWRConfig>,
  );
}

// next/image butuh konfigurasi loader; cukup <img> biasa untuk test.
vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} />
  ),
}));

function project(n: number, extra: Partial<PlaygroundProject> = {}) {
  return {
    id: `id-${n}`,
    title: `Project ${n}`,
    slug: `project-${n}`,
    shortDesc: `Description ${n}`,
    tags: ["Go", "PostgreSQL"],
    ...extra,
  } satisfies PlaygroundProject;
}

function experience(n: number): PlaygroundExperience {
  return {
    id: `exp-${n}`,
    title: `Role ${n}`,
    company: `Company ${n}`,
    location: "Jakarta",
    startDate: "2022",
    endDate: n === 1 ? undefined : "2024",
    isCurrent: n === 1,
    description: `Did things ${n}`,
    tags: ["Go"],
    highlights: [`Shipped ${n}`],
  };
}

const API = "http://api.test/api/v1";
/** Tiruan fetch untuk endpoint status; mengembalikan daftar URL yang dipanggil. */
function stubHealth(readyStatus = 200) {
  const calls: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      calls.push(url);
      const healthz = url.endsWith("/healthz");
      const status = healthz ? 200 : readyStatus;
      return Promise.resolve({
        status,
        json: () =>
          Promise.resolve(
            status === 200
              ? { data: { status: healthz ? "ok" : "ready" } }
              : { error: { code: "SERVICE_UNAVAILABLE" } },
          ),
      });
    }),
  );
  return calls;
}

/**
 * jsdom tidak punya WebGL, jadi shell berjalan di mode cadangan (tanpa scene).
 * Itu justru jalur yang paling perlu dijaga: tanpa 3D pun, semua proyek harus
 * tetap bisa dibuka.
 */
describe("PlaygroundShell (tanpa WebGL)", () => {
  beforeEach(() => {
    // Bungkam "Not implemented: getContext" dari jsdom.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.stubEnv("NEXT_PUBLIC_API_URL", API);
    stubHealth();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.mocked(publicClient.post).mockReset();
    mockToast.mockReset();
  });

  it("selalu menampilkan tautan kembali ke situs biasa dan judul halaman", () => {
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Server Room" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back/i })).toHaveAttribute(
      "href",
      "/",
    );
    expect(screen.getByText(/3D view unavailable/i)).toBeInTheDocument();
  });

  it("daftar rak berisi tautan asli ke halaman tiap proyek", () => {
    render(<PlaygroundShell projects={[project(1), project(2)]} total={2} />);
    const list = screen.getByRole("navigation", { name: "Racks and stations" });
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/projects/project-1",
      "/projects/project-2",
      "/#contact",
    ]);
    expect(within(list).getByText("R01")).toBeInTheDocument();
    expect(within(list).getByText("Racks · 2")).toBeInTheDocument();
  });

  it("klik rak membuka panel detail dengan tautan yang benar", async () => {
    const user = userEvent.setup();
    render(
      <PlaygroundShell
        projects={[
          project(1, {
            category: "Backend",
            demoUrl: "https://demo.example.com",
            repoUrl: "https://github.com/x/y",
          }),
        ]}
        total={1}
      />,
    );

    await user.click(screen.getByRole("link", { name: /Project 1/ }));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Project 1" }),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("Description 1")).toBeInTheDocument();
    expect(within(dialog).getByText("PostgreSQL")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: /view case study/i }),
    ).toHaveAttribute("href", "/projects/project-1");
    expect(
      within(dialog).getByRole("link", { name: /live demo/i }),
    ).toHaveAttribute("href", "https://demo.example.com");
    expect(
      within(dialog).getByRole("link", { name: /source/i }),
    ).toHaveAttribute("href", "https://github.com/x/y");
    // Jalan keluar tetap ada di dalam panel (panel modal menutupi header).
    expect(
      within(dialog).getByRole("link", { name: /back to the regular site/i }),
    ).toHaveAttribute("href", "/");

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("setelah panel ditutup, fokus kembali ke tautan rak yang membukanya", async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1), project(2)]} total={2} />);
    const link = screen.getByRole("link", { name: /Project 2/ });
    await user.click(link);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(link).toHaveFocus();
  });

  it("tombol tutup panel punya area sentuh 44 px dan tidak ikut tergulir", async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    await user.click(screen.getByRole("link", { name: /Project 1/ }));
    const dialog = await screen.findByRole("dialog");

    const close = within(dialog).getByRole("button", { name: /close/i });
    expect(close.className).toMatch(/\bh-11\b/);
    expect(close.className).toMatch(/\bw-11\b/);
    // Panelnya sendiri tidak menggulir; isinya yang menggulir.
    expect(dialog.className).toMatch(/overflow-hidden/);
    expect(dialog.querySelector(".overflow-y-auto")).not.toBeNull();

    await user.click(close);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("URL berbahaya dari data API tidak pernah menjadi tautan", async () => {
    const user = userEvent.setup();
    render(
      <PlaygroundShell
        projects={[
          project(1, {
            demoUrl: "javascript:alert(1)",
            repoUrl: "data:text/html,<script>alert(1)</script>",
          }),
        ]}
        total={1}
      />,
    );
    await user.click(screen.getByRole("link", { name: /Project 1/ }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).queryByRole("link", { name: /live demo/i }),
    ).toBeNull();
    expect(within(dialog).queryByRole("link", { name: /source/i })).toBeNull();
    for (const link of within(dialog).getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^\//);
    }
  });

  it("klik dengan Ctrl/Cmd dibiarkan ke browser (buka tab baru), panel tidak muncul", async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    await user.keyboard("{Control>}");
    await user.click(screen.getByRole("link", { name: /Project 1/ }));
    await user.keyboard("{/Control}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("proyek melebihi kapasitas: rak terakhir adalah arsip dengan jumlah sisanya", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: MAX_STATIONS + 1 }, (_, i) =>
      project(i + 1),
    );
    render(<PlaygroundShell projects={many} total={40} />);

    const list = screen.getByRole("navigation", { name: "Racks and stations" });
    const links = within(list)
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href")?.startsWith("/projects"));
    expect(links).toHaveLength(MAX_STATIONS);
    expect(links[links.length - 1]).toHaveAttribute("href", "/projects");

    await user.click(links[links.length - 1]);
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText(new RegExp(`${40 - (MAX_STATIONS - 1)} more`)),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("link", { name: /browse all projects/i }),
    ).toHaveAttribute("href", "/projects");
  });

  it("tanpa proyek (mis. backend mati): pesan kosong dengan tautan ke /projects", () => {
    render(<PlaygroundShell projects={[]} total={0} />);
    expect(screen.getByText(/No projects are racked yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /see the projects page/i }),
    ).toHaveAttribute("href", "/projects");
  });

  it("stasiun: status (tombol), pengalaman & kontak (tautan ke beranda), dengan kodenya", () => {
    render(
      <PlaygroundShell
        projects={[project(1)]}
        total={1}
        experiences={[experience(1)]}
      />,
    );
    const list = screen.getByRole("navigation", { name: "Racks and stations" });
    expect(
      within(list).getByRole("heading", { name: "Stations" }),
    ).toBeInTheDocument();
    // Terminal tidak punya halaman padanan → tombol, bukan tautan mati.
    expect(
      within(list).getByRole("button", { name: /API\s*Live status/ }),
    ).toBeInTheDocument();
    expect(
      within(list).getByRole("link", { name: /LOG\s*Experience/ }),
    ).toHaveAttribute("href", "/#experience");
    expect(
      within(list).getByRole("link", { name: /MSG\s*Contact/ }),
    ).toHaveAttribute("href", "/#contact");
  });

  it("tanpa data pengalaman: stasiun pengalaman tidak ditawarkan", () => {
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    expect(screen.queryByRole("link", { name: /Experience/ })).toBeNull();
    expect(screen.getByRole("button", { name: /Live status/ })).toBeVisible();
  });

  it("tanpa proyek: terminal dan kotak surat tetap bisa dibuka", () => {
    render(<PlaygroundShell projects={[]} total={0} />);
    expect(screen.getByText(/No projects are racked yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Live status/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Contact/ })).toBeInTheDocument();
  });

  it("tanpa scene, status tidak diperiksa sampai panelnya dibuka; lalu menampilkan hasil nyata", async () => {
    const calls = stubHealth();
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    expect(calls).toEqual([]);

    await user.click(screen.getByRole("button", { name: /Live status/ }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Live status" }),
    ).toBeInTheDocument();

    expect(await within(dialog).findByText("Operational")).toBeInTheDocument();
    expect(calls).toEqual([`${API}/healthz`, `${API}/readyz`]);
    const rows = within(dialog).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(
      within(rows[1]).getByRole("rowheader", { name: "/api/v1/healthz" }),
    ).toBeInTheDocument();
    expect(within(rows[2]).getByText("ok")).toBeInTheDocument();
    // Origin API tidak ditampilkan — hanya path.
    expect(dialog.textContent).not.toContain("api.test");
  });

  it("readyz 503: status Degraded dengan teks (bukan hanya warna), tanpa rincian sebab", async () => {
    stubHealth(503);
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    await user.click(screen.getByRole("button", { name: /Live status/ }));
    const dialog = await screen.findByRole("dialog");

    expect(await within(dialog).findByText("Degraded")).toBeInTheDocument();
    expect(within(dialog).getByText("degraded")).toBeInTheDocument();
    expect(dialog.textContent).not.toMatch(/SERVICE_UNAVAILABLE|database/i);
  });

  it("backend tidak terjangkau: Unavailable dengan penjelasan, tanpa galat", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    );
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    await user.click(screen.getByRole("button", { name: /Live status/ }));
    const dialog = await screen.findByRole("dialog");

    expect(await within(dialog).findByText("Unavailable")).toBeInTheDocument();
    expect(
      within(dialog).getByText(/can't be reached from here/i),
    ).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("panel status ditutup → fokus kembali ke tombol yang membukanya", async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    const button = screen.getByRole("button", { name: /Live status/ });
    await user.click(button);
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it("panel pengalaman: tiap peran dengan periode, perusahaan, sorotan, dan teknologi", async () => {
    const user = userEvent.setup();
    render(
      <PlaygroundShell
        projects={[project(1)]}
        total={1}
        experiences={[experience(1), experience(2)]}
      />,
    );
    await user.click(screen.getByRole("link", { name: /Experience/ }));
    const dialog = await screen.findByRole("dialog");

    expect(
      within(dialog).getByRole("heading", { name: "Where I've worked" }),
    ).toBeInTheDocument();
    expect(
      within(dialog)
        .getAllByRole("heading", { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(["Role 1", "Role 2"]);
    expect(within(dialog).getByText("2022 — Present")).toBeInTheDocument();
    expect(within(dialog).getByText("2022 — 2024")).toBeInTheDocument();
    expect(within(dialog).getByText("Company 1 · Jakarta")).toBeInTheDocument();
    expect(within(dialog).getByText("Shipped 2")).toBeInTheDocument();
    expect(
      within(dialog).getAllByRole("list", { name: "Technologies" }),
    ).toHaveLength(2);
  });

  it("panel kotak surat: form kontak yang sama, terkirim ke endpoint yang sama", async () => {
    vi.mocked(publicClient.post).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    await user.click(screen.getByRole("link", { name: /Contact/ }));
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Send a message" }),
    ).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Name"), "Ada");
    await user.type(within(dialog).getByLabelText("Email"), "ada@example.com");
    await user.type(within(dialog).getByLabelText("Subject"), "Hello");
    await user.type(within(dialog).getByLabelText("Message"), "From the room");
    await user.click(within(dialog).getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(publicClient.post).toHaveBeenCalledWith("/contact-messages", {
        name: "Ada",
        email: "ada@example.com",
        subject: "Hello",
        message: "From the room",
      }),
    );
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "success" }),
      ),
    );
    // Panel tetap terbuka dan form dikosongkan.
    expect(within(dialog).getByLabelText("Message")).toHaveValue("");
  });

  it("draf pesan bertahan saat panel ditutup lalu dibuka lagi; kosong setelah terkirim", async () => {
    vi.mocked(publicClient.post).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    const link = screen.getByRole("link", { name: /Contact/ });

    await user.click(link);
    let dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText("Name"), "Ada");
    await user.type(within(dialog).getByLabelText("Message"), "Half a thought");
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(link);
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Name")).toHaveValue("Ada");
    expect(within(dialog).getByLabelText("Message")).toHaveValue(
      "Half a thought",
    );
    // Penghitung karakter ikut pulih, bukan kembali ke nol.
    expect(within(dialog).getByText(/^14 \/ 5000/)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText("Email"), "ada@example.com");
    await user.type(within(dialog).getByLabelText("Subject"), "Hello");
    await user.click(within(dialog).getByRole("button", { name: /submit/i }));
    await waitFor(() => expect(publicClient.post).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(within(dialog).getByLabelText("Message")).toHaveValue(""),
    );

    // Setelah terkirim, draf tidak muncul lagi.
    await user.keyboard("{Escape}");
    await user.click(link);
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Name")).toHaveValue("");
    expect(within(dialog).getByLabelText("Message")).toHaveValue("");
  });

  it("hasil pemeriksaan diumumkan (role=status), dan isi panel bisa difokus untuk digulir", async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    await user.click(screen.getByRole("button", { name: /Live status/ }));
    const dialog = await screen.findByRole("dialog");

    await waitFor(() =>
      expect(within(dialog).getByRole("status")).toHaveTextContent(
        "Operational",
      ),
    );
    const region = within(dialog).getByRole("region", {
      name: "Station details",
    });
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region.className).toMatch(/overflow-y-auto/);
  });

  it("tab tersembunyi: status tidak diperiksa walau panelnya terbuka", async () => {
    const calls = stubHealth();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    await user.click(screen.getByRole("button", { name: /Live status/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("status")).toHaveTextContent("Checking…");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toEqual([]);
  });

  it("hidrasi tanpa WebGL: tidak ada pemeriksaan status sebelum panel dibuka", async () => {
    const calls = stubHealth();
    const ui = (
      <SWRConfig value={{ provider: () => new Map() }}>
        <PlaygroundShell projects={[project(1)]} total={1} />
      </SWRConfig>
    );
    // HTML dari server dirender dengan anggapan WebGL ada; browser lalu
    // menghidrasinya dan baru tahu WebGL tidak tersedia.
    const container = document.createElement("div");
    document.body.appendChild(container);
    container.innerHTML = renderToString(ui);
    let root: ReturnType<typeof hydrateRoot> | undefined;
    await act(async () => {
      root = hydrateRoot(container, ui);
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

    expect(
      within(container).getByText(/3D view unavailable/i),
    ).toBeInTheDocument();
    expect(calls).toEqual([]);
    act(() => root?.unmount());
    container.remove();
  });

  it("tanpa JavaScript, baris tombol status ikut disembunyikan (bukan <li> kosong)", () => {
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    const button = screen.getByRole("button", { name: /Live status/ });
    expect(button.closest("li")).toHaveAttribute("data-requires-js");
    expect(
      screen.getByRole("link", { name: /Contact/ }).closest("li"),
    ).not.toHaveAttribute("data-requires-js");
  });
});

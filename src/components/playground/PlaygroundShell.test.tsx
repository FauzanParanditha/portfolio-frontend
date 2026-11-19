import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { PlaygroundShell } from "@/components/playground/PlaygroundShell";
import { MAX_STATIONS, type PlaygroundProject } from "@/lib/playground/layout";

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

/**
 * jsdom tidak punya WebGL, jadi shell berjalan di mode cadangan (tanpa scene).
 * Itu justru jalur yang paling perlu dijaga: tanpa 3D pun, semua proyek harus
 * tetap bisa dibuka.
 */
describe("PlaygroundShell (tanpa WebGL)", () => {
  beforeEach(() => {
    // Bungkam "Not implemented: getContext" dari jsdom.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });
  afterEach(() => vi.restoreAllMocks());

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
    const list = screen.getByRole("navigation", { name: "Project racks" });
    const links = within(list).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/projects/project-1",
      "/projects/project-2",
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

    const list = screen.getByRole("navigation", { name: "Project racks" });
    const links = within(list).getAllByRole("link");
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
});

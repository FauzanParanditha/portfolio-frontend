import {
  render as rtlRender,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));
vi.mock("@/lib/axios/public", () => ({
  default: { post: vi.fn() },
}));

import { TourShell } from "@/components/tour/TourShell";
import { HEADLINE } from "@/content/profile";
import publicClient from "@/lib/axios/public";
import type {
  PlaygroundExperience,
  PlaygroundProject,
} from "@/lib/playground/layout";
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
function experience(n: number): PlaygroundExperience {
  return {
    id: `exp-${n}`,
    title: `Role ${n}`,
    company: `Company ${n}`,
    location: "Jakarta",
    startDate: "2022",
    isCurrent: true,
    description: `Did things ${n}`,
    tags: ["Go"],
    highlights: [`Shipped ${n}`],
  };
}
const SKILLS = [
  { type: "backend", names: ["Fiber", "Go"] },
  { type: "database", names: ["PostgreSQL"] },
];

const base = {
  projects: [project(1), project(2), project(3)],
  total: 3,
  featured: [project(2), project(1)],
  experiences: [experience(1), experience(2)],
  skills: SKILLS,
};

const API = "http://api.test/api/v1";

/**
 * jsdom tidak punya WebGL: tur tampil sebagai halaman biasa. Jalur inilah yang
 * dilihat mesin pencari, pembaca layar, dan perangkat lemah — isinya harus
 * lengkap tanpa satu baris pun kode 3D.
 */
describe("TourShell (tanpa WebGL)", () => {
  let calls: string[];

  beforeEach(() => {
    resetTourModeForTest();
    calls = [];
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    vi.stubEnv("NEXT_PUBLIC_API_URL", API);
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        calls.push(url);
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              data: { status: url.endsWith("/healthz") ? "ok" : "ready" },
            }),
        });
      }),
    );
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.mocked(publicClient.post).mockReset();
    mockToast.mockReset();
  });

  it("enam bagian berurutan, masing-masing berjudul; satu h1 berisi headline", () => {
    render(<TourShell {...base} />);
    const main = screen.getByRole("main");
    expect(
      within(main)
        .getAllByRole("region")
        .map((section) => section.id),
    ).toEqual(["top", "about", "projects", "experience", "status", "contact"]);

    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0]).toHaveTextContent(HEADLINE);
    expect(
      within(main)
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "Profile & capabilities",
      "Selected works",
      "Where I've worked",
      "The API behind this page is live",
      "Send a message",
    ]);
  });

  it("tanpa 3D: tata letak ringkas dipaksa, tanpa kanvas dan tanpa tombol ganti tampilan", () => {
    const { container } = render(<TourShell {...base} />);
    expect(container.querySelector(".tour")).toHaveAttribute(
      "data-mode",
      "simple",
    );
    expect(container.querySelector("canvas")).toBeNull();
    expect(screen.queryByRole("button", { name: /version/i })).toBeNull();
    expect(screen.queryByText(/Scroll to walk/i)).toBeNull();
  });

  it("rel perhentian berisi tautan jangkar asli ke tiap bagian", () => {
    render(<TourShell {...base} />);
    const rail = screen.getByRole("navigation", { name: "Tour stops" });
    expect(
      within(rail)
        .getAllByRole("link")
        .map((a) => [a.getAttribute("href"), a.textContent]),
    ).toEqual([
      ["#top", "01Lobby"],
      ["#about", "02About"],
      ["#projects", "03Projects"],
      ["#experience", "04Experience"],
      ["#status", "05Status"],
      ["#contact", "06Contact"],
    ]);
    expect(within(rail).getByRole("link", { name: /Lobby/ })).toHaveAttribute(
      "aria-current",
      "location",
    );
  });

  it("kartu proyek: proyek unggulan sebagai tautan asli, dengan kode raknya", () => {
    render(<TourShell {...base} />);
    const section = document.getElementById("projects") as HTMLElement;
    const links = within(section).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      "/projects/project-2",
      "/projects/project-1",
      "/projects",
    ]);
    // Urutan kartu = urutan unggulan; kodenya = posisi di rak (urutan API).
    expect(links[0]).toHaveTextContent("R02");
    expect(links[0]).toHaveTextContent("Description 2");
    expect(links[1]).toHaveTextContent("R01");
  });

  it("proyek unggulan yang tidak kebagian rak tetap tampil, tanpa kode rak", () => {
    render(<TourShell {...base} featured={[project(9), project(1)]} />);
    const section = document.getElementById("projects") as HTMLElement;
    const [first, second] = within(section).getAllByRole("link");
    expect(first).toHaveAttribute("href", "/projects/project-9");
    expect(first.textContent).not.toMatch(/R\d\d/);
    expect(second).toHaveTextContent("R01");
  });

  it("slug dari API di-encode supaya tidak keluar dari /projects/", () => {
    render(
      <TourShell
        {...base}
        featured={[{ ...project(1), slug: "../admin?x=1" }]}
      />,
    );
    const section = document.getElementById("projects") as HTMLElement;
    expect(within(section).getAllByRole("link")[0]).toHaveAttribute(
      "href",
      "/projects/..%2Fadmin%3Fx%3D1",
    );
  });

  it("tanpa proyek unggulan: pesan kosong, tautan ke semua proyek tetap ada", () => {
    render(<TourShell {...base} featured={[]} />);
    const section = document.getElementById("projects") as HTMLElement;
    expect(
      within(section).getByText(/No featured works available/i),
    ).toBeInTheDocument();
    expect(
      within(section).getByRole("link", { name: /All projects/i }),
    ).toHaveAttribute("href", "/projects");
  });

  it("tanpa data pengalaman: bagian dan perhentiannya tidak ada; penomoran bergeser", () => {
    render(<TourShell {...base} experiences={[]} />);
    expect(document.getElementById("experience")).toBeNull();
    const rail = screen.getByRole("navigation", { name: "Tour stops" });
    expect(within(rail).getAllByRole("link")).toHaveLength(5);
    expect(within(rail).queryByRole("link", { name: /Experience/ })).toBeNull();
    expect(
      within(document.getElementById("status") as HTMLElement).getByText(
        /04 · Status/,
      ),
    ).toBeInTheDocument();
  });

  it("backend mati (semua data kosong): halaman tetap berisi profil, status, dan kontak", () => {
    render(
      <TourShell
        projects={[]}
        total={0}
        featured={[]}
        experiences={[]}
        skills={[]}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      HEADLINE,
    );
    expect(screen.getAllByRole("region").map((section) => section.id)).toEqual([
      "top",
      "about",
      "projects",
      "status",
      "contact",
    ]);
  });

  it("kartu about: paragraf profil dan keahlian per kelompok", () => {
    render(<TourShell {...base} />);
    const section = document.getElementById("about") as HTMLElement;
    expect(
      within(section).getByText(/With over 5 years of experience/),
    ).toBeInTheDocument();
    expect(within(section).getByText("backend")).toBeInTheDocument();
    expect(within(section).getByText("Fiber, Go")).toBeInTheDocument();
    expect(within(section).getByText("PostgreSQL")).toBeInTheDocument();
  });

  it("kartu pengalaman memuat semua peran", () => {
    render(<TourShell {...base} />);
    const section = document.getElementById("experience") as HTMLElement;
    expect(
      within(section)
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Role 1", "Role 2"]);
    expect(within(section).getByText("Shipped 2")).toBeInTheDocument();
  });

  it("status tidak diperiksa selama pengunjung masih di atas halaman", async () => {
    render(<TourShell {...base} />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(calls).toEqual([]);
    expect(
      within(document.getElementById("status") as HTMLElement).getByRole(
        "status",
      ),
    ).toHaveTextContent("Checking…");
  });

  it("form kontak di kartu terakhir mengirim ke endpoint yang sama dengan beranda", async () => {
    vi.mocked(publicClient.post).mockResolvedValue({ data: {} });
    const user = userEvent.setup();
    render(<TourShell {...base} />);
    const section = document.getElementById("contact") as HTMLElement;

    await user.type(within(section).getByLabelText("Name"), "Ada");
    await user.type(within(section).getByLabelText("Email"), "ada@example.com");
    await user.type(within(section).getByLabelText("Subject"), "Hello");
    await user.type(within(section).getByLabelText("Message"), "From the tour");
    await user.click(within(section).getByRole("button", { name: /submit/i }));

    await waitFor(() =>
      expect(publicClient.post).toHaveBeenCalledWith("/contact-messages", {
        name: "Ada",
        email: "ada@example.com",
        subject: "Hello",
        message: "From the tour",
      }),
    );
  });

  it("jalan keluar selalu ada: beranda, playground, dan lompat ke konten", () => {
    render(<TourShell {...base} />);
    expect(screen.getByRole("link", { name: "PARANDITHA" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: /Explore freely/i }),
    ).toHaveAttribute("href", "/playground");
    expect(
      screen.getByRole("link", { name: /Skip to content/i }),
    ).toHaveAttribute("href", "#main");
  });
});

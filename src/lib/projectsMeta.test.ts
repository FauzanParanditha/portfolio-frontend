import { describe, expect, it } from "vitest";

import { parseProjectsQuery, projectsHref, projectsMeta } from "./projectsMeta";

const TAGS = ["Go", "Next.js", "PostgreSQL"];
const query = (q = "", tag = "", page = 1) => ({ q, tag, page });

describe("parseProjectsQuery", () => {
  it("tanpa parameter: kosong, halaman 1", () => {
    expect(parseProjectsQuery({})).toEqual({ q: "", tag: "", page: 1 });
  });

  it("memangkas spasi, dan nomor halaman yang tak masuk akal jatuh ke 1", () => {
    expect(parseProjectsQuery({ q: "  api ", tag: " Go ", page: "3" })).toEqual(
      {
        q: "api",
        tag: "Go",
        page: 3,
      },
    );
    for (const page of ["0", "-2", "abc", "", "1.9e9x"]) {
      expect(parseProjectsQuery({ page }).page).toBeGreaterThanOrEqual(1);
    }
    expect(parseProjectsQuery({ page: "abc" }).page).toBe(1);
    expect(parseProjectsQuery({ page: "-2" }).page).toBe(1);
  });

  it("parameter yang diulang (array): yang pertama dipakai, tidak melempar", () => {
    expect(
      parseProjectsQuery({ q: ["a", "b"], tag: ["Go", "x"], page: ["2", "9"] }),
    ).toEqual({ q: "a", tag: "Go", page: 2 });
  });
});

describe("projectsHref", () => {
  it("hanya parameter yang terpakai; halaman 1 tidak ditulis", () => {
    expect(projectsHref({})).toBe("/projects");
    expect(projectsHref({ page: 1 })).toBe("/projects");
    expect(projectsHref({ page: 2 })).toBe("/projects?page=2");
    expect(projectsHref({ q: "api", tag: "Go", page: 3 })).toBe(
      "/projects?q=api&tag=Go&page=3",
    );
  });

  it("nilai di-encode, tidak bisa menyisipkan parameter lain", () => {
    expect(projectsHref({ tag: "C#&page=9" })).toBe(
      "/projects?tag=C%23%26page%3D9",
    );
  });
});

describe("projectsMeta", () => {
  it("daftar utama: judul sendiri dan canonical ke /projects, bukan ke beranda", () => {
    const meta = projectsMeta(query(), TAGS);
    expect(meta.title).toBe("Projects");
    expect(meta.canonical).toBe("/projects");
    expect(meta.index).toBe(true);
    expect(meta.description).toMatch(/Fauzan Paranditha/);
  });

  it("halaman lanjutan: canonical ke dirinya sendiri, judulnya menyebut nomor halaman", () => {
    const meta = projectsMeta(query("", "", 3), TAGS);
    expect(meta.canonical).toBe("/projects?page=3");
    expect(meta.title).toBe("Projects (page 3)");
    expect(meta.index).toBe(true);
  });

  it("filter tag yang ada: halaman tersendiri, dengan ejaan tag dari data", () => {
    // `?tag=go` dan `?tag=Go` harus menunjuk canonical yang sama.
    for (const typed of ["go", "GO", "Go"]) {
      const meta = projectsMeta(query("", typed), TAGS);
      expect(meta.canonical).toBe("/projects?tag=Go");
      expect(meta.title).toBe("Go projects");
      expect(meta.index).toBe(true);
    }
    expect(projectsMeta(query("", "next.js", 2), TAGS)).toMatchObject({
      canonical: "/projects?tag=Next.js&page=2",
      title: "Next.js projects (page 2)",
    });
  });

  it("tag yang tidak dikenal: noindex, canonical ke daftar utama, teks URL tidak masuk judul", () => {
    const meta = projectsMeta(query("", "Buy cheap pills", 4), TAGS);
    expect(meta).toMatchObject({
      index: false,
      canonical: "/projects",
      title: "Projects",
    });
    // Daftar tag kosong (backend mati): semua filter tag dianggap tak dikenal.
    expect(projectsMeta(query("", "Go"), []).index).toBe(false);
  });

  it("hasil pencarian: noindex dan canonical ke daftar utama, juga bila digabung tag yang sah", () => {
    for (const q of [query("api"), query("api", "Go", 2)]) {
      const meta = projectsMeta(q, TAGS);
      expect(meta).toMatchObject({
        index: false,
        canonical: "/projects",
        title: "Projects",
      });
      expect(JSON.stringify(meta)).not.toContain("api");
    }
  });
});

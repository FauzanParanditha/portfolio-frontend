import {
  projectFieldLabel,
  toProjectUpsertPayload,
} from "@/lib/mapper/project";
import type { Project } from "@/types/project";

const baseProject: Project = {
  id: "p-1",
  slug: "proyek-a",
  title: "Proyek A",
  shortDesc: "Ringkas",
  longDescription: "",
  coverImageUrl: "https://cdn.example.com/a.png",
  category: "",
  timeline: "",
  role: "",
  challenge: "",
  solution: "",
  results: [],
  technicalDetails: {},
  demoUrl: null,
  repoUrl: null,
  isFeatured: false,
  sortOrder: 1,
  tags: [],
  features: [],
  screenshots: [],
};

const make = (overrides: Partial<Project>): Project => ({
  ...baseProject,
  ...overrides,
});

describe("toProjectUpsertPayload — URL", () => {
  it("men-trim coverImageUrl, demoUrl, dan repoUrl sebelum dikirim", () => {
    const payload = toProjectUpsertPayload(
      make({
        coverImageUrl: "  /uploads/cover.png \n",
        demoUrl: " https://demo.example.com ",
        repoUrl: "\thttps://github.com/user/repo  ",
      }),
      1,
    );

    expect(payload.coverImageUrl).toBe("/uploads/cover.png");
    expect(payload.demoUrl).toBe("https://demo.example.com");
    expect(payload.repoUrl).toBe("https://github.com/user/repo");
  });

  it.each([
    ["undefined", undefined],
    ["null", null],
    ["string kosong", ""],
    ["hanya spasi", "   "],
  ])("demoUrl/repoUrl %s → null", (_label, value) => {
    const payload = toProjectUpsertPayload(
      make({ demoUrl: value, repoUrl: value }),
      1,
    );
    expect(payload.demoUrl).toBeNull();
    expect(payload.repoUrl).toBeNull();
  });

  it("coverImageUrl kosong tetap string kosong (bukan undefined)", () => {
    const payload = toProjectUpsertPayload(
      make({ coverImageUrl: undefined as unknown as string }),
      1,
    );
    expect(payload.coverImageUrl).toBe("");
  });

  it("men-trim screenshot dan membuang yang kosong", () => {
    const payload = toProjectUpsertPayload(
      make({
        screenshots: [
          { imageUrl: " https://cdn.example.com/1.png ", sortOrder: 1 },
          { imageUrl: "   ", sortOrder: 2 },
          { imageUrl: "", sortOrder: 3 },
          { imageUrl: "/uploads/2.png\n", sortOrder: 4 },
        ],
      }),
      1,
    );
    expect(payload.screenshots).toEqual([
      "https://cdn.example.com/1.png",
      "/uploads/2.png",
    ]);
  });
});

describe("projectFieldLabel", () => {
  it.each([
    ["DemoURL", "Live URL"],
    ["RepoURL", "GitHub URL"],
    ["CoverImageURL", "Image URL"],
    ["ShortDesc", "Description"],
    ["Title", "Title"],
    // Nama JSON juga dikenali (tidak peka huruf besar/kecil).
    ["demoUrl", "Live URL"],
    ["coverImageUrl", "Image URL"],
  ])("%s → %s", (key, label) => {
    expect(projectFieldLabel(key)).toBe(label);
  });

  it("item array memakai nomor baris berbasis 1", () => {
    expect(projectFieldLabel("Screenshots[0]")).toBe(
      "Screenshots URLs (line 1)",
    );
    expect(projectFieldLabel("Screenshots[1]")).toBe(
      "Screenshots URLs (line 2)",
    );
  });

  it("kunci tak dikenal dikembalikan apa adanya", () => {
    expect(projectFieldLabel("Unknown")).toBe("Unknown");
    expect(projectFieldLabel("Unknown[3]")).toBe("Unknown[3]");
  });
});

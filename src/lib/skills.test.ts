import { describe, expect, it } from "vitest";
import { groupSkills } from "./skills";

const tag = (name: string, type: string) => ({ id: name, name, type });

describe("groupSkills", () => {
  it("mengelompokkan per tipe, nama diurutkan abjad", () => {
    expect(
      groupSkills([
        tag("TypeScript", "frontend"),
        tag("React", "frontend"),
        tag("Go", "backend"),
      ]),
    ).toEqual([
      { type: "backend", names: ["Go"] },
      { type: "frontend", names: ["React", "TypeScript"] },
    ]);
  });

  it("tipe yang diutamakan lebih dulu; tipe lain menyusul secara alfabetis", () => {
    const types = groupSkills([
      tag("a", "zeta"),
      tag("b", "tools"),
      tag("c", "alpha"),
      tag("d", "language"),
      tag("e", "database"),
    ]).map((group) => group.type);
    expect(types).toEqual(["language", "database", "tools", "alpha", "zeta"]);
  });

  it("tipe disamakan tanpa peduli huruf besar & spasi; kosong masuk 'lainnya'", () => {
    expect(
      groupSkills([
        tag("Go", " Backend "),
        tag("Fiber", "backend"),
        tag("X", ""),
      ]),
    ).toEqual([
      { type: "backend", names: ["Fiber", "Go"] },
      { type: "lainnya", names: ["X"] },
    ]);
  });

  it("tanpa tag = tanpa kelompok", () => {
    expect(groupSkills([])).toEqual([]);
  });
});

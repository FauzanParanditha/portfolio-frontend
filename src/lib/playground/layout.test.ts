import { describe, expect, it } from "vitest";
import { findRoute, isWalkableAt } from "./grid";
import {
  buildLayout,
  buildStations,
  MAX_STATIONS,
  MIN_ROWS,
  nearestStationSlot,
  rackCode,
  RACKS_PER_ROW,
  toPlaygroundProject,
  type PlaygroundProject,
} from "./layout";

function project(n: number): PlaygroundProject {
  return {
    id: `id-${n}`,
    title: `Project ${n}`,
    slug: `project-${n}`,
    shortDesc: "desc",
    tags: [],
  };
}
const projects = (count: number) =>
  Array.from({ length: count }, (_, i) => project(i + 1));

describe("buildStations", () => {
  it("satu stasiun per proyek, dengan tautan ke halaman detailnya", () => {
    const stations = buildStations(projects(3));
    expect(stations).toHaveLength(3);
    expect(stations[0]).toMatchObject({
      kind: "project",
      id: "id-1",
      label: "Project 1",
      href: "/projects/project-1",
    });
  });

  it("slug di-encode supaya tidak bisa keluar dari /projects/", () => {
    const [station] = buildStations([{ ...project(1), slug: "a/b?c" }]);
    expect(station.href).toBe("/projects/a%2Fb%3Fc");
  });

  it("tepat di kapasitas: semua proyek dapat rak, tanpa arsip", () => {
    const stations = buildStations(projects(MAX_STATIONS));
    expect(stations).toHaveLength(MAX_STATIONS);
    expect(stations.every((s) => s.kind === "project")).toBe(true);
  });

  it("melebihi kapasitas: rak terakhir menjadi arsip dengan jumlah sisanya", () => {
    // Backend punya 30 proyek, halaman pertama hanya memuat 25.
    const stations = buildStations(projects(25), 30);
    expect(stations).toHaveLength(MAX_STATIONS);
    const last = stations[stations.length - 1];
    expect(last).toMatchObject({
      kind: "archive",
      href: "/projects",
      remaining: 30 - (MAX_STATIONS - 1),
    });
  });

  it("toPlaygroundProject hanya membawa field yang dipakai", () => {
    const slim = toPlaygroundProject({
      id: "1",
      title: "T",
      slug: "t",
      shortDesc: "s",
      longDescription: "panjang sekali",
      results: [],
      technicalDetails: {
        backend: "",
        database: "",
        frontend: "",
        deployment: "",
        architecture: "",
      },
      isFeatured: false,
      sortOrder: 0,
      tags: [{ id: "a", name: "Go", type: "backend" }],
      features: [],
      screenshots: [],
    } as never);
    expect(slim).not.toHaveProperty("longDescription");
    expect(slim.tags).toEqual(["Go"]);
  });
});

describe("buildLayout", () => {
  it("selalu punya minimal dua baris, sisanya rak kosong", () => {
    const layout = buildLayout(1);
    expect(layout.rows).toBe(MIN_ROWS);
    expect(layout.slots).toHaveLength(MIN_ROWS * RACKS_PER_ROW);
    expect(layout.slots.filter((s) => s.station !== null)).toHaveLength(1);
    expect(layout.slots[0].station).toBe(0);
  });

  it("menambah baris seiring jumlah stasiun dan memperdalam ruangan", () => {
    const small = buildLayout(8);
    const big = buildLayout(MAX_STATIONS);
    expect(big.rows).toBe(MAX_STATIONS / RACKS_PER_ROW);
    expect(big.depth).toBeGreaterThan(small.depth);
    expect(big.width).toBe(small.width);
  });

  it("jumlah di luar rentang dijepit", () => {
    expect(buildLayout(-3).slots.every((s) => s.station === null)).toBe(true);
    expect(
      buildLayout(999).slots.filter((s) => s.station !== null),
    ).toHaveLength(MAX_STATIONS);
  });

  it.each([0, 1, 5, 12, MAX_STATIONS])(
    "dengan %i stasiun: titik awal dan semua titik berdiri bisa dipijak dan terjangkau",
    (count) => {
      const layout = buildLayout(count);
      const { grid, spawn } = layout;
      expect(isWalkableAt(grid, spawn.x, spawn.z)).toBe(true);
      for (const slot of layout.slots) {
        expect(isWalkableAt(grid, slot.approach.x, slot.approach.z)).toBe(true);
        // Rak sendiri tidak boleh bisa dipijak.
        expect(isWalkableAt(grid, slot.x, slot.z)).toBe(false);
        const route = findRoute(grid, spawn, slot.approach);
        expect(route).not.toBeNull();
        const end = route![route!.length - 1];
        expect(end.x).toBeCloseTo(slot.approach.x);
        expect(end.z).toBeCloseTo(slot.approach.z);
      }
    },
  );

  it("properti dekoratif berada di dalam ruangan dan menghalangi jalan", () => {
    const layout = buildLayout(6);
    for (const prop of layout.props) {
      expect(Math.abs(prop.x) + prop.w / 2).toBeLessThanOrEqual(
        layout.width / 2,
      );
      expect(Math.abs(prop.z) + prop.d / 2).toBeLessThanOrEqual(
        layout.depth / 2,
      );
      expect(isWalkableAt(layout.grid, prop.x, prop.z)).toBe(false);
    }
  });
});

describe("nearestStationSlot & rackCode", () => {
  it("mengenali rak berisi terdekat, mengabaikan rak kosong", () => {
    const layout = buildLayout(2);
    const first = layout.slots[0];
    expect(
      nearestStationSlot(layout, first.approach.x + 0.2, first.approach.z)
        ?.index,
    ).toBe(0);
    // Slot 3 kosong: berdiri di depannya tidak menghasilkan stasiun.
    const vacant = layout.slots[3];
    expect(
      nearestStationSlot(layout, vacant.approach.x, vacant.approach.z),
    ).toBeNull();
    expect(
      nearestStationSlot(layout, layout.spawn.x, layout.spawn.z),
    ).toBeNull();
  });

  it("rackCode dua digit berbasis satu", () => {
    expect(rackCode(0)).toBe("R01");
    expect(rackCode(23)).toBe("R24");
  });
});

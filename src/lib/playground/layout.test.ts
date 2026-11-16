import { describe, expect, it } from "vitest";
import { distanceToRect } from "./collision";
import { findRoute, isWalkableAt } from "./grid";
import {
  buildLayout,
  buildStations,
  MAX_STATIONS,
  MIN_ROWS,
  nearestStationSlot,
  PLAYER_RADIUS,
  RACK,
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

  it.each([NaN, -5, Infinity, -Infinity])(
    "total tak masuk akal (%s) diabaikan: jumlah yang diterima yang dipakai",
    (total) => {
      const few = buildStations(projects(3), total);
      expect(few).toHaveLength(3);
      expect(few.every((s) => s.kind === "project")).toBe(true);

      const many = buildStations(projects(30), total);
      expect(many).toHaveLength(MAX_STATIONS);
      expect(many[many.length - 1]).toMatchObject({
        kind: "archive",
        remaining: 30 - (MAX_STATIONS - 1),
      });
    },
  );

  it("total pecahan dibulatkan ke bawah", () => {
    const stations = buildStations(projects(24), 26.9);
    expect(stations[stations.length - 1]).toMatchObject({
      kind: "archive",
      remaining: 26 - (MAX_STATIONS - 1),
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

  it("celah antar-rak bisa dilalui: di grid maupun secara geometri", () => {
    const layout = buildLayout(8);
    for (let row = 0; row < layout.rows; row++) {
      for (let col = 0; col < RACKS_PER_ROW - 1; col++) {
        const a = layout.slots[row * RACKS_PER_ROW + col];
        const b = layout.slots[row * RACKS_PER_ROW + col + 1];
        const mid = (a.x + b.x) / 2;

        // Geometri: celah lebih lebar dari badan pemain, dengan sisa lega.
        const gap = b.x - a.x - RACK.width;
        expect(gap).toBeGreaterThan(PLAYER_RADIUS * 2 + 0.5);

        // Grid: lajur selebar ≥ 0,75 m di tengah celah bisa dipijak,
        // di sepanjang kedalaman rak.
        for (const dx of [-0.37, 0, 0.37]) {
          for (const dz of [-RACK.depth / 2, 0, RACK.depth / 2]) {
            expect(isWalkableAt(layout.grid, mid + dx, a.z + dz)).toBe(true);
          }
        }
      }
    }
  });

  it("kotak halangan cocok dengan rak & properti, dan titik berdiri bebas darinya", () => {
    const layout = buildLayout(6);
    expect(layout.obstacles).toHaveLength(
      layout.slots.length + layout.props.length,
    );
    for (const slot of layout.slots) {
      for (const rect of layout.obstacles) {
        expect(
          distanceToRect(slot.approach.x, slot.approach.z, rect),
        ).toBeGreaterThanOrEqual(PLAYER_RADIUS);
      }
    }
    const { spawn } = layout;
    for (const rect of layout.obstacles) {
      expect(distanceToRect(spawn.x, spawn.z, rect)).toBeGreaterThanOrEqual(
        PLAYER_RADIUS,
      );
    }
  });

  it("tidak ada celah sempit antara properti dan dinding (kantong buntu)", () => {
    for (const count of [1, 8, MAX_STATIONS]) {
      const layout = buildLayout(count);
      const { bounds } = layout;
      // Halangan properti = setelah halangan rak.
      for (const rect of layout.obstacles.slice(layout.slots.length)) {
        for (const gap of [
          rect.minX - bounds.minX,
          bounds.maxX - rect.maxX,
          rect.minZ - bounds.minZ,
          bounds.maxZ - rect.maxZ,
        ]) {
          // Menempel dinding (0) atau cukup lebar untuk dilalui di grid.
          expect(gap === 0 || gap >= 1.2).toBe(true);
        }
      }
    }
  });

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

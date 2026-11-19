import { describe, expect, it } from "vitest";
import { distanceToRect } from "./collision";
import { findRoute, isWalkableAt } from "./grid";
import {
  buildLayout,
  buildStations,
  DESK,
  experiencePeriod,
  type FixtureKind,
  fixtureKindsFor,
  isRackStation,
  MAX_STATIONS,
  MIN_ROWS,
  nearestStationSlot,
  PLAYER_RADIUS,
  RACK,
  rackCode,
  RACKS_PER_ROW,
  targetCode,
  toPlaygroundExperience,
  toPlaygroundProject,
  type PlaygroundExperience,
  type PlaygroundProject,
} from "./layout";

const ALL_FIXTURES: FixtureKind[] = ["terminal", "wall", "mailbox"];

function experience(n: number): PlaygroundExperience {
  return {
    id: `exp-${n}`,
    title: `Role ${n}`,
    company: `Company ${n}`,
    location: "Jakarta",
    startDate: "2022",
    isCurrent: n === 1,
    endDate: n === 1 ? undefined : "2024",
    description: "desc",
    tags: [],
    highlights: [],
  };
}

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
/** Hanya stasiun rak (proyek + arsip); perabot menyusul sesudahnya. */
const racks = (...args: Parameters<typeof buildStations>) =>
  buildStations(...args).filter(isRackStation);

describe("buildStations", () => {
  it("satu stasiun per proyek, dengan tautan ke halaman detailnya", () => {
    const stations = racks(projects(3));
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
    const stations = racks(projects(MAX_STATIONS));
    expect(stations).toHaveLength(MAX_STATIONS);
    expect(stations.every((s) => s.kind === "project")).toBe(true);
  });

  it("melebihi kapasitas: rak terakhir menjadi arsip dengan jumlah sisanya", () => {
    // Backend punya 30 proyek, halaman pertama hanya memuat 25.
    const stations = racks(projects(25), 30);
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
      const few = racks(projects(3), total);
      expect(few).toHaveLength(3);
      expect(few.every((s) => s.kind === "project")).toBe(true);

      const many = racks(projects(30), total);
      expect(many).toHaveLength(MAX_STATIONS);
      expect(many[many.length - 1]).toMatchObject({
        kind: "archive",
        remaining: 30 - (MAX_STATIONS - 1),
      });
    },
  );

  it("total pecahan dibulatkan ke bawah", () => {
    const stations = racks(projects(24), 26.9);
    expect(stations[stations.length - 1]).toMatchObject({
      kind: "archive",
      remaining: 26 - (MAX_STATIONS - 1),
    });
  });

  it("stasiun perabot menyusul setelah rak: status, pengalaman, kontak", () => {
    const stations = buildStations(projects(2), 2, [experience(1)]);
    expect(stations.map((s) => s.kind)).toEqual([
      "project",
      "project",
      "status",
      "experience",
      "contact",
    ]);
    // Terminal tidak punya padanan halaman biasa; dua lainnya punya.
    expect(stations[2].href).toBeNull();
    expect(stations[3]).toMatchObject({ href: "/#experience" });
    expect(stations[4]).toMatchObject({ href: "/#contact" });
    expect(fixtureKindsFor(stations)).toEqual(ALL_FIXTURES);
  });

  it("tanpa data pengalaman, dinding pengalaman tidak dipasang", () => {
    const stations = buildStations(projects(1));
    expect(stations.map((s) => s.kind)).toEqual([
      "project",
      "status",
      "contact",
    ]);
    expect(fixtureKindsFor(stations)).toEqual(["terminal", "mailbox"]);
  });

  it("tanpa proyek sama sekali, terminal dan kotak surat tetap ada", () => {
    expect(buildStations([]).map((s) => s.kind)).toEqual(["status", "contact"]);
  });

  it("id stasiun unik walau kapasitas penuh dan semua perabot terpasang", () => {
    const stations = buildStations(projects(30), 30, [experience(1)]);
    expect(new Set(stations.map((s) => s.id)).size).toBe(stations.length);
    expect(stations).toHaveLength(MAX_STATIONS + 3);
  });

  it("experiencePeriod: sedang berjalan, selesai, dan tanpa tanggal akhir", () => {
    expect(experiencePeriod(experience(1))).toBe("2022 — Present");
    expect(experiencePeriod(experience(2))).toBe("2022 — 2024");
    expect(
      experiencePeriod({ startDate: "2020", isCurrent: false, endDate: "" }),
    ).toBe("2020 — Finished");
  });

  it("toPlaygroundExperience meratakan tag & sorotan, membuang yang kosong", () => {
    const slim = toPlaygroundExperience({
      id: "e",
      title: "T",
      company: "C",
      location: "L",
      startDate: "2020",
      isCurrent: true,
      description: "d",
      sortOrder: 3,
      tags: [
        { id: "a", name: "Go", type: "backend" },
        { id: "b", name: "", type: "backend" },
      ],
      highlights: [{ text: "Shipped" }, { text: "" }],
    });
    expect(slim).not.toHaveProperty("sortOrder");
    expect(slim.tags).toEqual(["Go"]);
    expect(slim.highlights).toEqual(["Shipped"]);
    // Data API tanpa tags/highlights tidak boleh melempar.
    expect(
      toPlaygroundExperience({
        id: "e",
        title: "T",
        company: "C",
        location: "L",
        startDate: "2020",
        isCurrent: true,
        description: "d",
        sortOrder: 0,
      }),
    ).toMatchObject({ tags: [], highlights: [] });
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

  it("tidak ada celah sempit antara properti/perabot dan dinding (kantong buntu)", () => {
    for (const count of [1, 8, MAX_STATIONS]) {
      const layout = buildLayout(count, ALL_FIXTURES);
      const { bounds } = layout;
      // Halangan perabot & properti = setelah halangan rak.
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

describe("buildLayout dengan perabot", () => {
  it("tanpa perabot, tata letak rak tidak berubah", () => {
    const plain = buildLayout(8);
    const furnished = buildLayout(8, ALL_FIXTURES);
    expect(plain.fixtures).toEqual([]);
    expect(plain.targets).toEqual(plain.slots);
    expect(furnished.slots).toEqual(plain.slots);
    expect(furnished.width).toBe(plain.width);
    expect(furnished.depth).toBe(plain.depth);
    expect(furnished.spawn).toEqual(plain.spawn);
  });

  it.each([0, 1, 5, 12, MAX_STATIONS])(
    "dengan %i rak: indeks tujuan & stasiun perabot menyambung setelah rak",
    (count) => {
      const layout = buildLayout(count, ALL_FIXTURES);
      expect(layout.targets).toHaveLength(layout.slots.length + 3);
      layout.targets.forEach((target, i) => expect(target.index).toBe(i));
      expect(layout.fixtures.map((f) => f.kind)).toEqual(ALL_FIXTURES);
      expect(layout.fixtures.map((f) => f.station)).toEqual([
        count,
        count + 1,
        count + 2,
      ]);
      // Tiap stasiun dimiliki tepat satu tujuan.
      const owned = layout.targets
        .map((t) => t.station)
        .filter((s) => s !== null);
      expect(new Set(owned).size).toBe(owned.length);
      expect(owned).toHaveLength(count + 3);
    },
  );

  it("urutan perabot mengikuti daftar yang diminta (tanpa dinding pengalaman)", () => {
    const layout = buildLayout(2, ["terminal", "mailbox"]);
    expect(layout.fixtures.map((f) => [f.kind, f.station])).toEqual([
      ["terminal", 2],
      ["mailbox", 3],
    ]);
  });

  it.each([0, 1, 8, MAX_STATIONS])(
    "dengan %i rak: titik berdiri tiap perabot bisa dipijak, terjangkau, dan bebas halangan",
    (count) => {
      const layout = buildLayout(count, ALL_FIXTURES);
      const { grid, spawn, bounds } = layout;
      expect(isWalkableAt(grid, spawn.x, spawn.z)).toBe(true);
      for (const rect of layout.obstacles) {
        expect(distanceToRect(spawn.x, spawn.z, rect)).toBeGreaterThanOrEqual(
          PLAYER_RADIUS,
        );
      }
      for (const target of layout.targets) {
        const { x, z } = target.approach;
        expect(isWalkableAt(grid, x, z), target.kind).toBe(true);
        const route = findRoute(grid, spawn, target.approach);
        expect(route, target.kind).not.toBeNull();
        const end = route![route!.length - 1];
        expect(end.x).toBeCloseTo(x);
        expect(end.z).toBeCloseTo(z);
        // Badan DAN kepala (0,6 m di depan, radius 0,22) bebas saat menghadap
        // tujuan — kalau tidak, robot akan mundur selangkah setelah tiba.
        const noseX = x + Math.sin(target.face) * 0.6;
        const noseZ = z + Math.cos(target.face) * 0.6;
        for (const rect of layout.obstacles) {
          expect(
            distanceToRect(x, z, rect),
            target.kind,
          ).toBeGreaterThanOrEqual(PLAYER_RADIUS);
          expect(
            distanceToRect(noseX, noseZ, rect),
            target.kind,
          ).toBeGreaterThanOrEqual(0.22);
        }
        expect(noseX - 0.22).toBeGreaterThanOrEqual(bounds.minX);
        expect(noseX + 0.22).toBeLessThanOrEqual(bounds.maxX);
        expect(noseZ - 0.22).toBeGreaterThanOrEqual(bounds.minZ);
        expect(noseZ + 0.22).toBeLessThanOrEqual(bounds.maxZ);
      }
    },
  );

  it("pemain berdiri menghadap perabotnya", () => {
    const layout = buildLayout(4, ALL_FIXTURES);
    for (const target of layout.targets) {
      const dx = target.x - target.approach.x;
      const dz = target.z - target.approach.z;
      const length = Math.hypot(dx, dz);
      // Arah hadap (sin, cos) searah dengan vektor titik-berdiri → tujuan.
      expect(
        (Math.sin(target.face) * dx + Math.cos(target.face) * dz) / length,
        target.kind,
      ).toBeGreaterThan(0.99);
    }
  });

  it("perabot berada di lobi: tidak menindih rak, properti, atau satu sama lain", () => {
    for (const count of [0, 8, MAX_STATIONS]) {
      const layout = buildLayout(count, ALL_FIXTURES);
      const rects = layout.obstacles;
      for (let a = 0; a < rects.length; a++) {
        for (let b = a + 1; b < rects.length; b++) {
          const apart =
            rects[a].maxX <= rects[b].minX ||
            rects[b].maxX <= rects[a].minX ||
            rects[a].maxZ <= rects[b].minZ ||
            rects[b].maxZ <= rects[a].minZ;
          expect(apart, `halangan ${a} & ${b}, ${count} rak`).toBe(true);
        }
      }
      // Titik berdiri satu tujuan tidak berada di titik berdiri tujuan lain.
      const stops = layout.targets.filter((t) => t.station !== null);
      for (let a = 0; a < stops.length; a++) {
        for (let b = a + 1; b < stops.length; b++) {
          expect(
            Math.hypot(
              stops[a].approach.x - stops[b].approach.x,
              stops[a].approach.z - stops[b].approach.z,
            ),
          ).toBeGreaterThan(1.2);
        }
      }
    }
  });

  it("meja terminal menghalangi jalan; dinding pengalaman tidak menambah halangan", () => {
    const layout = buildLayout(4, ALL_FIXTURES);
    const [terminal, wall, mailbox] = layout.fixtures;
    expect(isWalkableAt(layout.grid, terminal.x, terminal.z)).toBe(false);
    expect(
      isWalkableAt(layout.grid, terminal.x + DESK.width / 2 - 0.05, terminal.z),
    ).toBe(false);
    expect(isWalkableAt(layout.grid, mailbox.x, mailbox.z)).toBe(false);
    expect(wall.x).toBe(-layout.width / 2);
    expect(layout.obstacles).toHaveLength(
      layout.slots.length + 2 + layout.props.length,
    );
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

  it("mengenali perabot di depan pemain, dan memilih yang paling dekat", () => {
    const layout = buildLayout(2, ALL_FIXTURES);
    for (const fixture of layout.fixtures) {
      expect(
        nearestStationSlot(layout, fixture.approach.x, fixture.approach.z)
          ?.index,
      ).toBe(fixture.index);
    }
    expect(
      nearestStationSlot(layout, layout.spawn.x, layout.spawn.z),
    ).toBeNull();
  });

  it("targetCode: rak bernomor, perabot berkode tetap", () => {
    const layout = buildLayout(2, ALL_FIXTURES);
    expect(layout.targets.map(targetCode).slice(0, 2)).toEqual(["R01", "R02"]);
    expect(layout.fixtures.map(targetCode)).toEqual(["API", "LOG", "MSG"]);
  });

  it("rackCode dua digit berbasis satu", () => {
    expect(rackCode(0)).toBe("R01");
    expect(rackCode(23)).toBe("R24");
  });
});

import { describe, expect, it } from "vitest";
import {
  blockBorder,
  blockRect,
  cellToWorld,
  createGrid,
  findPath,
  findRoute,
  hasLineOfSight,
  isWalkable,
  isWalkableAt,
  nearestWalkable,
  routeLength,
  smoothPath,
  worldToCell,
} from "./grid";

describe("grid", () => {
  it("memetakan dunia ↔ sel secara konsisten", () => {
    const grid = createGrid(10, 6, 0.5);
    expect(grid.cols).toBe(20);
    expect(grid.rows).toBe(12);
    const cell = worldToCell(grid, -4.9, -2.9);
    expect(cell).toEqual({ col: 0, row: 0 });
    const center = cellToWorld(grid, 0, 0);
    expect(center.x).toBeCloseTo(-4.75);
    expect(center.z).toBeCloseTo(-2.75);
  });

  it("blockRect menghalangi tapak beserta padding-nya, tidak lebih", () => {
    const grid = createGrid(10, 10, 0.5);
    blockRect(grid, 0, 0, 1, 1); // -0.5..0.5 → sel 9..10
    expect(isWalkableAt(grid, 0.25, 0.25)).toBe(false);
    expect(isWalkableAt(grid, -0.25, -0.25)).toBe(false);
    expect(isWalkableAt(grid, 0.75, 0)).toBe(true);
    expect(isWalkableAt(grid, -0.75, 0)).toBe(true);

    blockRect(grid, 0, 0, 1, 1, 0.3);
    expect(isWalkableAt(grid, 0.75, 0)).toBe(false);
    expect(isWalkableAt(grid, 1.25, 0)).toBe(true);
  });

  it("di luar batas dianggap tidak bisa dilalui", () => {
    const grid = createGrid(4, 4, 0.5);
    expect(isWalkable(grid, -1, 0)).toBe(false);
    expect(isWalkable(grid, 0, 8)).toBe(false);
    expect(isWalkableAt(grid, 99, 0)).toBe(false);
  });

  it("nearestWalkable mencari sel kosong terdekat", () => {
    const grid = createGrid(6, 6, 0.5);
    blockRect(grid, 0, 0, 2, 2);
    const blocked = worldToCell(grid, 0.1, 0.1);
    const found = nearestWalkable(grid, blocked.col, blocked.row);
    expect(found).not.toBeNull();
    expect(isWalkable(grid, found!.col, found!.row)).toBe(true);
    // Di luar grid → dijepit ke dalam.
    const clamped = nearestWalkable(grid, 999, -5);
    expect(clamped).toEqual({ col: grid.cols - 1, row: 0 });
  });
});

describe("findPath", () => {
  it("menemukan jalur lurus di ruang kosong", () => {
    const grid = createGrid(5, 5, 0.5);
    const path = findPath(grid, { col: 0, row: 0 }, { col: 9, row: 0 });
    expect(path).toHaveLength(10);
  });

  it("memutari halangan dan tidak pernah menginjak sel terhalang", () => {
    const grid = createGrid(10, 10, 0.5);
    // Tembok melintang dengan celah di sisi kanan.
    blockRect(grid, -1, 0, 8, 0.5);
    const start = worldToCell(grid, 0, -3);
    const goal = worldToCell(grid, 0, 3);
    const path = findPath(grid, start, goal);
    expect(path).not.toBeNull();
    for (const cell of path!) {
      expect(isWalkable(grid, cell.col, cell.row)).toBe(true);
    }
    // Harus lebih panjang dari garis lurus karena memutar.
    expect(path!.length).toBeGreaterThan(13);
  });

  it("tidak memotong sudut halangan secara diagonal", () => {
    const grid = createGrid(3, 3, 1);
    // Halangi (1,0) dan (0,1): dari (0,0) ke (1,1) diagonal menjadi terlarang.
    grid.blocked[0 * 3 + 1] = 1;
    grid.blocked[1 * 3 + 0] = 1;
    expect(findPath(grid, { col: 0, row: 0 }, { col: 1, row: 1 })).toBeNull();
  });

  it("mengembalikan null bila tujuan terkurung", () => {
    const grid = createGrid(6, 6, 0.5);
    blockBorder(grid, 1);
    // Kurung sel tengah dengan cincin halangan.
    blockRect(grid, 0, 0, 2, 2);
    const inside = worldToCell(grid, 0.1, 0.1);
    grid.blocked[inside.row * grid.cols + inside.col] = 0;
    const start = worldToCell(grid, -2, -2);
    expect(findPath(grid, start, inside)).toBeNull();
  });
});

describe("smoothPath & findRoute", () => {
  it("hasLineOfSight menghormati halangan dan lebar badan", () => {
    const grid = createGrid(10, 10, 0.5);
    blockRect(grid, 0, 0, 1, 1);
    expect(hasLineOfSight(grid, { x: -3, z: 0 }, { x: 3, z: 0 })).toBe(false);
    expect(hasLineOfSight(grid, { x: -3, z: 2 }, { x: 3, z: 2 })).toBe(true);
    // Lewat tepat di samping halangan: lolos sebagai titik, gagal bila berbadan.
    expect(hasLineOfSight(grid, { x: -3, z: 0.6 }, { x: 3, z: 0.6 })).toBe(
      true,
    );
    expect(hasLineOfSight(grid, { x: -3, z: 0.6 }, { x: 3, z: 0.6 }, 0.3)).toBe(
      false,
    );
  });

  it("jalur lurus di ruang kosong disederhanakan jadi dua titik", () => {
    const grid = createGrid(10, 10, 0.5);
    const route = findRoute(grid, { x: -4, z: -4 }, { x: 4, z: 3 });
    expect(route).toHaveLength(2);
    expect(route![0]).toEqual({ x: -4, z: -4 });
    expect(route![1]).toEqual({ x: 4, z: 3 });
  });

  it("rute yang dihaluskan tetap bebas halangan di tiap ruasnya", () => {
    const grid = createGrid(12, 12, 0.5);
    blockBorder(grid, 1);
    blockRect(grid, 0, 0, 4, 1.5, 0.3);
    const route = findRoute(grid, { x: 0, z: -4 }, { x: 0, z: 4 }, 0.15);
    expect(route).not.toBeNull();
    expect(route!.length).toBeGreaterThan(2);
    for (let i = 1; i < route!.length; i++) {
      expect(hasLineOfSight(grid, route![i - 1], route![i], 0.15)).toBe(true);
    }
    // Memutar: lebih panjang dari jarak lurus 8 m, tapi tidak berlebihan.
    const length = routeLength(route!);
    expect(length).toBeGreaterThan(8);
    expect(length).toBeLessThan(14);
  });

  it("tujuan di dalam halangan digeser ke sel kosong terdekat", () => {
    const grid = createGrid(10, 10, 0.5);
    blockRect(grid, 2, 2, 1, 1);
    const route = findRoute(grid, { x: -3, z: -3 }, { x: 2, z: 2 });
    expect(route).not.toBeNull();
    const end = route![route!.length - 1];
    expect(isWalkableAt(grid, end.x, end.z)).toBe(true);
  });

  it("smoothPath tidak mengubah jalur pendek", () => {
    const grid = createGrid(4, 4, 0.5);
    const two = [
      { x: 0, z: 0 },
      { x: 1, z: 1 },
    ];
    expect(smoothPath(grid, two)).toEqual(two);
  });
});

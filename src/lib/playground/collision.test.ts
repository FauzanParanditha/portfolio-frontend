import { describe, expect, it } from "vitest";
import {
  distanceToRect,
  isCircleFree,
  rectFromCenter,
  resolveCircle,
  type Rect,
} from "./collision";

const BOUNDS: Rect = { minX: -5, maxX: 5, minZ: -5, maxZ: 5 };
const BOX = rectFromCenter(0, 0, 2, 1); // x: -1..1, z: -0.5..0.5
const R = 0.3;

describe("collision", () => {
  it("distanceToRect: nol di dalam, jarak ke sisi/sudut di luar", () => {
    expect(distanceToRect(0, 0, BOX)).toBe(0);
    expect(distanceToRect(2, 0, BOX)).toBeCloseTo(1);
    expect(distanceToRect(0, -1.5, BOX)).toBeCloseTo(1);
    expect(distanceToRect(2, 1.5, BOX)).toBeCloseTo(Math.SQRT2);
  });

  it("posisi yang sudah bebas tidak diubah", () => {
    expect(resolveCircle(3, 3, R, [BOX], BOUNDS)).toEqual({ x: 3, z: 3 });
  });

  it("menyentuh sisi: didorong tegak lurus sampai tepat bersinggungan", () => {
    const p = resolveCircle(0.4, 0.6, R, [BOX], BOUNDS);
    expect(p.x).toBeCloseTo(0.4);
    expect(p.z).toBeCloseTo(0.5 + R);
  });

  it("di sudut: didorong menjauhi sudut (membulat), bukan ke satu sumbu", () => {
    const p = resolveCircle(1.1, 0.6, R, [BOX], BOUNDS);
    expect(distanceToRect(p.x, p.z, BOX)).toBeCloseTo(R);
    expect(p.x).toBeGreaterThan(1.1);
    expect(p.z).toBeGreaterThan(0.6);
  });

  it("pusat di dalam kotak: keluar lewat sisi terdekat", () => {
    const p = resolveCircle(0.2, 0.4, R, [BOX], BOUNDS);
    expect(p).toEqual({ x: 0.2, z: 0.5 + R });
  });

  it("tetap di dalam batas ruangan", () => {
    const p = resolveCircle(99, -99, R, [], BOUNDS);
    expect(p).toEqual({ x: 5 - R, z: -5 + R });
  });

  it("kotak dekat dinding dengan celah cukup: hasil akhir bebas dari keduanya", () => {
    const nearWall = rectFromCenter(3.8, 0, 1, 2); // x: 3.3..4.3, celah 0.7
    const p = resolveCircle(4.4, 0.9, R, [nearWall], BOUNDS);
    expect(isCircleFree(p.x, p.z, R, [nearWall], BOUNDS)).toBe(true);
  });

  it("pusat di dalam kotak yang menempel dinding: keluar ke sisi yang ada ruangnya", () => {
    const onWall = rectFromCenter(4.5, 0, 1, 2); // x: 4..5, menempel dinding
    // Sisi terdekat adalah +X (ke dinding) — tidak muat; harus keluar ke -X.
    const p = resolveCircle(4.9, 0, R, [onWall], BOUNDS);
    expect(isCircleFree(p.x, p.z, R, [onWall], BOUNDS)).toBe(true);
    expect(p.x).toBeCloseTo(4 - R);
  });

  it("isCircleFree mengenali tembus halangan dan keluar batas", () => {
    expect(isCircleFree(3, 3, R, [BOX], BOUNDS)).toBe(true);
    expect(isCircleFree(1.2, 0, R, [BOX], BOUNDS)).toBe(false);
    expect(isCircleFree(4.9, 0, R, [BOX], BOUNDS)).toBe(false);
  });
});

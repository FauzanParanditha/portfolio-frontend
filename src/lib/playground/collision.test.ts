import { describe, expect, it } from "vitest";
import {
  distanceToRect,
  isCircleFree,
  penetrationDepth,
  rectFromCenter,
  resolveCircle,
  segmentHitsBox,
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

describe("regresi: titik di luar batas tidak boleh terlempar ke sisi jauh kotak", () => {
  // Kotak menempel dinding kiri & depan (seperti tempat tidur yang celahnya
  // ditutup). Titik berada di dalam kotak DAN lebih dekat ke dinding daripada
  // radiusnya — persis posisi lingkaran "hidung" yang menjulur ke pojok.
  const corner: Rect = { minX: -5, maxX: -2, minZ: 3, maxZ: 5 };

  it("keluar lewat sisi terdekat yang ada ruangnya, bukan menyeberang kotak", () => {
    const p = resolveCircle(-4.9, 3.1, 0.22, [corner], BOUNDS);
    // Sisi terdekat = minZ (0,1 m). Sisi jauh (maxX) berjarak 2,9 m.
    expect(p.z).toBeCloseTo(3 - 0.22);
    expect(p.x).toBeCloseTo(-5 + 0.22);
    expect(Math.hypot(p.x - -4.9, p.z - 3.1)).toBeLessThan(0.5);
  });
});

describe("penetrationDepth", () => {
  it("nol saat bebas, sebesar tumpang-tindih saat menyentuh", () => {
    expect(penetrationDepth(3, 3, R, [BOX], BOUNDS)).toBe(0);
    expect(penetrationDepth(1.2, 0, R, [BOX], BOUNDS)).toBeCloseTo(0.1);
  });

  it("terus bertambah di dalam kotak (monoton), tidak mentok di radius", () => {
    const edge = penetrationDepth(1, 0, R, [BOX], BOUNDS);
    const inside = penetrationDepth(0.8, 0, R, [BOX], BOUNDS);
    const deeper = penetrationDepth(0.5, 0, R, [BOX], BOUNDS);
    expect(edge).toBeCloseTo(R);
    expect(inside).toBeCloseTo(R + 0.2);
    expect(deeper).toBeGreaterThan(inside);
  });

  it("menghitung tembus dinding ruangan", () => {
    expect(penetrationDepth(4.9, 0, R, [], BOUNDS)).toBeCloseTo(0.2);
    expect(penetrationDepth(0, -5.5, R, [], BOUNDS)).toBeCloseTo(0.8);
  });
});

describe("segmentHitsBox", () => {
  const min = [-1, 0, -1] as const;
  const max = [1, 2, 1] as const;

  it("ruas yang menembus kotak terdeteksi, dari arah mana pun", () => {
    expect(segmentHitsBox([-3, 1, 0], [3, 1, 0], min, max)).toBe(true);
    expect(segmentHitsBox([0, 5, 0], [0, -5, 0], min, max)).toBe(true);
    expect(segmentHitsBox([-3, 0.5, -3], [3, 1.5, 3], min, max)).toBe(true);
  });

  it("ruas yang lewat di atas, di samping, atau berhenti sebelum kotak tidak kena", () => {
    expect(segmentHitsBox([-3, 3, 0], [3, 3, 0], min, max)).toBe(false);
    expect(segmentHitsBox([-3, 1, 2], [3, 1, 2], min, max)).toBe(false);
    expect(segmentHitsBox([-5, 1, 0], [-2, 1, 0], min, max)).toBe(false);
  });

  it("ruas sejajar sumbu di luar slab tidak kena; titik di dalam kotak kena", () => {
    expect(segmentHitsBox([2, 1, -3], [2, 1, 3], min, max)).toBe(false);
    expect(segmentHitsBox([0, 1, 0], [0, 1, 0], min, max)).toBe(true);
  });

  it("garis pandang miring ke kamera: kena rak di antaranya, bebas bila kamera cukup tinggi", () => {
    // Pemain di belakang rak (z=-2), kamera di depan (z=6).
    expect(segmentHitsBox([0, 0.75, -2], [0, 4, 6], min, max)).toBe(true);
    expect(segmentHitsBox([0, 0.75, -2], [0, 14, 6], min, max)).toBe(false);
  });
});

describe("resolveCircle dengan jangkar (lingkaran hidung)", () => {
  // Halangan tipis: x 0..0,5 (seperti kotak surat), memanjang di Z.
  const THIN: Rect = { minX: 0, maxX: 0.5, minZ: -2, maxZ: 2 };
  const NOSE = 0.22;

  it("tanpa jangkar: keluar lewat sisi terdekat, walau itu di seberang", () => {
    // Pusat 0,3 m dari sisi kanan (maxX), 0,2 m dari sisi kiri.
    const p = resolveCircle(0.2, 0, NOSE, [THIN], BOUNDS);
    expect(p.x).toBeCloseTo(-NOSE);
  });

  it("dengan jangkar di kanan: keluar ke kanan, tempat badannya berada", () => {
    const p = resolveCircle(0.2, 0, NOSE, [THIN], BOUNDS, { x: 0.8, z: 0.1 });
    expect(p.x).toBeCloseTo(0.5 + NOSE);
    expect(p.z).toBeCloseTo(0);
  });

  it("jangkar di sisi yang sama dengan sisi terdekat: hasil tidak berubah", () => {
    const anchored = resolveCircle(0.2, 0, NOSE, [THIN], BOUNDS, {
      x: -0.4,
      z: 0.1,
    });
    expect(anchored).toEqual(resolveCircle(0.2, 0, NOSE, [THIN], BOUNDS));
  });

  it("sisi terdekat BERSEBELAHAN dengan sisi masuk (memotong sudut): tetap dipakai", () => {
    // Masuk dari kanan dekat ujung bawah kotak; sisi terdekat adalah minZ.
    const p = resolveCircle(0.3, -1.95, NOSE, [THIN], BOUNDS, {
      x: 0.9,
      z: -1.9,
    });
    expect(p.z).toBeCloseTo(-2 - NOSE);
    expect(p.x).toBeCloseTo(0.3);
  });

  it("sisi masuk tidak muat di dalam ruangan: sisi terdekat yang muat tetap dipakai", () => {
    // Kotak menempel dinding kanan; jangkar (mustahil) di luar dinding itu.
    const wall: Rect = { minX: 4.6, maxX: 5, minZ: -1, maxZ: 1 };
    const p = resolveCircle(4.85, 0, NOSE, [wall], BOUNDS, { x: 5.6, z: 0 });
    expect(p.x).toBeCloseTo(4.6 - NOSE);
  });

  it("jangkar diagonal: sisi masuk = sisi yang diseberangi PALING AKHIR", () => {
    // Ruas dari kanan-atas melewati garis maxZ lebih dulu (masih di luar
    // kotak), baru masuk lewat maxX. Sisi seberangnya (minX) dicoret.
    const p = resolveCircle(0.2, 0, NOSE, [THIN], BOUNDS, { x: 0.8, z: 2.3 });
    expect(p.x).toBeCloseTo(0.5 + NOSE);
    // Kotak yang sama diputar 90°: masuk lewat maxZ.
    const flat: Rect = { minX: -2, maxX: 2, minZ: 0, maxZ: 0.5 };
    const q = resolveCircle(0, 0.2, NOSE, [flat], BOUNDS, { x: 2.3, z: 0.8 });
    expect(q.z).toBeCloseTo(0.5 + NOSE);
  });

  it("jangkar tepat di tepi kotak dihitung di luar", () => {
    const p = resolveCircle(0.2, 0, NOSE, [THIN], BOUNDS, { x: 0.5, z: 0.1 });
    expect(p.x).toBeCloseTo(0.5 + NOSE);
  });

  it("sisi seberang dicoret, bukan ditukar: yang terpilih sisi terdekat dari sisanya", () => {
    // Kotak 0,5 × 0,5. Titik dekat pojok kiri-bawah, jangkar di kanan:
    // seberang (minX, 0,10) paling dekat tetapi dicoret; berikutnya minZ
    // (0,12) — lebih dekat daripada sisi masuk maxX (0,40).
    const box: Rect = { minX: 0, maxX: 0.5, minZ: 0, maxZ: 0.5 };
    const p = resolveCircle(0.1, 0.12, NOSE, [box], BOUNDS, { x: 0.9, z: 0.2 });
    expect(p.z).toBeCloseTo(-NOSE);
    expect(p.x).toBeCloseTo(0.1);
  });

  it("jangkar sendiri di dalam kotak: diabaikan", () => {
    const anchored = resolveCircle(0.2, 0, NOSE, [THIN], BOUNDS, {
      x: 0.4,
      z: 0,
    });
    expect(anchored).toEqual(resolveCircle(0.2, 0, NOSE, [THIN], BOUNDS));
  });

  it("pusat di luar kotak: jangkar tidak berpengaruh", () => {
    const anchored = resolveCircle(0.6, 0, NOSE, [THIN], BOUNDS, {
      x: -1,
      z: 0,
    });
    expect(anchored).toEqual(resolveCircle(0.6, 0, NOSE, [THIN], BOUNDS));
  });
});

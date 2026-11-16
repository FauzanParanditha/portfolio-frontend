import type { Point } from "./grid";

/**
 * Tabrakan lingkaran-vs-kotak untuk gerak manual (WASD).
 *
 * Grid navigasi sengaja kasar — cukup untuk mencari jalur, tetapi terlalu
 * "bertangga" untuk gerak bebas: pemain tersangkut di sudut sel dan celah
 * sempit tampak tertutup. Di sini pemain dimodelkan sebagai lingkaran yang
 * didorong keluar dari kotak halangan secara tepat, sehingga ia meluncur mulus
 * di sepanjang rak dan membulat di sudut-sudutnya.
 */

/** Kotak sejajar-sumbu di bidang lantai. */
export interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export function rectFromCenter(
  x: number,
  z: number,
  width: number,
  depth: number,
): Rect {
  return {
    minX: x - width / 2,
    maxX: x + width / 2,
    minZ: z - depth / 2,
    maxZ: z + depth / 2,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Jarak dari titik ke kotak (0 bila titik berada di dalamnya). */
export function distanceToRect(x: number, z: number, rect: Rect): number {
  const dx = x - clamp(x, rect.minX, rect.maxX);
  const dz = z - clamp(z, rect.minZ, rect.maxZ);
  return Math.hypot(dx, dz);
}

/**
 * Posisi terdekat dari (x,z) tempat lingkaran ber-`radius` tidak menembus
 * halangan mana pun dan tetap berada di dalam `bounds`.
 */
export function resolveCircle(
  x: number,
  z: number,
  radius: number,
  obstacles: readonly Rect[],
  bounds: Rect,
): Point {
  let px = x;
  let pz = z;

  // Beberapa putaran: mendorong keluar dari satu kotak bisa memasukkan
  // lingkaran ke kotak tetangganya (mis. di sudut antara rak dan dinding).
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;

    for (const rect of obstacles) {
      const nearX = clamp(px, rect.minX, rect.maxX);
      const nearZ = clamp(pz, rect.minZ, rect.maxZ);
      const dx = px - nearX;
      const dz = pz - nearZ;
      const distSq = dx * dx + dz * dz;
      if (distSq >= radius * radius) continue;

      if (distSq > 1e-12) {
        // Pusat di luar kotak: dorong menjauhi titik terdekat pada kotak.
        const dist = Math.sqrt(distSq);
        const push = (radius - dist) / dist;
        px += dx * push;
        pz += dz * push;
      } else {
        // Pusat di dalam kotak: keluar lewat sisi terdekat — tetapi hanya sisi
        // yang masih menyisakan tempat di dalam batas ruangan. Tanpa syarat
        // itu, kotak yang menempel dinding membuat pemain terpental bolak-balik
        // antara "keluar dari kotak" dan "kembali ke dalam batas".
        const exits: Array<[number, number, number]> = [
          [px - rect.minX, rect.minX - radius, pz],
          [rect.maxX - px, rect.maxX + radius, pz],
          [pz - rect.minZ, px, rect.minZ - radius],
          [rect.maxZ - pz, px, rect.maxZ + radius],
        ];
        let best: [number, number, number] | null = null;
        for (const exit of exits) {
          const [cost, ex, ez] = exit;
          const inside =
            ex >= bounds.minX + radius &&
            ex <= bounds.maxX - radius &&
            ez >= bounds.minZ + radius &&
            ez <= bounds.maxZ - radius;
          if (inside && (best === null || cost < best[0])) best = exit;
        }
        if (best) {
          px = best[1];
          pz = best[2];
        }
      }
      moved = true;
    }

    const bx = clamp(px, bounds.minX + radius, bounds.maxX - radius);
    const bz = clamp(pz, bounds.minZ + radius, bounds.maxZ - radius);
    if (bx !== px || bz !== pz) moved = true;
    px = bx;
    pz = bz;

    if (!moved) break;
  }

  return { x: px, z: pz };
}

/** Apakah lingkaran di (x,z) bebas dari semua halangan dan di dalam batas? */
export function isCircleFree(
  x: number,
  z: number,
  radius: number,
  obstacles: readonly Rect[],
  bounds: Rect,
  tolerance = 1e-4,
): boolean {
  if (
    x < bounds.minX + radius - tolerance ||
    x > bounds.maxX - radius + tolerance ||
    z < bounds.minZ + radius - tolerance ||
    z > bounds.maxZ - radius + tolerance
  ) {
    return false;
  }
  return obstacles.every(
    (rect) => distanceToRect(x, z, rect) >= radius - tolerance,
  );
}

/**
 * Apakah ruas garis a→b menembus kotak sejajar-sumbu? (metode "slab").
 * Dipakai untuk memeriksa apakah sebuah rak menghalangi pandangan ke pemain.
 */
export function segmentHitsBox(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  min: readonly [number, number, number],
  max: readonly [number, number, number],
): boolean {
  let tMin = 0;
  let tMax = 1;
  for (let axis = 0; axis < 3; axis++) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-9) {
      if (a[axis] < min[axis] || a[axis] > max[axis]) return false;
      continue;
    }
    let t1 = (min[axis] - a[axis]) / delta;
    let t2 = (max[axis] - a[axis]) / delta;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    if (tMin > tMax) return false;
  }
  return true;
}

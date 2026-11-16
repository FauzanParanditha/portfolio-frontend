import { isCircleFree, type Rect, resolveCircle } from "./collision";
import { findRoute, type Grid, type Point } from "./grid";
import { PLAYER_RADIUS } from "./layout";

/**
 * Simulasi gerak pemain (robot anjing) di bidang lantai.
 *
 * Fungsi murni atas satu objek keadaan yang dimutasi — dipanggil tiap frame
 * oleh scene dengan `dt` sebenarnya, dan oleh test dengan `dt` tetap. Tidak
 * tahu apa-apa soal three.js; scene hanya membaca `x/z/heading/speed`.
 *
 * `heading` = rotasi Y dalam radian; 0 menghadap +Z, π menghadap -Z (ke rak).
 */

export const MAX_SPEED = 3.4;
const ACCELERATION = 10;
const DECELERATION = 12;
const TURN_RATE = 9;
/** Jarak dianggap "sampai" di sebuah titik belok. */
const WAYPOINT_EPSILON = 0.06;
/** Arah hadap saat berdiri di depan rak. */
export const FACE_RACK_HEADING = Math.PI;

export interface Sim {
  x: number;
  z: number;
  heading: number;
  speed: number;
  route: Point[];
  routeIndex: number;
  /** Slot rak yang sedang dituju; `null` bila hanya berjalan ke titik lantai. */
  targetSlot: number | null;
  /** Arah hadap yang dikejar saat diam (mis. menghadap rak setelah tiba). */
  faceHeading: number | null;
  /** Titik tujuan untuk penanda di lantai. */
  marker: Point | null;
}

/**
 * Yang dibutuhkan simulasi dari tata letak ruangan. `RoomLayout` memenuhinya,
 * jadi scene cukup meneruskan `layout`.
 */
export interface Navigation {
  grid: Grid;
  obstacles: readonly Rect[];
  bounds: Rect;
}

/** Langkah terpanjang per sub-langkah tabrakan; mencegah menembus halangan. */
const MAX_COLLISION_STEP = 0.12;

export interface SimInput {
  /** Arah gerak manual (WASD) di ruang dunia; panjang 0..1. */
  moveX: number;
  moveZ: number;
}

export interface SimEvent {
  type: "arrived";
  slot: number | null;
}

export function createSim(spawn: Point, heading = FACE_RACK_HEADING): Sim {
  return {
    x: spawn.x,
    z: spawn.z,
    heading,
    speed: 0,
    route: [],
    routeIndex: 0,
    targetSlot: null,
    faceHeading: null,
    marker: null,
  };
}

function clearRoute(sim: Sim): void {
  sim.route = [];
  sim.routeIndex = 0;
  sim.targetSlot = null;
  sim.marker = null;
}

/**
 * Arahkan pemain ke `to`. Mengembalikan `false` bila tidak ada jalur (keadaan
 * tidak diubah). `slot` diisi bila tujuannya titik berdiri sebuah rak.
 */
export function setDestination(
  sim: Sim,
  grid: Grid,
  to: Point,
  slot: number | null = null,
): boolean {
  const route = findRoute(grid, { x: sim.x, z: sim.z }, to, PLAYER_RADIUS / 2);
  if (!route) return false;

  // Sudah berdiri di sel tujuan: rute hanya berisi satu titik. Tambahkan titik
  // awal supaya langkah berikutnya tetap menghasilkan peristiwa `arrived`
  // (mis. memilih rak yang sedang dihadapi harus tetap membuka panelnya).
  if (route.length === 1) route.unshift({ x: sim.x, z: sim.z });

  sim.route = route;
  // Titik pertama adalah posisi sekarang.
  sim.routeIndex = 1;
  sim.targetSlot = slot;
  sim.faceHeading = null;
  sim.marker = route[route.length - 1];
  return true;
}

/** Pindah seketika (dipakai saat pengguna meminta gerak dikurangi). */
export function teleport(sim: Sim, to: Point, heading: number): void {
  clearRoute(sim);
  sim.x = to.x;
  sim.z = to.z;
  sim.heading = heading;
  sim.speed = 0;
  sim.faceHeading = null;
}

export function isMoving(sim: Sim): boolean {
  return sim.speed > 0.01 || sim.routeIndex < sim.route.length;
}

/** Selisih sudut terpendek dari `from` ke `to`, dalam (-π, π]. */
export function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function turnToward(sim: Sim, target: number, dt: number): void {
  sim.heading +=
    angleDelta(sim.heading, target) * (1 - Math.exp(-TURN_RATE * dt));
}

function remainingDistance(sim: Sim): number {
  let total = 0;
  let px = sim.x;
  let pz = sim.z;
  for (let i = sim.routeIndex; i < sim.route.length; i++) {
    total += Math.hypot(sim.route[i].x - px, sim.route[i].z - pz);
    px = sim.route[i].x;
    pz = sim.route[i].z;
  }
  return total;
}

/**
 * Majukan simulasi sebesar `dt` detik. Mengembalikan peristiwa `arrived` tepat
 * pada frame pemain mencapai ujung rutenya; selain itu `null`.
 */
export function stepSim(
  sim: Sim,
  nav: Navigation,
  dt: number,
  input: SimInput,
): SimEvent | null {
  // Tab yang baru kembali aktif bisa memberi dt sangat besar; batasi supaya
  // pemain tidak melompati dinding.
  const step = Math.min(Math.max(dt, 0), 0.1);
  if (step === 0) return null;

  const manualMagnitude = Math.hypot(input.moveX, input.moveZ);

  // ── Kendali manual (WASD): membatalkan rute yang sedang berjalan. ──
  if (manualMagnitude > 0.01) {
    clearRoute(sim);
    sim.faceHeading = null;

    const dirX = input.moveX / manualMagnitude;
    const dirZ = input.moveZ / manualMagnitude;
    const desired = MAX_SPEED * Math.min(1, manualMagnitude);
    sim.speed =
      desired > sim.speed
        ? Math.min(desired, sim.speed + ACCELERATION * step)
        : Math.max(desired, sim.speed - DECELERATION * step);

    // Gerak dipecah menjadi sub-langkah pendek, masing-masing diselesaikan
    // terhadap kotak halangan yang tepat. Lingkaran pemain "meluncur" di
    // sepanjang rak dan membulat di sudutnya, tanpa tersangkut.
    const dist = sim.speed * step;
    const subSteps = Math.max(1, Math.ceil(dist / MAX_COLLISION_STEP));
    const fromX = sim.x;
    const fromZ = sim.z;
    for (let i = 0; i < subSteps; i++) {
      const resolved = resolveCircle(
        sim.x + (dirX * dist) / subSteps,
        sim.z + (dirZ * dist) / subSteps,
        PLAYER_RADIUS,
        nav.obstacles,
        nav.bounds,
      );
      // Celah yang lebih sempit dari badan pemain tidak punya posisi sah;
      // dalam kasus itu tetap di tempat daripada menembus.
      if (
        !isCircleFree(
          resolved.x,
          resolved.z,
          PLAYER_RADIUS,
          nav.obstacles,
          nav.bounds,
          1e-3,
        )
      ) {
        break;
      }
      sim.x = resolved.x;
      sim.z = resolved.z;
    }
    // Menabrak tegak lurus: laju turun ke laju nyata, supaya animasi lari
    // tidak terus berputar di tempat.
    const travelled = Math.hypot(sim.x - fromX, sim.z - fromZ);
    sim.speed = Math.min(sim.speed, travelled / step + 0.6);
    turnToward(sim, Math.atan2(dirX, dirZ), step);
    return null;
  }

  // ── Mengikuti rute. ──
  if (sim.routeIndex < sim.route.length) {
    const remaining = remainingDistance(sim);
    // Melambat mulus menjelang tujuan: v = √(2·a·s), dengan batas bawah kecil
    // supaya tidak "merayap" tanpa henti di sentimeter terakhir.
    const desired = Math.min(
      MAX_SPEED,
      Math.max(0.5, Math.sqrt(2 * DECELERATION * remaining)),
    );
    sim.speed =
      desired > sim.speed
        ? Math.min(desired, sim.speed + ACCELERATION * step)
        : Math.max(desired, sim.speed - DECELERATION * step);

    let budget = sim.speed * step;
    while (budget > 0 && sim.routeIndex < sim.route.length) {
      const target = sim.route[sim.routeIndex];
      const dx = target.x - sim.x;
      const dz = target.z - sim.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= WAYPOINT_EPSILON || dist <= budget) {
        sim.x = target.x;
        sim.z = target.z;
        budget -= dist;
        sim.routeIndex++;
        if (dist > 1e-4) turnToward(sim, Math.atan2(dx, dz), step);
        continue;
      }

      sim.x += (dx / dist) * budget;
      sim.z += (dz / dist) * budget;
      turnToward(sim, Math.atan2(dx, dz), step);
      budget = 0;
    }

    if (sim.routeIndex >= sim.route.length) {
      const slot = sim.targetSlot;
      clearRoute(sim);
      sim.speed = 0;
      sim.faceHeading = slot !== null ? FACE_RACK_HEADING : null;
      return { type: "arrived", slot };
    }
    return null;
  }

  // ── Diam. ──
  sim.speed = Math.max(0, sim.speed - DECELERATION * step);
  if (sim.faceHeading !== null) {
    turnToward(sim, sim.faceHeading, step);
    if (Math.abs(angleDelta(sim.heading, sim.faceHeading)) < 0.01) {
      sim.heading = sim.faceHeading;
      sim.faceHeading = null;
    }
  }
  return null;
}

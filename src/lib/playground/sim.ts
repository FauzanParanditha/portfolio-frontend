import {
  isCircleFree,
  penetrationDepth,
  type Rect,
  resolveCircle,
} from "./collision";
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
  /** Arah gerak manual terakhir (satuan); dipakai untuk meluncur saat berhenti. */
  moveDirX: number;
  moveDirZ: number;
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
/**
 * Lingkaran kedua di depan badan, mewakili kepala. Tanpa ini pemain bisa
 * menempelkan badannya ke rak sementara kepalanya (yang menjulur jauh di depan
 * pusat badan) masuk menembus rak.
 */
export const NOSE_OFFSET = 0.6;
export const NOSE_RADIUS = 0.22;
/** Jarak ke tujuan saat pemeriksaan "kepala akan menabrak" mulai berlaku. */
const NOSE_STOP_RANGE = NOSE_OFFSET + NOSE_RADIUS + 0.4;

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
    moveDirX: 0,
    moveDirZ: 0,
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

/** Kedalaman lingkaran "hidung" menembus halangan, untuk pose tertentu. */
function noseDepth(
  nav: Navigation,
  x: number,
  z: number,
  heading: number,
): number {
  return penetrationDepth(
    x + Math.sin(heading) * NOSE_OFFSET,
    z + Math.cos(heading) * NOSE_OFFSET,
    NOSE_RADIUS,
    nav.obstacles,
    nav.bounds,
  );
}

/**
 * Putar menuju `target`, tetapi jangan sampai mengayunkan kepala ke dalam
 * halangan. Putaran yang memperdalam tembusan hidung dikurangi (setengah,
 * seperempat) atau dibatalkan; pemain lalu bergerak tanpa berputar — seperti
 * anjing yang mundur keluar dari celah sempit.
 */
function turnToward(
  sim: Sim,
  nav: Navigation,
  target: number,
  dt: number,
): void {
  const delta =
    angleDelta(sim.heading, target) * (1 - Math.exp(-TURN_RATE * dt));
  if (delta === 0) return;
  const current = noseDepth(nav, sim.x, sim.z, sim.heading);
  for (const fraction of [1, 0.5, 0.25]) {
    const heading = sim.heading + delta * fraction;
    if (noseDepth(nav, sim.x, sim.z, heading) <= current + 1e-4) {
      sim.heading = heading;
      return;
    }
  }
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
 * Geser pemain sejauh `dist` ke arah (dirX, dirZ) dengan tabrakan tepat.
 * Mengembalikan jarak yang benar-benar ditempuh.
 *
 * Gerak dipecah menjadi sub-langkah pendek. Di tiap sub-langkah:
 * 1. lingkaran badan didorong keluar dari kotak halangan (meluncur di
 *    sepanjang rak, membulat di sudut);
 * 2. bila lingkaran "hidung" di depan menembus, badan digeser mundur — tetapi
 *    PALING BANYAK sejauh sub-langkah itu sendiri;
 * 3. perpindahan total sub-langkah dibatasi sepanjang sub-langkah.
 *
 * Batas di (2) dan (3) penting: hidung bisa saja sudah berada jauh di dalam
 * halangan saat gerak manual dimulai (mis. baru tiba lewat rute). Koreksi
 * penuh sekaligus akan melempar pemain beberapa meter dalam satu frame; dengan
 * batas ini ia paling cepat bergerak secepat langkahnya sendiri.
 */
function moveWithCollision(
  sim: Sim,
  nav: Navigation,
  dirX: number,
  dirZ: number,
  dist: number,
): number {
  if (dist <= 0) return 0;
  const subSteps = Math.max(1, Math.ceil(dist / MAX_COLLISION_STEP));
  const stepLength = dist / subSteps;
  const fromX = sim.x;
  const fromZ = sim.z;
  const forwardX = Math.sin(sim.heading);
  const forwardZ = Math.cos(sim.heading);
  const { obstacles, bounds } = nav;

  for (let i = 0; i < subSteps; i++) {
    const startX = sim.x;
    const startZ = sim.z;
    let body = resolveCircle(
      startX + dirX * stepLength,
      startZ + dirZ * stepLength,
      PLAYER_RADIUS,
      obstacles,
      bounds,
    );

    const noseX = body.x + forwardX * NOSE_OFFSET;
    const noseZ = body.z + forwardZ * NOSE_OFFSET;
    const nose = resolveCircle(noseX, noseZ, NOSE_RADIUS, obstacles, bounds);
    const pushX = nose.x - noseX;
    const pushZ = nose.z - noseZ;
    const pushLength = Math.hypot(pushX, pushZ);
    if (pushLength > 1e-9) {
      const allowed = Math.min(pushLength, stepLength) / pushLength;
      body = resolveCircle(
        body.x + pushX * allowed,
        body.z + pushZ * allowed,
        PLAYER_RADIUS,
        obstacles,
        bounds,
      );
    }

    const movedX = body.x - startX;
    const movedZ = body.z - startZ;
    const moved = Math.hypot(movedX, movedZ);
    if (moved > stepLength) {
      // Titik hasil pemendekan terletak di garis lurus antara dua posisi
      // sah, yang bisa saja memotong sudut halangan — selesaikan sekali lagi.
      const scale = stepLength / moved;
      body = resolveCircle(
        startX + movedX * scale,
        startZ + movedZ * scale,
        PLAYER_RADIUS,
        obstacles,
        bounds,
      );
    }

    // Celah yang lebih sempit dari badan pemain tidak punya posisi sah;
    // dalam kasus itu tetap di tempat daripada menembus.
    if (!isCircleFree(body.x, body.z, PLAYER_RADIUS, obstacles, bounds, 1e-3)) {
      break;
    }
    sim.x = body.x;
    sim.z = body.z;
  }
  return Math.hypot(sim.x - fromX, sim.z - fromZ);
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
    sim.moveDirX = dirX;
    sim.moveDirZ = dirZ;
    const desired = MAX_SPEED * Math.min(1, manualMagnitude);
    sim.speed =
      desired > sim.speed
        ? Math.min(desired, sim.speed + ACCELERATION * step)
        : Math.max(desired, sim.speed - DECELERATION * step);

    const travelled = moveWithCollision(sim, nav, dirX, dirZ, sim.speed * step);
    // Menabrak tegak lurus: laju turun ke laju nyata, supaya animasi lari
    // tidak terus berputar di tempat.
    sim.speed = Math.min(sim.speed, travelled / step + 0.6);
    turnToward(sim, nav, Math.atan2(dirX, dirZ), step);
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

      // Meter terakhir menuju titik lantai (bukan rak): berhenti sebelum kepala
      // masuk ke rak/dinding di depannya. Diperiksa di semua ruas dalam jarak
      // itu, bukan hanya ruas terakhir — dekat dinding rute sering berupa
      // banyak ruas pendek. Titik berdiri rak dijamin lega,
      // jadi tujuan rak tidak pernah dipotong.
      if (
        sim.targetSlot === null &&
        remaining <= NOSE_STOP_RANGE &&
        dist > 1e-4
      ) {
        const reach = Math.min(budget, dist);
        const nextX = sim.x + (dx / dist) * reach;
        const nextZ = sim.z + (dz / dist) * reach;
        const travelHeading = Math.atan2(dx, dz);
        const worsens = (heading: number) =>
          noseDepth(nav, nextX, nextZ, heading) >
          Math.max(1e-3, noseDepth(nav, sim.x, sim.z, heading));
        if (worsens(travelHeading) || worsens(sim.heading)) {
          sim.routeIndex = sim.route.length;
          break;
        }
      }

      if (dist <= WAYPOINT_EPSILON || dist <= budget) {
        sim.x = target.x;
        sim.z = target.z;
        budget -= dist;
        sim.routeIndex++;
        if (dist > 1e-4) turnToward(sim, nav, Math.atan2(dx, dz), step);
        continue;
      }

      sim.x += (dx / dist) * budget;
      sim.z += (dz / dist) * budget;
      turnToward(sim, nav, Math.atan2(dx, dz), step);
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

  // ── Diam. Sisa laju dihabiskan dengan meluncur sebentar searah GERAK
  // terakhir (bukan arah hadap, yang bisa masih setengah berputar), supaya
  // kaki tidak melangkah di tempat setelah tombol dilepas. ──
  if (sim.speed > 0) {
    sim.speed = Math.max(0, sim.speed - DECELERATION * step);
    const travelled = moveWithCollision(
      sim,
      nav,
      sim.moveDirX,
      sim.moveDirZ,
      sim.speed * step,
    );
    sim.speed = Math.min(sim.speed, travelled / step + 0.6);
  }
  if (sim.faceHeading !== null) {
    turnToward(sim, nav, sim.faceHeading, step);
    if (Math.abs(angleDelta(sim.heading, sim.faceHeading)) < 0.01) {
      sim.heading = sim.faceHeading;
      sim.faceHeading = null;
    }
  }
  return null;
}

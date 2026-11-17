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
  /** Arah gerak terakhir (satuan); dipakai untuk meluncur saat berhenti. */
  moveDirX: number;
  moveDirZ: number;
  /**
   * Upaya mundur dari halangan sudah mentok di pose ini; jangan dicoba lagi
   * sampai pemain bergerak (mencegah "lari di tempat" tanpa akhir).
   */
  settleBlocked: boolean;
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
/** Laju mundur saat pemain diam dengan kepala di dalam halangan. */
const SETTLE_SPEED = 1.5;
/** Tembusan hidung sekecil ini dibiarkan (hindari gerak mikro tanpa henti). */
const SETTLE_TOLERANCE = 0.01;
/** Tindihan badan sekecil ini dianggap bebas. */
const BODY_SETTLE_TOLERANCE = 5e-5;

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
    settleBlocked: false,
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
  sim.settleBlocked = false;
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
  sim.settleBlocked = false;
}

export function isMoving(sim: Sim): boolean {
  return sim.speed > 0.01 || sim.routeIndex < sim.route.length;
}

/** Selisih sudut terpendek dari `from` ke `to`, dalam (-π, π]. */
export function angleDelta(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * Putar menuju `target`. Putaran sengaja TIDAK dibatasi oleh halangan: arah
 * hadap harus selalu mengikuti arah gerak. Bila putaran membuat kepala masuk
 * ke rak/dinding, itu dikoreksi dengan menggeser badan (saat bergerak) atau
 * mundur selangkah (saat diam) — bukan dengan membekukan arah hadap.
 */
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
 * Geser pemain sejauh `dist` ke arah (dirX, dirZ) dengan tabrakan tepat.
 * Mengembalikan jarak yang benar-benar ditempuh.
 *
 * Gerak dipecah menjadi sub-langkah pendek. Di tiap sub-langkah:
 * 1. lingkaran badan didorong keluar dari kotak halangan (meluncur di
 *    sepanjang rak, membulat di sudut);
 * 2. bila lingkaran "hidung" di depan menembus, bagian gerak yang mendorongnya
 *    makin dalam dibuang, lalu badan digeser mundur — tetapi PALING BANYAK
 *    sejauh sub-langkah itu sendiri;
 * 3. perpindahan total sub-langkah dibatasi sepanjang sub-langkah.
 *
 * Batas di (2) dan (3) penting: hidung bisa saja sudah berada jauh di dalam
 * halangan saat gerak manual dimulai (mis. baru tiba lewat rute, atau baru
 * berputar di dekat dinding). Koreksi penuh sekaligus akan melempar pemain
 * beberapa meter dalam satu frame; dengan batas ini ia bergerak paling cepat
 * secepat langkahnya sendiri.
 *
 * Satu pengecualian: bila BADAN sendiri sedang menindih geometri (rute
 * diikuti di grid, jadi bisa tiba dengan tindihan sampai ±8 cm) dan tombol
 * ditekan sebelum sempat dirapikan, langkah (1) mengeluarkannya sekaligus —
 * sentakan paling banyak sebesar tindihan itu, sekali.
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
    let moveX = dirX * stepLength;
    let moveZ = dirZ * stepLength;

    // Kepala sudah di dalam halangan sebelum melangkah: buang bagian gerak
    // yang mendorongnya makin dalam. Tanpa ini, menahan tombol ke arah dinding
    // tepat mengimbangi koreksi hidung dan kepala tertahan di dalam dinding
    // selama tombol ditahan.
    const headX = startX + forwardX * NOSE_OFFSET;
    const headZ = startZ + forwardZ * NOSE_OFFSET;
    const headFree = resolveCircle(
      headX,
      headZ,
      NOSE_RADIUS,
      obstacles,
      bounds,
    );
    const outX = headFree.x - headX;
    const outZ = headFree.z - headZ;
    const out = Math.hypot(outX, outZ);
    if (out > 1e-9) {
      const inward = (moveX * outX + moveZ * outZ) / out;
      if (inward < 0) {
        moveX -= (inward * outX) / out;
        moveZ -= (inward * outZ) / out;
      }
    }

    let body = resolveCircle(
      startX + moveX,
      startZ + moveZ,
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
    sim.settleBlocked = false;

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
  //
  // Rute dicari di grid kasar dan diikuti tanpa tabrakan tepat, jadi pemain
  // bisa tiba dengan badan sedikit menindih halangan, atau dengan kepala di
  // dalam rak/dinding (juga setelah berputar di dekat dinding). Saat diam,
  // ia mundur selangkah menjauhi halangan itu. Rute dan arah hadap tidak
  // diganggu: pemain selalu sampai ke titik yang diklik, baru merapikan diri.
  if (!sim.settleBlocked) {
    const { obstacles, bounds } = nav;
    const body = resolveCircle(sim.x, sim.z, PLAYER_RADIUS, obstacles, bounds);
    const overlap = Math.hypot(body.x - sim.x, body.z - sim.z);

    if (overlap > BODY_SETTLE_TOLERANCE) {
      // Badan menindih halangan (tiba lewat rute): geser keluar bertahap,
      // langsung menuju posisi bebas terdekat. Sengaja tidak lewat
      // `moveWithCollision`, yang akan mengeluarkannya sekaligus dalam satu
      // frame (terlihat sebagai sentakan beberapa sentimeter).
      const reach = Math.min(1, (SETTLE_SPEED * step) / overlap);
      sim.x += (body.x - sim.x) * reach;
      sim.z += (body.z - sim.z) * reach;
    } else {
      // Badan bebas; periksa kepala.
      const noseX = sim.x + Math.sin(sim.heading) * NOSE_OFFSET;
      const noseZ = sim.z + Math.cos(sim.heading) * NOSE_OFFSET;
      if (
        penetrationDepth(noseX, noseZ, NOSE_RADIUS, obstacles, bounds) >
        SETTLE_TOLERANCE
      ) {
        const nose = resolveCircle(
          noseX,
          noseZ,
          NOSE_RADIUS,
          obstacles,
          bounds,
        );
        const pushX = nose.x - noseX;
        const pushZ = nose.z - noseZ;
        const push = Math.hypot(pushX, pushZ);
        if (push > 1e-6) {
          sim.moveDirX = pushX / push;
          sim.moveDirZ = pushZ / push;
          // Laju mundur MENGGANTIKAN sisa laju luncur (bukan maksimum
          // keduanya): kalau laju luncur dibawa ke arah baru ini, pemain
          // "memantul" jauh dari dinding padahal kepalanya baru masuk 1 cm.
          // Dan tidak lebih cepat dari yang dibutuhkan untuk menutup sisa
          // jaraknya dalam satu frame.
          sim.speed = Math.min(SETTLE_SPEED, push / step) + DECELERATION * step;
        }
      }
    }
  }

  // Sisa laju dihabiskan dengan meluncur sebentar searah GERAK terakhir
  // (bukan arah hadap, yang bisa masih setengah berputar), supaya kaki tidak
  // melangkah di tempat setelah tombol dilepas.
  if (sim.speed > 0) {
    sim.speed = Math.max(0, sim.speed - DECELERATION * step);
    const wanted = sim.speed * step;
    const travelled = moveWithCollision(
      sim,
      nav,
      sim.moveDirX,
      sim.moveDirZ,
      wanted,
    );
    // Sama sekali tidak bisa bergerak: berhenti mencoba di pose ini.
    if (wanted > 1e-4 && travelled < 1e-4) {
      sim.speed = 0;
      sim.settleBlocked = true;
    } else {
      sim.speed = Math.min(sim.speed, travelled / step + 0.6);
    }
  }
  if (sim.faceHeading !== null) {
    turnToward(sim, sim.faceHeading, step);
    if (Math.abs(angleDelta(sim.heading, sim.faceHeading)) < 0.01) {
      sim.heading = sim.faceHeading;
      sim.faceHeading = null;
    }
  }
  return null;
}

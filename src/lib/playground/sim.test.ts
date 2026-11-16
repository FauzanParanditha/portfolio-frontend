import { describe, expect, it } from "vitest";
import { isCircleFree } from "./collision";
import { isWalkableAt, routeLength } from "./grid";
import { buildLayout, PLAYER_RADIUS, RACK } from "./layout";
import {
  angleDelta,
  createSim,
  FACE_RACK_HEADING,
  isMoving,
  MAX_SPEED,
  setDestination,
  stepSim,
  teleport,
  type SimEvent,
} from "./sim";

const IDLE = { moveX: 0, moveZ: 0 };

/** Lingkaran pemain tidak menembus rak/properti/dinding (geometri tepat). */
function isFree(
  layout: ReturnType<typeof buildLayout>,
  x: number,
  z: number,
): boolean {
  return isCircleFree(x, z, PLAYER_RADIUS, layout.obstacles, layout.bounds);
}
const DT = 1 / 60;

/** Jalankan simulasi sampai ada peristiwa atau batas waktu habis. */
function runUntilEvent(
  sim: ReturnType<typeof createSim>,
  layout: ReturnType<typeof buildLayout>,
  seconds = 30,
): { event: SimEvent | null; maxSpeed: number; alwaysWalkable: boolean } {
  let maxSpeed = 0;
  let alwaysWalkable = true;
  for (let i = 0; i < seconds * 60; i++) {
    const event = stepSim(sim, layout, DT, IDLE);
    maxSpeed = Math.max(maxSpeed, sim.speed);
    if (!isWalkableAt(layout.grid, sim.x, sim.z)) alwaysWalkable = false;
    if (event) return { event, maxSpeed, alwaysWalkable };
  }
  return { event: null, maxSpeed, alwaysWalkable };
}

describe("sim: mengikuti rute", () => {
  it("berjalan ke rak terjauh, tiba tepat di titik berdiri, lalu menghadap rak", () => {
    const layout = buildLayout(8);
    const sim = createSim(layout.spawn);
    const slot = layout.slots[7];

    expect(setDestination(sim, layout.grid, slot.approach, slot.index)).toBe(
      true,
    );
    expect(isMoving(sim)).toBe(true);
    expect(sim.marker).toEqual(slot.approach);

    const { event, maxSpeed, alwaysWalkable } = runUntilEvent(sim, layout);
    expect(event).toEqual({ type: "arrived", slot: 7 });
    expect(sim.x).toBeCloseTo(slot.approach.x, 3);
    expect(sim.z).toBeCloseTo(slot.approach.z, 3);
    expect(sim.speed).toBe(0);
    expect(sim.marker).toBeNull();
    expect(maxSpeed).toBeLessThanOrEqual(MAX_SPEED + 1e-6);
    expect(maxSpeed).toBeGreaterThan(MAX_SPEED * 0.9);
    // Sepanjang jalan tidak pernah menembus rak atau dinding.
    expect(alwaysWalkable).toBe(true);

    // Setelah tiba: berputar menghadap rak, lalu benar-benar diam.
    for (let i = 0; i < 120; i++) stepSim(sim, layout, DT, IDLE);
    expect(Math.abs(angleDelta(sim.heading, FACE_RACK_HEADING))).toBeLessThan(
      0.02,
    );
    expect(isMoving(sim)).toBe(false);
  });

  it("berjalan ke titik lantai biasa menghasilkan arrived tanpa slot", () => {
    const layout = buildLayout(4);
    const sim = createSim(layout.spawn);
    setDestination(sim, layout.grid, { x: 2, z: layout.spawn.z });
    const { event } = runUntilEvent(sim, layout);
    expect(event).toEqual({ type: "arrived", slot: null });
    expect(sim.faceHeading).toBeNull();
  });

  it("tujuan baru di tengah jalan menggantikan yang lama", () => {
    const layout = buildLayout(8);
    const sim = createSim(layout.spawn);
    setDestination(sim, layout.grid, layout.slots[7].approach, 7);
    for (let i = 0; i < 30; i++) stepSim(sim, layout, DT, IDLE);
    setDestination(sim, layout.grid, layout.slots[0].approach, 0);
    const { event } = runUntilEvent(sim, layout);
    expect(event).toEqual({ type: "arrived", slot: 0 });
  });

  it("dt raksasa (tab baru aktif lagi) tidak melempar pemain keluar ruangan", () => {
    const layout = buildLayout(8);
    const sim = createSim(layout.spawn);
    setDestination(sim, layout.grid, layout.slots[7].approach, 7);
    for (let i = 0; i < 400; i++) {
      stepSim(sim, layout, 5, IDLE);
      expect(isWalkableAt(layout.grid, sim.x, sim.z)).toBe(true);
    }
  });
});

describe("sim: kendali manual", () => {
  it("WASD membatalkan rute dan menggerakkan pemain ke arah input", () => {
    const layout = buildLayout(4);
    const sim = createSim(layout.spawn);
    setDestination(sim, layout.grid, layout.slots[3].approach, 3);
    const startX = sim.x;

    for (let i = 0; i < 30; i++) {
      stepSim(sim, layout, DT, { moveX: 1, moveZ: 0 });
    }
    expect(sim.route).toHaveLength(0);
    expect(sim.targetSlot).toBeNull();
    expect(sim.marker).toBeNull();
    expect(sim.x).toBeGreaterThan(startX + 0.5);
    // Menghadap +X ≈ heading π/2.
    expect(Math.abs(angleDelta(sim.heading, Math.PI / 2))).toBeLessThan(0.2);
  });

  it("tidak bisa menembus dinding atau rak, berapa lama pun ditahan", () => {
    const layout = buildLayout(4);
    const sim = createSim(layout.spawn);
    for (const [moveX, moveZ] of [
      [-1, 0],
      [0, 1],
      [1, -1],
      [0, -1],
    ]) {
      for (let i = 0; i < 600; i++) {
        stepSim(sim, layout, DT, { moveX, moveZ });
        expect(isFree(layout, sim.x, sim.z)).toBe(true);
      }
    }
  });

  it("melepas tombol membuat pemain melambat sampai berhenti", () => {
    const layout = buildLayout(4);
    const sim = createSim(layout.spawn);
    for (let i = 0; i < 30; i++) {
      stepSim(sim, layout, DT, { moveX: 1, moveZ: 0 });
    }
    expect(sim.speed).toBeGreaterThan(1);
    for (let i = 0; i < 60; i++) stepSim(sim, layout, DT, IDLE);
    expect(sim.speed).toBe(0);
  });
});

describe("sim: utilitas", () => {
  it("teleport memindahkan seketika dan menghentikan gerak", () => {
    const layout = buildLayout(4);
    const sim = createSim(layout.spawn);
    setDestination(sim, layout.grid, layout.slots[2].approach, 2);
    teleport(sim, layout.slots[1].approach, FACE_RACK_HEADING);
    expect(sim.x).toBe(layout.slots[1].approach.x);
    expect(sim.heading).toBe(FACE_RACK_HEADING);
    expect(isMoving(sim)).toBe(false);
    expect(stepSim(sim, layout, DT, IDLE)).toBeNull();
  });

  it("angleDelta memilih arah putar terpendek", () => {
    expect(angleDelta(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(angleDelta(-3, 3)).toBeCloseTo(-(2 * Math.PI - 6));
    expect(angleDelta(1, 1)).toBeCloseTo(0);
  });

  it("dt nol atau negatif tidak mengubah apa pun", () => {
    const layout = buildLayout(4);
    const sim = createSim(layout.spawn);
    setDestination(sim, layout.grid, layout.slots[0].approach, 0);
    const before = { x: sim.x, z: sim.z };
    stepSim(sim, layout, 0, IDLE);
    stepSim(sim, layout, -1, IDLE);
    expect({ x: sim.x, z: sim.z }).toEqual(before);
  });
});

describe("sim: celah antar-rak (regresi: dulu tertutup total)", () => {
  it("W dari depan celah menembus ke lorong belakang, dari posisi & sudut kamera mana pun", () => {
    const layout = buildLayout(4);
    const [a, b] = layout.slots;
    const mid = (a.x + b.x) / 2;
    const behind = a.z - RACK.depth / 2 - 0.5;

    // Berbagai titik mulai di depan celah × berbagai arah "maju" kamera.
    for (const startX of [mid, mid - 0.3, mid + 0.3]) {
      // Kamera bawaan (0.38) dan sekitarnya: "maju" kira-kira ke arah celah.
      for (const azimuth of [0, 0.38, -0.38]) {
        const sim = createSim({ x: startX, z: a.approach.z });
        const input = {
          moveX: -Math.sin(azimuth),
          moveZ: -Math.cos(azimuth),
        };
        let passed = false;
        for (let i = 0; i < 360 && !passed; i++) {
          stepSim(sim, layout, DT, input);
          expect(isFree(layout, sim.x, sim.z)).toBe(true);
          // Lolos = sudah di belakang baris, dan lewatnya memang di celah ini.
          if (sim.z < behind && sim.x > a.x && sim.x < b.x) passed = true;
        }
        expect(passed, `mulai x=${startX} azimuth=${azimuth}`).toBe(true);
      }
    }
  });

  it("kamera sangat serong: tetap sampai ke belakang baris tanpa menembus apa pun", () => {
    const layout = buildLayout(4);
    const [a, b] = layout.slots;
    const sim = createSim({ x: (a.x + b.x) / 2, z: a.approach.z });
    const azimuth = 0.9;
    for (let i = 0; i < 480; i++) {
      stepSim(sim, layout, DT, {
        moveX: -Math.sin(azimuth),
        moveZ: -Math.cos(azimuth),
      });
      expect(isFree(layout, sim.x, sim.z)).toBe(true);
    }
    expect(sim.z).toBeLessThan(a.z - RACK.depth / 2);
  });

  it("menabrak muka rak membuat pemain meluncur, bukan berhenti mati", () => {
    const layout = buildLayout(4);
    const a = layout.slots[0];
    const sim = createSim({ x: a.x + 0.1, z: a.approach.z });
    // Maju serong ke kanan, tepat ke muka rak.
    for (let i = 0; i < 240; i++) {
      stepSim(sim, layout, DT, { moveX: 0.5, moveZ: -1 });
    }
    // Sudah melewati rak lewat celah di kanannya.
    expect(sim.z).toBeLessThan(a.z - RACK.depth / 2);
    expect(isFree(layout, sim.x, sim.z)).toBe(true);
  });

  it("klik-untuk-jalan ke lorong belakang memotong lewat celah, tidak memutar", () => {
    const layout = buildLayout(8);
    const front = layout.slots[1];
    const back = layout.slots[5]; // tepat di belakang `front`
    const sim = createSim(front.approach);
    expect(setDestination(sim, layout.grid, back.approach, back.index)).toBe(
      true,
    );
    // Lurus = jarak antar-baris. Memutar lewat lorong samping jauh lebih panjang.
    const straight = front.approach.z - back.approach.z;
    expect(routeLength(sim.route)).toBeLessThan(straight + 2.5);

    let event = null;
    for (let i = 0; i < 1200 && !event; i++) {
      event = stepSim(sim, layout, DT, IDLE);
      // Sepanjang rute, pusat pemain tidak pernah masuk ke dalam kotak rak.
      expect(
        isCircleFree(sim.x, sim.z, 0.1, layout.obstacles, layout.bounds),
      ).toBe(true);
    }
    expect(event).toEqual({ type: "arrived", slot: back.index });
  });
});

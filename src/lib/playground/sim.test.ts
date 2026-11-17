import { describe, expect, it } from "vitest";
import { distanceToRect, isCircleFree, penetrationDepth } from "./collision";
import { findRoute, isWalkableAt, routeLength } from "./grid";
import { buildLayout, PLAYER_RADIUS, RACK } from "./layout";
import {
  angleDelta,
  createSim,
  FACE_RACK_HEADING,
  isMoving,
  MAX_SPEED,
  NOSE_OFFSET,
  NOSE_RADIUS,
  setDestination,
  stepSim,
  teleport,
  type SimEvent,
} from "./sim";

const IDLE = { moveX: 0, moveZ: 0 };

/** Pembangkit acak berbenih: hasil sama tiap dijalankan. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

/** Seberapa dalam lingkaran "hidung" menembus halangan/dinding. */
function noseDepth(
  layout: ReturnType<typeof buildLayout>,
  sim: { x: number; z: number; heading: number },
): number {
  return penetrationDepth(
    sim.x + Math.sin(sim.heading) * NOSE_OFFSET,
    sim.z + Math.cos(sim.heading) * NOSE_OFFSET,
    NOSE_RADIUS,
    layout.obstacles,
    layout.bounds,
  );
}

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

  it("dt raksasa (tab baru aktif lagi) dijepit: satu langkah tidak melompat jauh", () => {
    const layout = buildLayout(8);
    // Mode rute.
    const routed = createSim(layout.spawn);
    setDestination(routed, layout.grid, layout.slots[7].approach, 7);
    for (let i = 0; i < 20; i++) stepSim(routed, layout, DT, IDLE);
    let before = { x: routed.x, z: routed.z };
    stepSim(routed, layout, 5, IDLE);
    expect(Math.hypot(routed.x - before.x, routed.z - before.z)).toBeLessThan(
      MAX_SPEED * 0.1 + 1e-6,
    );
    // Mode manual.
    const manual = createSim(layout.spawn);
    for (let i = 0; i < 30; i++) {
      stepSim(manual, layout, DT, { moveX: 1, moveZ: 0 });
    }
    before = { x: manual.x, z: manual.z };
    stepSim(manual, layout, 5, { moveX: 1, moveZ: 0 });
    expect(Math.hypot(manual.x - before.x, manual.z - before.z)).toBeLessThan(
      MAX_SPEED * 0.1 + 1e-6,
    );
  });

  it("memilih rak yang sedang dihadapi tetap menghasilkan arrived", () => {
    const layout = buildLayout(4);
    const slot = layout.slots[2];
    const sim = createSim(slot.approach);
    expect(setDestination(sim, layout.grid, slot.approach, slot.index)).toBe(
      true,
    );
    let event = null;
    for (let i = 0; i < 10 && !event; i++) {
      event = stepSim(sim, layout, DT, IDLE);
    }
    expect(event).toEqual({ type: "arrived", slot: 2 });
  });

  it("melambat menjelang tujuan, tidak berhenti mendadak dari laju penuh", () => {
    const layout = buildLayout(4);
    const sim = createSim(layout.spawn);
    setDestination(sim, layout.grid, { x: 3, z: layout.spawn.z });
    let last = 0;
    let event = null;
    for (let i = 0; i < 1200 && !event; i++) {
      last = sim.speed;
      event = stepSim(sim, layout, DT, IDLE);
    }
    expect(event).not.toBeNull();
    // Laju pada frame terakhir sebelum tiba jauh di bawah laju penuh.
    expect(last).toBeLessThan(MAX_SPEED * 0.5);
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

describe("sim: ketahanan gerak manual", () => {
  it("fuzz: input acak dengan dt campuran — tidak menembus, tidak terlempar, kepala tidak masuk halangan", () => {
    const random = seededRandom(12345);
    for (const count of [1, 8, 24]) {
      const layout = buildLayout(count);
      const sim = createSim(layout.spawn);
      let input = { moveX: 0, moveZ: 0 };
      for (let frame = 0; frame < 12000; frame++) {
        if (frame % 25 === 0) {
          const angle = random() * Math.PI * 2;
          input =
            random() < 0.15
              ? { moveX: 0, moveZ: 0 }
              : { moveX: Math.sin(angle), moveZ: Math.cos(angle) };
        }
        const dt = [1 / 144, 1 / 60, 1 / 30, 0.1][Math.floor(random() * 4)];
        const beforeX = sim.x;
        const beforeZ = sim.z;
        stepSim(sim, layout, dt, input);

        const where = `frame ${frame}, ${count} rak, (${sim.x.toFixed(3)}, ${sim.z.toFixed(3)})`;
        if (!isFree(layout, sim.x, sim.z)) {
          throw new Error(`badan menembus halangan: ${where}`);
        }
        // Tidak pernah lebih cepat dari laju penuh: tabrakan tidak boleh
        // "melempar" pemain.
        const moved = Math.hypot(sim.x - beforeX, sim.z - beforeZ);
        if (moved > MAX_SPEED * dt + 0.005) {
          throw new Error(`terlempar ${moved.toFixed(3)} m: ${where}`);
        }
        if (noseDepth(layout, sim) > 0.02) {
          throw new Error(
            `kepala masuk ${noseDepth(layout, sim).toFixed(3)} m: ${where}`,
          );
        }
      }
    }
  });

  it("tidak pernah buntu: dari pose bebas mana pun selalu ada arah yang bisa ditempuh", () => {
    const random = seededRandom(777);
    for (const count of [1, 8, 24]) {
      const layout = buildLayout(count);
      const { bounds } = layout;
      let probes = 0;
      for (let attempt = 0; attempt < 600 && probes < 120; attempt++) {
        const x = bounds.minX + random() * (bounds.maxX - bounds.minX);
        const z = bounds.minZ + random() * (bounds.maxZ - bounds.minZ);
        if (!isFree(layout, x, z)) continue;
        probes++;
        // Arah hadap acak: kepala boleh saja sedang berada di dalam halangan.
        const heading = random() * Math.PI * 2;
        let best = 0;
        for (let d = 0; d < 16 && best < 0.3; d++) {
          const sim = createSim({ x, z }, heading);
          const angle = (d / 16) * Math.PI * 2;
          for (let frame = 0; frame < 60; frame++) {
            stepSim(sim, layout, DT, {
              moveX: Math.sin(angle),
              moveZ: Math.cos(angle),
            });
          }
          best = Math.max(best, Math.hypot(sim.x - x, sim.z - z));
        }
        expect(
          best,
          `buntu di (${x.toFixed(2)}, ${z.toFixed(2)}) h=${heading.toFixed(2)}, ${count} rak`,
        ).toBeGreaterThan(0.3);
      }
      expect(probes).toBeGreaterThan(80);
    }
  });

  it("menabrak rak lurus dari depan: kepala tidak masuk ke dalam rak", () => {
    const layout = buildLayout(4);
    const slot = layout.slots[1];
    const rack = layout.obstacles[1];
    const sim = createSim(slot.approach);
    for (let i = 0; i < 180; i++) {
      stepSim(sim, layout, DT, { moveX: 0, moveZ: -1 });
    }
    const noseX = sim.x + Math.sin(sim.heading) * NOSE_OFFSET;
    const noseZ = sim.z + Math.cos(sim.heading) * NOSE_OFFSET;
    expect(distanceToRect(noseX, noseZ, rack)).toBeGreaterThan(
      NOSE_RADIUS - 0.02,
    );
    // Badan berhenti lebih jauh dari sekadar radius badannya.
    expect(distanceToRect(sim.x, sim.z, rack)).toBeGreaterThan(0.5);
    // Dan animasi lari berhenti (laju turun), bukan berlari di tempat.
    expect(sim.speed).toBeLessThan(1);
  });

  it("setelah tombol dilepas pemain meluncur sebentar lalu berhenti", () => {
    const layout = buildLayout(4);
    const sim = createSim(layout.spawn);
    for (let i = 0; i < 40; i++) {
      stepSim(sim, layout, DT, { moveX: 1, moveZ: 0 });
    }
    const released = sim.x;
    stepSim(sim, layout, DT, IDLE);
    expect(sim.x).toBeGreaterThan(released);
    for (let i = 0; i < 90; i++) stepSim(sim, layout, DT, IDLE);
    const stopped = sim.x;
    expect(sim.speed).toBe(0);
    stepSim(sim, layout, DT, IDLE);
    expect(sim.x).toBe(stopped);
    expect(stopped - released).toBeLessThan(1);
  });

  it("luncuran mengikuti arah gerak terakhir, bukan arah hadap yang masih berputar", () => {
    const layout = buildLayout(4);
    // Lobi yang lapang: lari ke +X, ketuk sebentar ke -X, lalu lepas.
    const sim = createSim({ x: 0, z: layout.spawn.z });
    for (let i = 0; i < 60; i++) {
      stepSim(sim, layout, DT, { moveX: 1, moveZ: 0 });
    }
    for (let i = 0; i < 6; i++) {
      stepSim(sim, layout, DT, { moveX: -1, moveZ: 0 });
    }
    const releasedX = sim.x;
    const releasedZ = sim.z;
    for (let i = 0; i < 60; i++) stepSim(sim, layout, DT, IDLE);
    // Meluncur ke -X (arah input terakhir), nyaris tanpa menyamping.
    expect(sim.x).toBeLessThan(releasedX - 0.05);
    expect(Math.abs(sim.z - releasedZ)).toBeLessThan(0.02);
  });
});

describe("rute dari posisi mana pun yang bisa dicapai gerak manual", () => {
  it("tidak pernah memotong menembus rak atau properti (regresi: kantong di balik properti)", () => {
    const layout = buildLayout(8);
    const { bounds } = layout;
    const target = layout.slots[5].approach;
    let checked = 0;
    // Kantong selalu berada di tepi ruangan, jadi sabuk 1,7 m di sepanjang
    // dinding disampel rapat (0,11 m).
    const band = 1.7;
    for (let x = bounds.minX; x <= bounds.maxX; x += 0.11) {
      for (let z = bounds.minZ; z <= bounds.maxZ; z += 0.11) {
        const nearWall =
          x - bounds.minX < band ||
          bounds.maxX - x < band ||
          z - bounds.minZ < band ||
          bounds.maxZ - z < band;
        if (!nearWall || !isFree(layout, x, z)) continue;
        checked++;
        const route = findRoute(layout.grid, { x, z }, target, 0.14);
        if (!route) throw new Error(`tidak ada rute dari (${x}, ${z})`);
        for (let i = 1; i < route.length; i++) {
          const a = route[i - 1];
          const b = route[i];
          const steps = Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.05);
          for (let s = 0; s <= steps; s++) {
            const t = steps === 0 ? 0 : s / steps;
            const px = a.x + (b.x - a.x) * t;
            const pz = a.z + (b.z - a.z) * t;
            for (const rect of layout.obstacles) {
              if (distanceToRect(px, pz, rect) < 0.05) {
                throw new Error(
                  `rute dari (${x.toFixed(2)}, ${z.toFixed(2)}) menembus halangan di (${px.toFixed(2)}, ${pz.toFixed(2)})`,
                );
              }
            }
          }
        }
      }
    }
    expect(checked).toBeGreaterThan(2000);
  });
});

describe("peralihan klik-untuk-jalan → WASD (regresi: pemain terlempar)", () => {
  it("repro: tiba di pojok antara tempat tidur dan dinding, lalu menekan tombol — tidak terlempar", () => {
    const layout = buildLayout(8);
    for (const key of [
      { moveX: 0, moveZ: -1 },
      { moveX: 1, moveZ: 0 },
      { moveX: -1, moveZ: 0 },
      { moveX: 0, moveZ: 1 },
    ]) {
      const sim = createSim(layout.slots[0].approach);
      expect(setDestination(sim, layout.grid, { x: -6.4, z: 4.63 })).toBe(true);
      const { event } = runUntilEvent(sim, layout);
      expect(event).toEqual({ type: "arrived", slot: null });
      // Berhenti sebelum kepala masuk ke tempat tidur/dinding.
      expect(noseDepth(layout, sim)).toBeLessThan(0.02);

      const beforeX = sim.x;
      const beforeZ = sim.z;
      stepSim(sim, layout, DT, key);
      expect(Math.hypot(sim.x - beforeX, sim.z - beforeZ)).toBeLessThan(0.1);
    }
  });

  it("kepala sudah jauh di dalam rak saat gerak dimulai: keluar bertahap, tidak terlempar", () => {
    const layout = buildLayout(4);
    const slot = layout.slots[1];
    // Badan sah tepat di depan muka rak, menghadap rak → hidung ±0,3 m di dalam.
    const start = { x: slot.x, z: slot.z + RACK.depth / 2 + 0.3 };
    for (const key of [
      { moveX: 0, moveZ: -1 },
      { moveX: 0, moveZ: 1 },
      { moveX: 1, moveZ: 0 },
      { moveX: -1, moveZ: 0 },
    ]) {
      const sim = createSim(start, Math.PI);
      expect(isFree(layout, sim.x, sim.z)).toBe(true);
      expect(noseDepth(layout, sim)).toBeGreaterThan(0.3);

      for (let frame = 0; frame < 120; frame++) {
        const beforeX = sim.x;
        const beforeZ = sim.z;
        stepSim(sim, layout, DT, key);
        expect(
          Math.hypot(sim.x - beforeX, sim.z - beforeZ),
        ).toBeLessThanOrEqual(MAX_SPEED * DT + 0.005);
        expect(isFree(layout, sim.x, sim.z)).toBe(true);
      }
    }
  });

  it("acak: setelah tiba di titik lantai mana pun, frame WASD pertama tidak melompat", () => {
    const random = seededRandom(2468);
    for (const count of [1, 8, 24]) {
      const layout = buildLayout(count);
      const { bounds } = layout;
      let deepNose = 0;
      const runs = 250;
      for (let run = 0; run < runs; run++) {
        const start =
          layout.slots[Math.floor(random() * layout.slots.length)].approach;
        const sim = createSim(start);
        const to = {
          x: bounds.minX + random() * (bounds.maxX - bounds.minX),
          z: bounds.minZ + random() * (bounds.maxZ - bounds.minZ),
        };
        expect(setDestination(sim, layout.grid, to)).toBe(true);
        const { event } = runUntilEvent(sim, layout, 60);
        expect(event).not.toBeNull();
        for (let i = 0; i < 20; i++) stepSim(sim, layout, DT, IDLE);
        if (noseDepth(layout, sim) > 0.05) deepNose++;

        const angle = random() * Math.PI * 2;
        const beforeX = sim.x;
        const beforeZ = sim.z;
        stepSim(sim, layout, DT, {
          moveX: Math.sin(angle),
          moveZ: Math.cos(angle),
        });
        const jump = Math.hypot(sim.x - beforeX, sim.z - beforeZ);
        expect(
          jump,
          `lompat ${jump.toFixed(3)} m setelah klik (${to.x.toFixed(2)}, ${to.z.toFixed(2)}), ${count} rak`,
        ).toBeLessThan(0.1);
      }
      // Tiba dengan kepala di dalam halangan harus langka (dulu ±26%).
      expect(deepNose / runs).toBeLessThan(0.02);
    }
  });
});

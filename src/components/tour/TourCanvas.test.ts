import { describe, expect, it, vi } from "vitest";

// Modul kanvas mengimpor R3F; cukup fungsi murninya yang diuji di sini.
vi.mock("@react-three/fiber", () => ({
  Canvas: () => null,
  useFrame: () => {},
}));

import { fovForAspect, moveDog } from "@/components/tour/TourCanvas";
import { createSim, MAX_SPEED } from "@/lib/playground/sim";
import type { TourState } from "@/lib/tour/tour";

const pose = (x: number, z: number, face = 0): TourState => ({
  camera: { x: 0, y: 5, z: 5 },
  look: { x: 0, y: 0, z: 0 },
  dog: { x, z },
  face,
});

/** Cakupan mendatar (derajat) untuk sudut vertikal & rasio layar tertentu. */
function horizontalFov(vertical: number, aspect: number): number {
  const half = (vertical / 2) * (Math.PI / 180);
  return (2 * Math.atan(Math.tan(half) * aspect) * 180) / Math.PI;
}

describe("fovForAspect", () => {
  it("layar lanskap memakai sudut bawaan", () => {
    expect(fovForAspect(16 / 9)).toBe(38);
    expect(fovForAspect(1.2)).toBe(38);
  });

  it("layar potret: sudut vertikal dilebarkan supaya cakupan mendatar tetap ≥ 40°", () => {
    for (const aspect of [0.9, 0.75, 0.6]) {
      const fov = fovForAspect(aspect);
      expect(fov).toBeGreaterThan(38);
      expect(horizontalFov(fov, aspect)).toBeGreaterThanOrEqual(40 - 1e-6);
    }
  });

  it("dibatasi 72° supaya gambar tidak terdistorsi di layar sangat sempit", () => {
    expect(fovForAspect(390 / 844)).toBe(72);
    expect(fovForAspect(0.2)).toBe(72);
  });

  it("rasio janggal (0, negatif, NaN) memakai sudut bawaan", () => {
    expect(fovForAspect(0)).toBe(38);
    expect(fovForAspect(-1)).toBe(38);
    expect(fovForAspect(NaN)).toBe(38);
  });
});

describe("moveDog", () => {
  const DT = 1 / 60;

  it("robot berada tepat di posisi tur, dan menoleh ke arah geraknya", () => {
    const sim = createSim({ x: 0, z: 0 }, 0);
    // Berjalan ke +X selama satu detik.
    for (let i = 1; i <= 60; i++) moveDog(sim, pose(i * 0.03, 0), DT, false);
    expect(sim.x).toBeCloseTo(1.8);
    expect(sim.z).toBe(0);
    expect(sim.heading).toBeCloseTo(Math.PI / 2, 1);
    // Laju untuk animasi kaki: ±1,8 m/dtk, tidak nol dan tidak melebihi batas.
    expect(sim.speed).toBeGreaterThan(1.2);
    expect(sim.speed).toBeLessThanOrEqual(MAX_SPEED);
  });

  it("gulir mundur: robot berbalik menghadap arah jalannya, tidak berjalan mundur", () => {
    const sim = createSim({ x: 2, z: 0 }, Math.PI / 2);
    for (let i = 1; i <= 60; i++)
      moveDog(sim, pose(2 - i * 0.03, 0), DT, false);
    expect(Math.abs(Math.sin(sim.heading) + 1)).toBeLessThan(0.05);
  });

  it("berhenti: laju turun ke nol dan robot menghadap arah perhentiannya", () => {
    const sim = createSim({ x: 0, z: 0 }, 0);
    for (let i = 1; i <= 30; i++) moveDog(sim, pose(i * 0.03, 0), DT, false);
    for (let i = 0; i < 120; i++)
      moveDog(sim, pose(0.9, 0, Math.PI), DT, false);
    expect(sim.speed).toBe(0);
    expect(Math.cos(sim.heading)).toBeCloseTo(-1, 2);
  });

  it("lompatan gulir yang jauh tidak membuat laju melebihi batas", () => {
    const sim = createSim({ x: 0, z: 0 }, 0);
    moveDog(sim, pose(8, 3), DT, false);
    expect(sim.speed).toBeLessThanOrEqual(MAX_SPEED);
    expect(sim.x).toBe(8);
  });

  it("gerak dikurangi (snap): langsung di tempat, menghadap arah perhentian, tanpa animasi jalan", () => {
    const sim = createSim({ x: 0, z: 0 }, 0);
    moveDog(sim, pose(5, 2, -Math.PI / 2), DT, true);
    expect([sim.x, sim.z]).toEqual([5, 2]);
    expect(sim.speed).toBe(0);
  });
});

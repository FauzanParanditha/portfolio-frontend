import { describe, expect, it, vi } from "vitest";

// Modul kanvas mengimpor R3F; cukup fungsi murninya yang diuji di sini.
vi.mock("@react-three/fiber", () => ({
  Canvas: () => null,
  useFrame: () => {},
}));

import { fovForAspect } from "@/components/tour/TourCanvas";

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

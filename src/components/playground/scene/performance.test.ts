import { Camera, Group, Mesh, Object3D } from "three";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-three/fiber", () => ({ useFrame: () => {} }));

import { warmUpScene } from "./performance";

/** Adegan kecil: grup berisi dua mesh, salah satunya sengaja tanpa culling. */
function buildScene() {
  const scene = new Object3D();
  const group = new Group();
  const rack = new Mesh();
  const floor = new Mesh();
  floor.frustumCulled = false;
  const hidden = new Mesh();
  hidden.visible = false;
  group.add(rack, hidden);
  scene.add(group, floor);
  return { scene, group, rack, floor, hidden };
}

describe("warmUpScene", () => {
  it("menggambar sekali dengan pemangkasan frustum dimatikan di SEMUA objek, lalu memulihkannya", () => {
    const { scene, group, rack, floor, hidden } = buildScene();
    const camera = new Camera();
    const during: boolean[] = [];
    const render = vi.fn(() => {
      scene.traverse((object) => during.push(object.frustumCulled));
    });

    warmUpScene({ render }, scene, camera);

    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(scene, camera);
    // Selama render: tidak ada satu pun objek yang masih dipangkas — objek di
    // luar pandangan kamera ikut digambar, jadi ikut terunggah ke GPU.
    expect(during).toHaveLength(5);
    expect(during.every((culled) => culled === false)).toBe(true);
    // Setelahnya: seperti semula.
    expect(scene.frustumCulled).toBe(true);
    expect(group.frustumCulled).toBe(true);
    expect(rack.frustumCulled).toBe(true);
    expect(hidden.frustumCulled).toBe(true);
    // Yang memang tanpa culling tidak ikut "dipulihkan" menjadi ber-culling.
    expect(floor.frustumCulled).toBe(false);
    // Visibilitas tidak disentuh.
    expect(hidden.visible).toBe(false);
  });

  it("render gagal: pemangkasan tetap dipulihkan dan galatnya diteruskan", () => {
    const { scene, rack } = buildScene();
    const failure = new Error("context lost");
    expect(() =>
      warmUpScene(
        {
          render: () => {
            throw failure;
          },
        },
        scene,
        new Camera(),
      ),
    ).toThrow(failure);
    expect(rack.frustumCulled).toBe(true);
  });
});

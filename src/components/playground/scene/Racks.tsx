"use client";

import {
  RACK,
  rackCode,
  type RoomLayout,
  type Station,
} from "@/lib/playground/layout";
import { type ThreeEvent, useFrame } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  type Group,
  type InstancedMesh,
  Object3D,
} from "three";
import { CLICK_DRAG_TOLERANCE } from "../input";
import {
  createGlowTexture,
  createNameplateTexture,
  createRackFrontTexture,
  hash01,
  PALETTE,
} from "./textures";

const LEDS_PER_RACK = 6;

// Objek kerja bersama untuk menyusun matriks/warna instans.
const scratch = new Object3D();
const scratchColor = new Color();

function placeInstance(
  mesh: InstancedMesh,
  index: number,
  x: number,
  y: number,
  z: number,
  rotationX = 0,
): void {
  scratch.position.set(x, y, z);
  scratch.rotation.set(rotationX, 0, 0);
  scratch.scale.set(1, 1, 1);
  scratch.updateMatrix();
  mesh.setMatrixAt(index, scratch.matrix);
}

function tintInstance(
  mesh: InstancedMesh,
  index: number,
  hex: string,
  level = 1,
): void {
  mesh.setColorAt(index, scratchColor.set(hex).multiplyScalar(level));
}

function commitInstances(mesh: InstancedMesh): void {
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  // Raycast & frustum culling instans memakai bounding sphere ini.
  mesh.computeBoundingSphere();
}

interface RacksProps {
  layout: RoomLayout;
  stations: Station[];
  hoveredSlot: number | null;
  /** Matikan kedip LED & animasi papan nama (prefers-reduced-motion). */
  reducedMotion: boolean;
  onHover: (slot: number | null) => void;
  onSelect: (slot: number) => void;
}

interface Led {
  slot: number;
  x: number;
  y: number;
  z: number;
  /** Warna dasar (hex). */
  color: string;
  /** 0 = menyala terus; selain itu frekuensi kedip (Hz). */
  rate: number;
  dim: boolean;
}

/**
 * Semua rak digambar dengan instancing: satu draw call untuk badan, satu per
 * jenis muka depan, satu untuk seluruh LED, satu untuk pendar lantai. Jumlah
 * draw call tidak bertambah saat proyek bertambah (kecuali papan nama).
 */
export function Racks({
  layout,
  stations,
  hoveredSlot,
  reducedMotion,
  onHover,
  onSelect,
}: RacksProps) {
  const { slots } = layout;
  const activeSlots = useMemo(
    () => slots.filter((slot) => slot.station !== null),
    [slots],
  );
  const vacantSlots = useMemo(
    () => slots.filter((slot) => slot.station === null),
    [slots],
  );

  const bodyRef = useRef<InstancedMesh>(null);
  const activeFrontRef = useRef<InstancedMesh>(null);
  const vacantFrontRef = useRef<InstancedMesh>(null);
  const ledRef = useRef<InstancedMesh>(null);
  const glowRef = useRef<InstancedMesh>(null);
  const plateRefs = useRef<Array<Group | null>>([]);
  const hoverGlowRef = useRef<Group>(null);
  const ledTick = useRef(-1);

  const activeTexture = useMemo(() => createRackFrontTexture(true), []);
  const vacantTexture = useMemo(() => createRackFrontTexture(false), []);
  const glowTexture = useMemo(() => createGlowTexture(), []);
  useEffect(
    () => () => {
      activeTexture.dispose();
      vacantTexture.dispose();
      glowTexture.dispose();
    },
    [activeTexture, vacantTexture, glowTexture],
  );

  const plates = useMemo(
    () =>
      activeSlots.map((slot) => {
        const station = stations[slot.station as number];
        return {
          slot,
          texture: createNameplateTexture(
            rackCode(slot.index),
            station.label,
            station.kind,
          ),
        };
      }),
    [activeSlots, stations],
  );
  useEffect(
    () => () => {
      for (const plate of plates) plate.texture.dispose();
    },
    [plates],
  );

  const leds = useMemo<Led[]>(() => {
    const list: Led[] = [];
    const frontZ = RACK.depth / 2 + 0.012;
    for (const slot of slots) {
      if (slot.station === null) {
        // Rak kosong: satu lampu siaga redup.
        list.push({
          slot: slot.index,
          x: slot.x + 0.36,
          y: RACK.height - 0.32,
          z: slot.z + frontZ,
          color: PALETTE.amber,
          rate: 0,
          dim: true,
        });
        continue;
      }
      const archive = stations[slot.station].kind === "archive";
      for (let i = 0; i < LEDS_PER_RACK; i++) {
        const seed = slot.index * 31 + i * 7;
        const pick = hash01(seed);
        const hue = archive
          ? PALETTE.amber
          : pick > 0.82
            ? PALETTE.green
            : PALETTE.accent;
        list.push({
          slot: slot.index,
          x: slot.x + 0.36,
          y: 0.36 + i * 0.31 + hash01(seed + 3) * 0.05,
          z: slot.z + frontZ,
          color: hue,
          rate: hash01(seed + 11) > 0.45 ? 1.5 + hash01(seed + 5) * 6 : 0,
          dim: false,
        });
      }
    }
    return list;
  }, [slots, stations]);

  // Matriks & warna instans: sekali saat tata letak berubah.
  useLayoutEffect(() => {
    const frontZ = RACK.depth / 2 + 0.004;
    const glowZ = RACK.depth / 2 + 0.5;

    const body = bodyRef.current;
    if (body) {
      for (let i = 0; i < slots.length; i++) {
        const slot = slots[i];
        placeInstance(body, i, slot.x, RACK.height / 2, slot.z);
        tintInstance(
          body,
          i,
          slot.station === null ? PALETTE.rackVacant : PALETTE.rack,
        );
      }
      commitInstances(body);
    }

    const activeFront = activeFrontRef.current;
    if (activeFront) {
      for (let i = 0; i < activeSlots.length; i++) {
        const slot = activeSlots[i];
        placeInstance(activeFront, i, slot.x, RACK.height / 2, slot.z + frontZ);
      }
      commitInstances(activeFront);
    }

    const vacantFront = vacantFrontRef.current;
    if (vacantFront) {
      for (let i = 0; i < vacantSlots.length; i++) {
        const slot = vacantSlots[i];
        placeInstance(vacantFront, i, slot.x, RACK.height / 2, slot.z + frontZ);
      }
      commitInstances(vacantFront);
    }

    const ledMesh = ledRef.current;
    if (ledMesh) {
      for (let i = 0; i < leds.length; i++) {
        const led = leds[i];
        placeInstance(ledMesh, i, led.x, led.y, led.z);
        tintInstance(ledMesh, i, led.color, led.dim ? 0.35 : 1);
      }
      commitInstances(ledMesh);
    }

    const glow = glowRef.current;
    if (glow) {
      for (let i = 0; i < activeSlots.length; i++) {
        const slot = activeSlots[i];
        const archive = stations[slot.station as number].kind === "archive";
        placeInstance(glow, i, slot.x, 0.012, slot.z + glowZ, -Math.PI / 2);
        tintInstance(glow, i, archive ? PALETTE.amber : PALETTE.accent);
      }
      commitInstances(glow);
    }

    // Paksa kedip LED dihitung ulang pada frame berikutnya.
    ledTick.current = -1;
  }, [slots, activeSlots, vacantSlots, leds, stations]);

  useFrame((state, delta) => {
    // Kedip LED dihitung 12×/detik, bukan tiap frame.
    const ledMesh = ledRef.current;
    if (ledMesh) {
      const time = reducedMotion ? 0 : state.clock.elapsedTime;
      const tick = Math.floor(time * 12);
      const stamp = tick * 1000 + (hoveredSlot ?? -1);
      if (stamp !== ledTick.current) {
        ledTick.current = stamp;
        for (let i = 0; i < leds.length; i++) {
          const led = leds[i];
          let level = led.dim ? 0.35 : 1;
          if (!led.dim && led.slot === hoveredSlot) {
            level = 1.25;
          } else if (led.rate > 0 && !reducedMotion) {
            const phase = Math.floor(time * led.rate);
            level = hash01(i * 13.7 + phase * 3.1) > 0.38 ? 1 : 0.14;
          }
          tintInstance(ledMesh, i, led.color, level);
        }
        if (ledMesh.instanceColor) ledMesh.instanceColor.needsUpdate = true;
      }
    }

    // Papan nama rak yang disorot membesar sedikit.
    const ease = reducedMotion ? 1 : 1 - Math.exp(-12 * delta);
    plates.forEach((plate, i) => {
      const group = plateRefs.current[i];
      if (!group) return;
      const target = plate.slot.index === hoveredSlot ? 1.16 : 1;
      const next = group.scale.x + (target - group.scale.x) * ease;
      group.scale.setScalar(next);
    });

    const hoverGlow = hoverGlowRef.current;
    if (hoverGlow) {
      const slot = hoveredSlot === null ? null : slots[hoveredSlot];
      const visible = !!slot && slot.station !== null;
      hoverGlow.visible = visible;
      if (visible && slot) {
        hoverGlow.position.set(slot.x, 0.014, slot.z + RACK.depth / 2 + 0.5);
      }
    }
  });

  const handleMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    if (event.instanceId !== undefined) onHover(event.instanceId);
  };
  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    // Rak selalu "menelan" klik, supaya lantai di belakangnya tidak ikut kena.
    event.stopPropagation();
    if (event.delta > CLICK_DRAG_TOLERANCE) return;
    if (event.instanceId !== undefined) onSelect(event.instanceId);
  };

  return (
    <group>
      <instancedMesh
        ref={bodyRef}
        args={[undefined, undefined, slots.length]}
        castShadow
        receiveShadow
        onPointerMove={handleMove}
        onPointerOut={() => onHover(null)}
        onClick={handleClick}
      >
        <boxGeometry args={[RACK.width, RACK.height, RACK.depth]} />
        {/* Metalness rendah: tanpa environment map, logam tinggi tampak hitam. */}
        <meshStandardMaterial roughness={0.58} metalness={0.2} />
      </instancedMesh>

      {activeSlots.length > 0 && (
        <instancedMesh
          ref={activeFrontRef}
          args={[undefined, undefined, activeSlots.length]}
        >
          <planeGeometry args={[RACK.width - 0.14, RACK.height - 0.16]} />
          <meshStandardMaterial
            map={activeTexture}
            roughness={0.65}
            metalness={0.15}
          />
        </instancedMesh>
      )}
      {vacantSlots.length > 0 && (
        <instancedMesh
          ref={vacantFrontRef}
          args={[undefined, undefined, vacantSlots.length]}
        >
          <planeGeometry args={[RACK.width - 0.14, RACK.height - 0.16]} />
          <meshStandardMaterial
            map={vacantTexture}
            roughness={0.8}
            metalness={0.1}
          />
        </instancedMesh>
      )}

      <instancedMesh ref={ledRef} args={[undefined, undefined, leds.length]}>
        <boxGeometry args={[0.07, 0.035, 0.014]} />
        <meshBasicMaterial toneMapped={false} />
      </instancedMesh>

      {activeSlots.length > 0 && (
        <instancedMesh
          ref={glowRef}
          args={[undefined, undefined, activeSlots.length]}
          renderOrder={1}
        >
          <planeGeometry args={[1.9, 1.5]} />
          <meshBasicMaterial
            map={glowTexture}
            transparent
            opacity={0.22}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </instancedMesh>
      )}

      {/* Pendar ekstra di depan rak yang sedang disorot. */}
      <group ref={hoverGlowRef} visible={false}>
        <mesh rotation-x={-Math.PI / 2} renderOrder={2}>
          <planeGeometry args={[2.6, 2.1]} />
          <meshBasicMaterial
            map={glowTexture}
            color={PALETTE.accentSoft}
            transparent
            opacity={0.5}
            blending={AdditiveBlending}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {plates.map((plate, i) => (
        <group
          key={plate.slot.index}
          ref={(node) => {
            plateRefs.current[i] = node;
          }}
          position={[
            plate.slot.x,
            RACK.height + 0.27,
            plate.slot.z + RACK.depth / 2 - 0.12,
          ]}
          rotation-x={-0.38}
        >
          <mesh>
            <planeGeometry args={[1.24, 0.31]} />
            <meshBasicMaterial
              map={plate.texture}
              transparent
              toneMapped={false}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

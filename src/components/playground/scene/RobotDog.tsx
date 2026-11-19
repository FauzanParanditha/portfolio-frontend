"use client";

import { MAX_SPEED, type Sim } from "@/lib/playground/sim";
import { useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useMemo, useRef } from "react";
import {
  BoxGeometry,
  CylinderGeometry,
  type Group,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { PALETTE } from "./textures";

/** Skala keseluruhan: sedikit dibesarkan supaya terbaca dari kamera atas. */
const SCALE = 1.25;
/** Tinggi pusat badan saat berdiri (sebelum skala). */
const BODY_HEIGHT = 0.53;
const UPPER_LEG = 0.22;
const LOWER_LEG = 0.2;

// Urutan kaki: depan-kiri, depan-kanan, belakang-kiri, belakang-kanan.
// Derap (trot): pasangan diagonal bergerak bersamaan.
const LEGS = [
  { x: 0.15, z: 0.26, phase: 0 },
  { x: -0.15, z: 0.26, phase: Math.PI },
  { x: 0.15, z: -0.26, phase: Math.PI },
  { x: -0.15, z: -0.26, phase: 0 },
] as const;

interface RobotDogProps {
  simRef: RefObject<Sim | null>;
  /** Hilangkan gerak-gerik diam (napas, toleh, kibas) bila pengguna memintanya. */
  reducedMotion: boolean;
}

/**
 * Robot anjing orisinal, dirakit dari geometri prosedural (tanpa berkas model).
 *
 * Animasinya prosedural dan digerakkan oleh `sim`: fase langkah maju secepat
 * laju jalan, lalu dibaurkan mulus ke pose diam. Tidak ada klip animasi.
 */
export function RobotDog({ simRef, reducedMotion }: RobotDogProps) {
  const rootRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const tailRef = useRef<Group>(null);
  const earRefs = useRef<Array<Group | null>>([]);
  const hipRefs = useRef<Array<Group | null>>([]);
  const kneeRefs = useRef<Array<Group | null>>([]);

  // `time` diakumulasi sendiri: jam bawaan R3F di-reset ke nol tiap `frameloop`
  // berganti (panel dibuka/ditutup), yang akan mengacaukan `stoppedAt`.
  const anim = useRef({
    time: 0,
    phase: 0,
    blend: 0,
    stoppedAt: -Infinity,
    wasMoving: false,
  });

  const geo = useMemo(
    () => ({
      torso: new RoundedBoxGeometry(0.34, 0.27, 0.78, 3, 0.09),
      spine: new BoxGeometry(0.05, 0.012, 0.52),
      hatch: new RoundedBoxGeometry(0.2, 0.03, 0.34, 2, 0.012),
      neck: new CylinderGeometry(0.07, 0.085, 0.16, 10),
      head: new RoundedBoxGeometry(0.28, 0.24, 0.3, 3, 0.08),
      snout: new RoundedBoxGeometry(0.17, 0.12, 0.15, 2, 0.045),
      nose: new SphereGeometry(0.03, 10, 8),
      visor: new RoundedBoxGeometry(0.22, 0.07, 0.03, 2, 0.014),
      ear: new RoundedBoxGeometry(0.07, 0.16, 0.1, 2, 0.03),
      tail: new CylinderGeometry(0.018, 0.03, 0.3, 8),
      tailTip: new SphereGeometry(0.036, 10, 8),
      shoulder: new SphereGeometry(0.068, 12, 10),
      upperLeg: new RoundedBoxGeometry(0.085, UPPER_LEG, 0.1, 2, 0.03),
      knee: new SphereGeometry(0.048, 10, 8),
      lowerLeg: new RoundedBoxGeometry(0.065, LOWER_LEG, 0.075, 2, 0.025),
      foot: new RoundedBoxGeometry(0.1, 0.055, 0.14, 2, 0.025),
    }),
    [],
  );
  const mat = useMemo(
    () => ({
      shell: new MeshStandardMaterial({
        color: "#ececef",
        roughness: 0.42,
        metalness: 0.12,
      }),
      joint: new MeshStandardMaterial({
        color: "#3b3b43",
        roughness: 0.55,
        metalness: 0.25,
      }),
      dark: new MeshStandardMaterial({
        color: "#141416",
        roughness: 0.35,
        metalness: 0.2,
      }),
      glow: new MeshBasicMaterial({ color: PALETTE.accent, toneMapped: false }),
    }),
    [],
  );
  useEffect(
    () => () => {
      for (const g of Object.values(geo)) g.dispose();
      for (const m of Object.values(mat)) m.dispose();
    },
    [geo, mat],
  );

  useFrame((_, delta) => {
    const sim = simRef.current;
    const root = rootRef.current;
    const body = bodyRef.current;
    if (!sim || !root || !body) return;

    const a = anim.current;
    const dt = Math.min(delta, 0.1);
    a.time += dt;
    const time = a.time;

    root.position.set(sim.x, 0, sim.z);
    root.rotation.y = sim.heading;

    // 0 = diam, 1 = lari penuh; dibaurkan supaya transisinya tidak patah.
    const targetBlend = Math.min(1, sim.speed / MAX_SPEED);
    a.blend += (targetBlend - a.blend) * (1 - Math.exp(-10 * dt));
    const blend = a.blend;
    a.phase += dt * (3.5 + 10 * blend) * (blend > 0.02 ? 1 : 0);

    const moving = sim.speed > 0.05;
    if (a.wasMoving && !moving) a.stoppedAt = time;
    a.wasMoving = moving;
    // Sesaat setelah berhenti di depan rak, ekornya mengibas semangat.
    const excited = !moving && time - a.stoppedAt < 2.6;
    const idle = reducedMotion ? 0 : 1 - blend;

    // ── Kaki ──
    LEGS.forEach((leg, i) => {
      const hip = hipRefs.current[i];
      const knee = kneeRefs.current[i];
      if (!hip || !knee) return;
      const p = a.phase + leg.phase;
      // Rotasi X positif mengayun kaki ke belakang; ayunan maju = negatif.
      hip.rotation.x = -Math.sin(p) * 0.72 * blend;
      // Lutut menekuk hanya saat kaki mengayun ke depan (mengangkat telapak).
      knee.rotation.x = Math.max(0, Math.cos(p)) * 1.05 * blend;
    });

    // ── Badan ──
    body.position.y =
      BODY_HEIGHT +
      Math.sin(a.phase * 2) * 0.016 * blend +
      Math.sin(time * 2.1) * 0.007 * idle;
    body.rotation.z = Math.sin(a.phase) * 0.035 * blend;
    body.rotation.x = 0.05 * blend;

    // ── Kepala ──
    const head = headRef.current;
    if (head) {
      const atRack = !moving && sim.faceHeading === null && excited;
      const lookY = Math.sin(time * 0.55) * 0.28 * idle * (atRack ? 0.2 : 1);
      const lookX =
        (atRack ? -0.32 : Math.sin(time * 0.8) * 0.05 * idle) - 0.06 * blend;
      const ease = 1 - Math.exp(-6 * dt);
      head.rotation.y += (lookY - head.rotation.y) * ease;
      head.rotation.x += (lookX - head.rotation.x) * ease;
      head.rotation.z = Math.sin(time * 0.4 + 1) * 0.06 * idle;
    }

    // ── Telinga: sesekali berkedut ──
    earRefs.current.forEach((ear, i) => {
      if (!ear) return;
      const flick = Math.pow(Math.max(0, Math.sin(time * 1.3 + i * 2.1)), 24);
      ear.rotation.x = -0.12 * blend + flick * 0.5 * idle;
    });

    // ── Ekor ──
    const tail = tailRef.current;
    if (tail) {
      const speed = excited ? 15 : 5.5 + blend * 6;
      const amplitude = reducedMotion ? 0 : excited ? 0.75 : 0.3 + blend * 0.1;
      tail.rotation.y = Math.sin(time * speed) * amplitude;
      tail.rotation.x = -0.95 + blend * 0.35;
    }
  });

  return (
    <group ref={rootRef} scale={SCALE}>
      <group ref={bodyRef} position-y={BODY_HEIGHT}>
        {/* Badan */}
        <mesh geometry={geo.torso} material={mat.shell} castShadow />
        <mesh
          geometry={geo.hatch}
          material={mat.joint}
          position={[0, 0.138, -0.04]}
        />
        <mesh
          geometry={geo.spine}
          material={mat.glow}
          position={[0, 0.156, -0.04]}
        />

        {/* Leher + kepala */}
        <mesh
          geometry={geo.neck}
          material={mat.joint}
          position={[0, 0.15, 0.34]}
          rotation-x={0.7}
          castShadow
        />
        <group ref={headRef} position={[0, 0.25, 0.44]}>
          <mesh geometry={geo.head} material={mat.shell} castShadow />
          <mesh
            geometry={geo.snout}
            material={mat.joint}
            position={[0, -0.05, 0.19]}
            castShadow
          />
          <mesh
            geometry={geo.nose}
            material={mat.dark}
            position={[0, -0.02, 0.27]}
          />
          <mesh
            geometry={geo.visor}
            material={mat.glow}
            position={[0, 0.035, 0.146]}
          />
          {[1, -1].map((side, i) => (
            <group
              key={side}
              ref={(node) => {
                earRefs.current[i] = node;
              }}
              position={[side * 0.105, 0.11, -0.05]}
              rotation-z={side * -0.22}
            >
              <mesh
                geometry={geo.ear}
                material={mat.joint}
                position-y={0.07}
                castShadow
              />
            </group>
          ))}
        </group>

        {/* Ekor */}
        <group ref={tailRef} position={[0, 0.08, -0.38]} rotation-x={-0.95}>
          <mesh
            geometry={geo.tail}
            material={mat.joint}
            position-y={0.15}
            castShadow
          />
          <mesh geometry={geo.tailTip} material={mat.glow} position-y={0.31} />
        </group>

        {/* Kaki */}
        {LEGS.map((leg, i) => (
          <group
            key={i}
            ref={(node) => {
              hipRefs.current[i] = node;
            }}
            position={[leg.x, -0.06, leg.z]}
          >
            <mesh geometry={geo.shoulder} material={mat.joint} />
            <mesh
              geometry={geo.upperLeg}
              material={mat.shell}
              position-y={-UPPER_LEG / 2}
              castShadow
            />
            <group
              ref={(node) => {
                kneeRefs.current[i] = node;
              }}
              position-y={-UPPER_LEG}
            >
              <mesh geometry={geo.knee} material={mat.joint} />
              <mesh
                geometry={geo.lowerLeg}
                material={mat.shell}
                position-y={-LOWER_LEG / 2}
                castShadow
              />
              <mesh
                geometry={geo.foot}
                material={mat.dark}
                position={[0, -LOWER_LEG - 0.02, 0.025]}
                castShadow
              />
            </group>
          </group>
        ))}
      </group>
    </group>
  );
}

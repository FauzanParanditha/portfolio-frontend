"use client";

import {
  AdaptiveResolution,
  detectLowPower,
  initialMaxDpr,
} from "@/components/playground/scene/performance";
import { Fixtures } from "@/components/playground/scene/Fixtures";
import { Racks } from "@/components/playground/scene/Racks";
import { RobotDog } from "@/components/playground/scene/RobotDog";
import { Room } from "@/components/playground/scene/Room";
import { PALETTE } from "@/components/playground/scene/textures";
import type { Health } from "@/lib/playground/health";
import type { RoomLayout, Station } from "@/lib/playground/layout";
import {
  angleDelta,
  createSim,
  MAX_SPEED,
  type Sim,
} from "@/lib/playground/sim";
import { type Tour, type TourState, tourState } from "@/lib/tour/tour";
import { Canvas, useFrame } from "@react-three/fiber";
import { type RefObject, useEffect, useRef, useState } from "react";
import { PerspectiveCamera } from "three";

export interface TourCanvasProps {
  layout: RoomLayout;
  stations: Station[];
  tour: Tour;
  /** Posisi gulir sebagai indeks perhentian pecahan; ditulis oleh TourShell. */
  progressRef: RefObject<number>;
  /** Rak yang disorot (proyek yang sedang ditunjuk di kartu), atau `null`. */
  highlightedSlot: number | null;
  health: Health | null;
  /** Tab tersembunyi: berhenti merender. */
  paused: boolean;
  reducedMotion: boolean;
  onReady: () => void;
}

/** Seberapa cepat tampilan mengejar posisi gulir (1/dtk). */
const FOLLOW_RATE = 5;
const TURN_RATE = 9;
/** Lebar kartu teks di layar lebar (28rem) + jarak tepinya; lihat globals.css. */
const PANEL_WIDTH_REM = 30;
const WIDE_VIEWPORT_REM = 48;
/** Layar sempit: kartu menutupi bagian bawah, jadi gambar dinaikkan. */
const NARROW_LIFT = 0.16;
/** Sudut pandang vertikal bawaan (derajat), sama dengan /playground. */
const BASE_FOV = 38;
/**
 * Layar potret: sudut pandang vertikal dilebarkan supaya cakupan MENDATAR
 * tidak menyusut di bawah nilai ini — tanpa itu yang terlihat hanya sepotong
 * rak. Dibatasi supaya gambar tidak terdistorsi.
 */
const MIN_HORIZONTAL_FOV = 40;
const MAX_FOV = 72;

/** Sudut pandang vertikal untuk rasio layar tertentu. */
export function fovForAspect(aspect: number): number {
  if (!(aspect > 0)) return BASE_FOV;
  const half = (MIN_HORIZONTAL_FOV / 2) * (Math.PI / 180);
  const needed = (2 * Math.atan(Math.tan(half) / aspect) * 180) / Math.PI;
  return Math.min(MAX_FOV, Math.max(BASE_FOV, needed));
}

const noop = () => {};

/**
 * Ruang server sebagai latar tur. Tidak interaktif: kamera dan robot
 * digerakkan posisi gulir halaman (lihat `tourState`), dan semua yang bisa
 * diklik adalah kartu HTML di atasnya.
 *
 * Memakai ulang komponen scene /playground apa adanya.
 */
export default function TourCanvas(props: TourCanvasProps) {
  const [lowPower] = useState(detectLowPower);
  const [maxDpr, setMaxDpr] = useState(() => initialMaxDpr(lowPower));

  return (
    <Canvas
      shadows={lowPower ? false : "percentage"}
      dpr={[1, maxDpr]}
      frameloop={props.paused ? "demand" : "always"}
      camera={{
        fov: BASE_FOV,
        near: 0.5,
        far: 140,
        position: [9.5, 8.8, 13.5],
      }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        toneMappingExposure: 1.2,
      }}
      aria-hidden="true"
    >
      <color attach="background" args={[PALETTE.background]} />
      <fog attach="fog" args={[PALETTE.background, 24, 62]} />
      <World {...props} shadows={!lowPower} />
      <AdaptiveResolution maxDpr={maxDpr} onLower={setMaxDpr} />
    </Canvas>
  );
}

/** Terapkan pose robot dari keadaan tur. Arah hadap mengikuti arah gerak. */
function moveDog(sim: Sim, state: TourState, dt: number, snap: boolean): void {
  const dx = state.dog.x - sim.x;
  const dz = state.dog.z - sim.z;
  const moved = Math.hypot(dx, dz);
  sim.x = state.dog.x;
  sim.z = state.dog.z;

  // Laju hanya untuk animasi kaki; diredam supaya tidak berkedip tiap frame.
  const speed = snap ? 0 : Math.min(MAX_SPEED, moved / dt);
  sim.speed += (speed - sim.speed) * (1 - Math.exp(-10 * dt));
  if (sim.speed < 0.05) sim.speed = 0;

  const walking = moved > 0.0015;
  const wanted = walking ? Math.atan2(dx, dz) : state.face;
  const turn = snap ? 1 : 1 - Math.exp(-TURN_RATE * dt);
  sim.heading += angleDelta(sim.heading, wanted) * turn;
}

function World({
  layout,
  stations,
  tour,
  progressRef,
  highlightedSlot,
  health,
  reducedMotion,
  shadows,
  onReady,
}: TourCanvasProps & { shadows: boolean }) {
  const simRef = useRef<Sim | null>(null);
  if (simRef.current === null) {
    const first = tour.stops[0];
    simRef.current = createSim(first.dog, first.face);
  }
  /** Posisi tur yang sedang ditampilkan; mengejar posisi gulir dengan peredaman. */
  const shown = useRef<number | null>(null);
  const viewKey = useRef("");

  useEffect(() => {
    onReady();
    // Hanya sekali saat scene terpasang.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state, delta) => {
    const sim = simRef.current;
    if (!sim) return;
    const dt = Math.min(Math.max(delta, 1e-3), 0.1);

    // Geser gambar menjauhi kartu teks; dihitung ulang hanya saat ukuran berubah.
    const { width, height } = state.size;
    const key = `${width}x${height}`;
    if (viewKey.current !== key && state.camera instanceof PerspectiveCamera) {
      viewKey.current = key;
      // `setViewOffset` di bawah sekaligus memperbarui matriks proyeksi.
      state.camera.fov = fovForAspect(width / Math.max(1, height));
      const rem =
        parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      if (width >= WIDE_VIEWPORT_REM * rem) {
        state.camera.setViewOffset(
          width,
          height,
          (-PANEL_WIDTH_REM * rem) / 2,
          0,
          width,
          height,
        );
      } else {
        state.camera.setViewOffset(
          width,
          height,
          0,
          height * NARROW_LIFT,
          width,
          height,
        );
      }
    }

    const target = progressRef.current;
    const first = shown.current === null;
    const snap = first || reducedMotion;
    const previous = shown.current ?? target;
    shown.current = snap
      ? target
      : previous + (target - previous) * (1 - Math.exp(-FOLLOW_RATE * dt));

    const pose = tourState(tour, shown.current);
    state.camera.position.set(pose.camera.x, pose.camera.y, pose.camera.z);
    state.camera.lookAt(pose.look.x, pose.look.y, pose.look.z);
    moveDog(sim, pose, dt, snap);
  });

  return (
    <>
      <Room layout={layout} shadows={shadows} onFloorClick={noop} />
      <Racks
        layout={layout}
        stations={stations}
        hoveredSlot={highlightedSlot}
        reducedMotion={reducedMotion}
        onHover={noop}
        onSelect={noop}
      />
      <Fixtures
        layout={layout}
        stations={stations}
        health={health}
        hovered={null}
        reducedMotion={reducedMotion}
        onHover={noop}
        onSelect={noop}
      />
      <RobotDog simRef={simRef} reducedMotion={reducedMotion} />
    </>
  );
}

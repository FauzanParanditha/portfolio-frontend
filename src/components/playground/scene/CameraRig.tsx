"use client";

import { segmentHitsBox } from "@/lib/playground/collision";
import { RACK, type RoomLayout } from "@/lib/playground/layout";
import type { Sim } from "@/lib/playground/sim";
import { useFrame, useThree } from "@react-three/fiber";
import { type RefObject, useEffect, useRef } from "react";
import { Vector3 } from "three";

/** Keadaan orbit yang dibagi dengan pengendali WASD (arah relatif kamera). */
export interface Orbit {
  azimuth: number;
  elevation: number;
  distance: number;
  /**
   * Gestur terakhir adalah seretan/cubitan kamera. Dibaca oleh penangan klik
   * lantai & rak supaya seretan tidak ikut dianggap "klik untuk jalan".
   */
  dragged: boolean;
}

export const DEFAULT_ORBIT: Orbit = {
  azimuth: 0.38,
  elevation: 0.7,
  distance: 14,
  dragged: false,
};

// Kamera selalu berada di sisi selatan ruangan: papan nama rak tetap terbaca
// dan dinding belakang tidak pernah menutupi pandangan.
const AZIMUTH_LIMIT = 0.95;
const ELEVATION_MIN = 0.5;
const ELEVATION_MAX = 1.22;
/** Batas naik otomatis saat menghindari rak — tidak sampai tegak lurus. */
const AVOID_ELEVATION_MAX = 1.02;
const DISTANCE_MIN = 6;
const DISTANCE_MAX = 20;
/** Titik pandang digeser sedikit ke arah rak (−Z), di depan pemain. */
const LOOK_AHEAD = 1.7;
const DRAG_START = 5;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Posisi kamera untuk orbit tertentu di sekitar `center`. */
function orbitPosition(
  center: Vector3,
  azimuth: number,
  elevation: number,
  distance: number,
): [number, number, number] {
  const horizontal = Math.cos(elevation) * distance;
  return [
    center.x + Math.sin(azimuth) * horizontal,
    center.y + Math.sin(elevation) * distance,
    center.z + Math.cos(azimuth) * horizontal,
  ];
}

interface CameraRigProps {
  layout: RoomLayout;
  simRef: RefObject<Sim | null>;
  /** Tujuan orbit; ditulis oleh rig ini, dibaca oleh pengendali pemain. */
  orbitRef: RefObject<Orbit>;
  reducedMotion: boolean;
}

/**
 * Kamera orang-ketiga: mengikuti pemain dengan peredaman, bisa diputar dengan
 * seret (mouse/satu jari), dan di-zoom dengan roda mouse atau cubit dua jari.
 *
 * Menghindari halangan: bila sebuah rak menutupi garis pandang ke pemain
 * (mis. saat ia berada di lorong belakang), kamera naik secukupnya sampai
 * pemain terlihat lagi, lalu turun kembali setelah pandangan bebas.
 *
 * Seret pendek (< beberapa piksel) tidak dianggap memutar — itu klik untuk
 * berjalan, ditangani oleh event R3F di lantai dan rak.
 */
export function CameraRig({
  layout,
  simRef,
  orbitRef,
  reducedMotion,
}: CameraRigProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const invalidate = useThree((state) => state.invalidate);

  const current = useRef<Orbit | null>(null);
  const focus = useRef<Vector3 | null>(null);

  useEffect(() => {
    const element = gl.domElement;
    const pointers = new Map<number, { x: number; y: number }>();
    let dragging = false;
    let travelled = 0;
    let pinchDistance = 0;

    const onDown = (event: PointerEvent) => {
      // Hanya tombol utama mouse. Klik kanan membuka menu konteks dan sering
      // tidak mengirim `pointerup`, sehingga pointernya tertinggal.
      if (event.pointerType === "mouse" && event.button !== 0) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      travelled = 0;
      dragging = false;
      orbitRef.current.dragged = false;
      if (pointers.size === 2) {
        orbitRef.current.dragged = true;
        const [a, b] = [...pointers.values()];
        pinchDistance = Math.hypot(a.x - b.x, a.y - b.y);
      }
    };

    const onMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      // Mouse bergerak tanpa tombol ditekan = `pointerup`-nya terlewat.
      if (event.pointerType === "mouse" && event.buttons === 0) {
        pointers.delete(event.pointerId);
        dragging = false;
        return;
      }
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const orbit = orbitRef.current;

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const distance = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDistance > 0 && distance > 0) {
          orbit.distance = clamp(
            orbit.distance * (pinchDistance / distance),
            DISTANCE_MIN,
            DISTANCE_MAX,
          );
        }
        pinchDistance = distance;
        invalidate();
        return;
      }

      travelled += Math.abs(dx) + Math.abs(dy);
      if (!dragging && travelled < DRAG_START) return;
      dragging = true;
      orbit.dragged = true;
      orbit.azimuth = clamp(
        orbit.azimuth - dx * 0.004,
        -AZIMUTH_LIMIT,
        AZIMUTH_LIMIT,
      );
      orbit.elevation = clamp(
        orbit.elevation + dy * 0.0035,
        ELEVATION_MIN,
        ELEVATION_MAX,
      );
      invalidate();
    };

    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      if (pointers.size < 2) pinchDistance = 0;
      if (pointers.size === 0) dragging = false;
    };

    const onWheel = (event: WheelEvent) => {
      // Halaman playground tidak menggulir; roda sepenuhnya untuk zoom.
      event.preventDefault();
      const orbit = orbitRef.current;
      orbit.distance = clamp(
        orbit.distance * Math.exp(event.deltaY * 0.0011),
        DISTANCE_MIN,
        DISTANCE_MAX,
      );
      invalidate();
    };

    element.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      element.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      element.removeEventListener("wheel", onWheel);
    };
  }, [gl, orbitRef, invalidate]);

  useFrame((state, delta) => {
    const sim = simRef.current;
    const target = orbitRef.current;
    if (!sim || !target) return;

    const dt = Math.min(delta, 0.1);
    const first = current.current === null || focus.current === null;
    const orbit = (current.current ??= { ...target });
    // Titik pandang: sedikit di depan pemain, tapi dijepit agar kamera tidak
    // menghabiskan layar untuk ruang kosong di luar dinding.
    const focusX = clamp(sim.x, -layout.width / 2 + 4, layout.width / 2 - 4);
    const focusZ = clamp(
      sim.z - LOOK_AHEAD,
      -layout.depth / 2 + 3,
      layout.depth / 2 - 4.5,
    );
    const center = (focus.current ??= new Vector3(focusX, 0.7, focusZ));

    // Frame pertama (dan mode gerak-dikurangi) langsung di posisi, tanpa ayunan.
    const snap = first || reducedMotion;
    const followEase = snap ? 1 : 1 - Math.exp(-5 * dt);
    const orbitEase = snap ? 1 : 1 - Math.exp(-10 * dt);

    center.x += (focusX - center.x) * followEase;
    center.z += (focusZ - center.z) * followEase;
    orbit.azimuth += (target.azimuth - orbit.azimuth) * orbitEase;
    orbit.distance += (target.distance - orbit.distance) * orbitEase;

    // Layar potret: mundur sedikit supaya lebar ruangan tetap muat.
    const aspect = state.size.width / Math.max(1, state.size.height);
    const distance =
      orbit.distance * (aspect < 1 ? 1 + (1 - aspect) * 0.85 : 1);

    // Elevasi terendah (≥ pilihan pengguna) yang garis pandangnya bebas rak.
    const player: [number, number, number] = [sim.x, 0.75, sim.z];
    let clearElevation = target.elevation;
    const avoidLimit = Math.max(target.elevation, AVOID_ELEVATION_MAX);
    for (; clearElevation < avoidLimit; clearElevation += 0.05) {
      const eye = orbitPosition(
        center,
        orbit.azimuth,
        clearElevation,
        distance,
      );
      let blocked = false;
      for (const slot of layout.slots) {
        if (
          segmentHitsBox(
            player,
            eye,
            [slot.x - RACK.width / 2, 0, slot.z - RACK.depth / 2],
            [slot.x + RACK.width / 2, RACK.height, slot.z + RACK.depth / 2],
          )
        ) {
          blocked = true;
          break;
        }
      }
      if (!blocked) break;
    }
    clearElevation = Math.min(clearElevation, avoidLimit);
    // Naik-turun karena halangan dibuat lebih lambat daripada seretan pengguna,
    // supaya tidak terasa "tersentak" tiap melewati celah antar-rak. Tetap
    // diredam juga saat gerak dikurangi: lompatan elevasi justru lebih mengganggu.
    const elevationEase = first ? 1 : 1 - Math.exp(-3.5 * dt);
    orbit.elevation += (clearElevation - orbit.elevation) * elevationEase;

    const [x, y, z] = orbitPosition(
      center,
      orbit.azimuth,
      orbit.elevation,
      distance,
    );
    camera.position.set(x, y, z);
    camera.lookAt(center);
  });

  return null;
}

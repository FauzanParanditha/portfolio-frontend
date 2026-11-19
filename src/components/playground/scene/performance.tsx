"use client";

import { useFrame } from "@react-three/fiber";
import { useRef } from "react";

/**
 * Penyesuaian beban render, dipakai scene /playground dan tur beranda.
 */

/** Perangkat yang kemungkinan lemah: lewati bayangan real-time. */
export function detectLowPower(): boolean {
  if (typeof window === "undefined") return false;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const cores = navigator.hardwareConcurrency ?? 8;
  return coarse || cores <= 4;
}

/**
 * Batas atas resolusi render saat mulai. Tidak lebih tinggi dari layar itu
 * sendiri: di layar DPR 1, menurunkan batas dari 2 ke 1,5 tidak mengubah apa
 * pun dan hanya membuang waktu ukur.
 */
export function initialMaxDpr(lowPower: boolean): number {
  return Math.max(
    1,
    Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2),
  );
}

/**
 * Turunkan resolusi render bila frame rate jatuh. Hanya menurun — tidak naik
 * lagi — supaya tidak berosilasi di perangkat yang pas-pasan.
 */
export function AdaptiveResolution({
  maxDpr,
  onLower,
}: {
  maxDpr: number;
  onLower: (dpr: number) => void;
}) {
  const stats = useRef({ frames: 0, elapsed: 0, cooldown: 2 });

  useFrame((_, delta) => {
    const s = stats.current;
    // Lewati frame "lompat" (tab baru aktif) agar tidak salah menilai.
    if (delta > 0.25) return;
    if (s.cooldown > 0) {
      s.cooldown -= delta;
      return;
    }
    s.frames++;
    s.elapsed += delta;
    if (s.frames < 90) return;

    const fps = s.frames / s.elapsed;
    s.frames = 0;
    s.elapsed = 0;
    if (fps < 42 && maxDpr > 1) {
      onLower(Math.max(1, maxDpr - 0.5));
      s.cooldown = 2;
    }
  });

  return null;
}

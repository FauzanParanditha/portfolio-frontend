"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Keadaan browser yang dibaca lewat `useSyncExternalStore`: dukungan WebGL,
 * preferensi gerak, visibilitas tab, dan media query. Dipakai /playground dan
 * tur beranda.
 *
 * Semua hook punya nilai sisi-server yang tetap, jadi HTML dari server dan
 * render hidrasi pertama selalu cocok; nilai sebenarnya menyusul sesudahnya.
 */

const noopSubscribe = () => () => {};

let webglSupport: boolean | null = null;
function detectWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ?? canvas.getContext("webgl") ?? null;
    webglSupport = context !== null;
    // Lepas konteks percobaan; browser membatasi jumlah konteks aktif.
    (context as WebGLRenderingContext | null)
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

/** `true` di server dan di render hidrasi pertama, apa pun perangkatnya. */
export function useWebGLSupport(): boolean {
  return useSyncExternalStore(noopSubscribe, detectWebGL, () => true);
}

/**
 * Apakah media query cocok. `serverValue` dipakai di server dan di render
 * hidrasi pertama.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia?.(query);
      list?.addEventListener("change", onChange);
      return () => list?.removeEventListener("change", onChange);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia?.(query).matches ?? false,
    () => serverValue,
  );
}

export function useReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
function getHidden(): boolean {
  return document.visibilityState === "hidden";
}

/** Tab sedang tersembunyi (pindah tab, jendela diminimalkan). */
export function useDocumentHidden(): boolean {
  return useSyncExternalStore(subscribeVisibility, getHidden, () => false);
}

"use client"; // pastikan ini ada di file yang menggunakan hook ini

import * as React from "react";

const MOBILE_BREAKPOINT = 768;
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

// useSyncExternalStore adalah cara yang memang disediakan React untuk
// berlangganan state di luar React (di sini: matchMedia). Sebelumnya nilai awal
// diisi lewat setState di dalam useEffect — itu memicu render berantai (render
// pertama selalu "desktop", lalu langsung render ulang) dan ditandai aturan
// react-hooks/set-state-in-effect.

function subscribe(onStoreChange: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", onStoreChange);
  return () => mql.removeEventListener("change", onStoreChange);
}

const getSnapshot = () => window.matchMedia(MOBILE_QUERY).matches;

// Di server tidak ada window; asumsikan desktop agar markup SSR stabil.
const getServerSnapshot = () => false;

export function useIsMobile() {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

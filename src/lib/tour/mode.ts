/**
 * Pilihan tampilan tur: "3d" (ruang server di belakang kartu) atau "simple"
 * (halaman biasa). `null` = belum memilih; bawaannya ditentukan ukuran layar
 * dan preferensi gerak (lihat globals.css).
 *
 * Disimpan di localStorage supaya pilihan bertahan antar-kunjungan. Bila
 * storage diblokir (mode privat), pilihan tetap berlaku selama halaman terbuka.
 */
export type TourMode = "3d" | "simple";

const KEY = "tour-mode";
const listeners = new Set<() => void>();
// `undefined` = belum pernah diubah di sesi ini; baca dari storage.
let chosen: TourMode | null | undefined;

function parse(value: unknown): TourMode | null {
  return value === "3d" || value === "simple" ? value : null;
}

export function readTourMode(): TourMode | null {
  if (chosen !== undefined) return chosen;
  try {
    return parse(window.localStorage.getItem(KEY));
  } catch {
    return null;
  }
}

export function writeTourMode(mode: TourMode): void {
  chosen = mode;
  try {
    window.localStorage.setItem(KEY, mode);
  } catch {
    // Storage diblokir: cukup di memori.
  }
  for (const listener of listeners) listener();
}

export function subscribeTourMode(onChange: () => void): () => void {
  // Tab lain mengubah pilihan: ikuti, dan lupakan nilai di memori.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== null && event.key !== KEY) return;
    chosen = undefined;
    onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** Hanya untuk test: kembali ke keadaan "belum memilih". */
export function resetTourModeForTest(): void {
  chosen = undefined;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // diabaikan
  }
}

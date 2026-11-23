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
/**
 * Atribut pada <html> yang dibaca CSS tata letak (globals.css). Dipasang
 * SEBELUM paint oleh skrip inline di <head> root layout
 * (`TOUR_MODE_SCRIPT`), sehingga
 * pengunjung yang pernah memilih tidak melihat tata letak bawaan sekejap lalu
 * melompat saat React terhidrasi. Modul ini menjaganya tetap sinkron sesudahnya.
 */
const ATTRIBUTE = "data-tour-mode";

/**
 * Skrip pra-paint; nilainya harus sejalan dengan `KEY`, `ATTRIBUTE`, `parse`.
 * Dibungkus try/catch: storage yang diblokir tidak boleh menghentikan halaman.
 */
export const TOUR_MODE_SCRIPT = `
try {
  var m = localStorage.getItem('${KEY}');
  if (m === '3d' || m === 'simple') {
    document.documentElement.setAttribute('${ATTRIBUTE}', m);
  }
} catch (e) {
  /* mode privat / storage diblokir — pakai tampilan bawaan */
}
`.trim();

function reflect(mode: TourMode | null): void {
  const root = document.documentElement;
  if (mode) root.setAttribute(ATTRIBUTE, mode);
  else root.removeAttribute(ATTRIBUTE);
}
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
  reflect(mode);
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
    reflect(readTourMode());
    onChange();
  };
  // Navigasi sisi klien ke /tour tidak menjalankan skrip pra-paint lagi;
  // pastikan atributnya sesuai begitu tur terpasang.
  reflect(readTourMode());
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
  reflect(null);
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // diabaikan
  }
}

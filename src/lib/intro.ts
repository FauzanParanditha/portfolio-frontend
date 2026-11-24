/**
 * Penanda "intro pembuka sudah tampil" (lihat src/components/IntroOverlay.tsx).
 *
 * Atribut `data-intro="seen"` pada <html> menyembunyikan lapisan intro lewat
 * CSS. Ia dipasang di dua saat:
 *
 * 1. Sebelum paint, oleh `INTRO_SESSION_SCRIPT` (skrip inline di <head> root
 *    layout): bila sesi ini sudah pernah memuat dokumen situs, intro dilewati
 *    sejak gambar pertama. Kalau belum, skrip hanya mencatat sesinya.
 * 2. Setelah intro selesai diputar, oleh `markIntroSeen()`: tanpa ini atribut
 *    tidak pernah terpasang selama dokumen pertama itu hidup, dan intro
 *    terputar ulang tiap pengunjung kembali ke beranda lewat navigasi sisi
 *    klien (mis. /projects → "Back to Home").
 */

export const INTRO_ATTRIBUTE = "data-intro";
const KEY = "introSeen";

/** Dijalankan parser sebelum <body> digambar; harus berdiri sendiri. */
export const INTRO_SESSION_SCRIPT = `
try {
  if (sessionStorage.getItem('${KEY}')) {
    document.documentElement.setAttribute('${INTRO_ATTRIBUTE}', 'seen');
  } else {
    sessionStorage.setItem('${KEY}', '1');
  }
} catch (e) {
  /* mode privat / storage diblokir — intro tampil seperti biasa */
}
`.trim();

/** Intro sudah selesai di dokumen ini: jangan putar lagi sampai dimuat ulang. */
export function markIntroSeen(): void {
  document.documentElement.setAttribute(INTRO_ATTRIBUTE, "seen");
}

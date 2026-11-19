/** Seret melebihi ini (px) dianggap memutar kamera, bukan klik. */
export const CLICK_DRAG_TOLERANCE = 6;

/** Apakah fokus sedang di kontrol tempat pengguna mengetik? */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

/**
 * Bolehkah tombol panah dipakai untuk berjalan saat fokus berada di `target`?
 * Ya, kecuali fokus ada di tempat panah punya arti sendiri: daftar rak (yang
 * bisa digulir), dialog, atau kontrol mengetik.
 */
export function allowsArrowMovement(target: EventTarget | null): boolean {
  if (isPageTarget(target)) return true;
  if (!(target instanceof HTMLElement) || isTypingTarget(target)) return false;
  return target.closest('#rack-list, [role="dialog"]') === null;
}

/** Apakah peristiwa keyboard ditujukan ke halaman, bukan ke kontrol tertentu? */
export function isPageTarget(target: EventTarget | null): boolean {
  return target === document.body || target === document.documentElement;
}

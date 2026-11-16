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

/** Apakah peristiwa keyboard ditujukan ke halaman, bukan ke kontrol tertentu? */
export function isPageTarget(target: EventTarget | null): boolean {
  return target === document.body || target === document.documentElement;
}

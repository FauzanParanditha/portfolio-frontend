import axios from "axios";

/**
 * Baca header `Retry-After` dari respons error axios, dalam detik.
 *
 * Header ini boleh berupa angka detik ("42") atau tanggal HTTP
 * ("Wed, 21 Oct 2026 07:28:00 GMT"). Mengembalikan `null` bila header tidak
 * ada, tidak valid, atau sudah lewat — pemanggil lalu memakai teks bawaan.
 *
 * Catatan: untuk request lintas-origin, browser hanya mengizinkan JS membaca
 * header ini bila backend mencantumkannya di `Access-Control-Expose-Headers`.
 * Tanpa itu nilainya `null`, dan UI jatuh ke pesan generik.
 */
export function getRetryAfterSeconds(
  error: unknown,
  now: number = Date.now(),
): number | null {
  if (!axios.isAxiosError(error)) return null;

  const headers = error.response?.headers;
  const raw: unknown =
    headers && typeof headers === "object"
      ? (headers as Record<string, unknown>)["retry-after"]
      : undefined;
  if (typeof raw !== "string" && typeof raw !== "number") return null;

  const value = String(raw).trim();
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    const seconds = Number(value);
    return seconds > 0 ? seconds : null;
  }

  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;

  const seconds = Math.ceil((date - now) / 1000);
  return seconds > 0 ? seconds : null;
}

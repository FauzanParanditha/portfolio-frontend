import axios, { AxiosHeaders } from "axios";

/** Batas atas yang masuk akal untuk ditampilkan ke pengunjung: satu jam. */
export const MAX_RETRY_AFTER_SECONDS = 3600;

const toSeconds = (seconds: number): number | null =>
  Number.isSafeInteger(seconds) &&
  seconds > 0 &&
  seconds <= MAX_RETRY_AFTER_SECONDS
    ? seconds
    : null;

/** Ambil nilai header `retry-after`, via `AxiosHeaders#get` bila tersedia. */
function readRetryAfterHeader(headers: unknown): unknown {
  if (!headers || typeof headers !== "object") return undefined;
  if (headers instanceof AxiosHeaders) return headers.get("retry-after");
  return (headers as Record<string, unknown>)["retry-after"];
}

/**
 * Baca header `Retry-After` dari respons error axios, dalam detik.
 *
 * Header ini boleh berupa angka detik ("42") atau tanggal HTTP
 * ("Wed, 21 Oct 2026 07:28:00 GMT"). Mengembalikan `null` bila header tidak
 * ada, tidak valid, atau sudah lewat — pemanggil lalu memakai teks bawaan.
 *
 * Nilai di atas `MAX_RETRY_AFTER_SECONDS` (atau yang tidak bisa direpresentasikan
 * sebagai integer aman, mis. "9" diulang 400 kali → `Infinity`) juga `null`:
 * menampilkan "coba lagi dalam 99999... detik" lebih buruk daripada teks bawaan.
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

  const raw = readRetryAfterHeader(error.response?.headers);
  if (typeof raw !== "string" && typeof raw !== "number") return null;

  const value = String(raw).trim();
  if (!value) return null;

  if (/^\d+$/.test(value)) {
    return toSeconds(Number(value));
  }

  const date = Date.parse(value);
  if (Number.isNaN(date)) return null;

  return toSeconds(Math.ceil((date - now) / 1000));
}

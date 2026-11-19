"use client";

import { type Health, probeHealth } from "@/lib/playground/health";
import { useEffect } from "react";
import useSWR from "swr";

/** Pemeriksaan yang menggantung lebih lama dari ini dianggap tidak terjangkau. */
export const PROBE_TIMEOUT_MS = 5_000;
/** Jeda pemeriksaan selama panel status terbuka. */
export const FAST_INTERVAL_MS = 10_000;
/** Jeda untuk monitor di ruangan, dan setelah backend meminta melambat (429). */
export const SLOW_INTERVAL_MS = 60_000;

/**
 * `fetch` dengan batas waktu yang mencakup pembacaan isi, bukan hanya header:
 * isi yang menggantung akan membuat `probeHealth` — dan polling SWR, yang
 * menunggu giliran sekarang selesai — berhenti selamanya.
 */
async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // Tanpa kredensial: pemeriksaan status tidak butuh cookie apa pun.
    const response = await fetch(input, {
      ...init,
      credentials: "omit",
      signal: controller.signal,
    });
    return {
      status: response.status,
      json: () => response.json().finally(() => clearTimeout(timer)),
    };
  } catch (error) {
    clearTimeout(timer);
    throw error;
  }
}

/**
 * Status backend untuk terminal di /playground.
 *
 * Sengaja memakai `fetch` langsung, bukan `publicClient`: interceptor axios
 * itu memunculkan toast untuk tiap galat, sedangkan di sini 404/503 adalah
 * keadaan yang ditampilkan dengan tenang di panel — bukan kejadian yang perlu
 * diumumkan.
 *
 * @param fast  panel status sedang terbuka → periksa tiap 10 dtk; selain itu
 *              tiap 60 dtk (untuk layar monitor di ruangan). Batas backend
 *              60 permintaan/menit per IP; mode cepat memakai 12. Bila backend
 *              menjawab 429, jeda kembali ke 60 dtk sampai ia menjawab lagi.
 * @param enabled  `false` = tidak memeriksa sama sekali (mis. tab tersembunyi).
 */
export function useBackendHealth(fast: boolean, enabled = true): Health | null {
  const { data, mutate } = useSWR<Health>(
    enabled ? "playground-health" : null,
    () =>
      probeHealth(fetchWithTimeout, process.env.NEXT_PUBLIC_API_URL, () =>
        performance.now(),
      ),
    {
      refreshInterval: (latest) =>
        fast && latest?.overall !== "limited"
          ? FAST_INTERVAL_MS
          : SLOW_INTERVAL_MS,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      dedupingInterval: 5_000,
    },
  );

  // Panel baru dibuka: hasil yang ada bisa berumur hampir semenit (jeda
  // lambat), padahal panel menyebutnya "right now". Periksa ulang seketika —
  // kecuali hasilnya memang baru, atau backend sedang meminta melambat.
  const checkedAt = data?.checkedAt;
  const limited = data?.overall === "limited";
  useEffect(() => {
    if (!fast || !enabled || checkedAt === undefined || limited) return;
    if (Date.now() - checkedAt >= FAST_INTERVAL_MS / 2) void mutate();
  }, [fast, enabled, checkedAt, limited, mutate]);

  return data ?? null;
}

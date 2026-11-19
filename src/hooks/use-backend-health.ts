"use client";

import { type Health, probeHealth } from "@/lib/playground/health";
import useSWR from "swr";

/** Pemeriksaan yang menggantung lebih lama dari ini dianggap tidak terjangkau. */
const PROBE_TIMEOUT_MS = 5_000;

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    // Tanpa kredensial: pemeriksaan status tidak butuh cookie apa pun.
    return await fetch(input, {
      ...init,
      credentials: "omit",
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
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
 *              60 permintaan/menit per IP; mode cepat memakai 12.
 * @param enabled  `false` = tidak memeriksa sama sekali (mis. tab tersembunyi).
 */
export function useBackendHealth(fast: boolean, enabled = true): Health | null {
  const { data } = useSWR<Health>(
    enabled ? "playground-health" : null,
    () =>
      probeHealth(fetchWithTimeout, process.env.NEXT_PUBLIC_API_URL, () =>
        performance.now(),
      ),
    {
      refreshInterval: fast ? 10_000 : 60_000,
      refreshWhenHidden: false,
      revalidateOnFocus: false,
      shouldRetryOnError: false,
      dedupingInterval: 5_000,
    },
  );
  return data ?? null;
}

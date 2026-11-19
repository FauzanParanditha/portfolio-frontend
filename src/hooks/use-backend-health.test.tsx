import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  FAST_INTERVAL_MS,
  PROBE_TIMEOUT_MS,
  SLOW_INTERVAL_MS,
  useBackendHealth,
} from "@/hooks/use-backend-health";

const API = "http://api.test/api/v1";

/** Cache SWR baru tiap test, supaya hasil tidak bocor antar-test. */
const wrapper = ({ children }: { children: ReactNode }) => (
  <SWRConfig value={{ provider: () => new Map() }}>{children}</SWRConfig>
);

type Init = RequestInit & { signal: AbortSignal };
let calls: Array<{ url: string; init: Init }> = [];

/** Jawaban sehat untuk kedua endpoint, atau status tertentu untuk semuanya. */
function stubFetch(status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init: Init) => {
      calls.push({ url, init });
      return Promise.resolve({
        status,
        json: () =>
          Promise.resolve({
            data: { status: url.endsWith("/healthz") ? "ok" : "ready" },
          }),
      });
    }),
  );
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("useBackendHealth", () => {
  beforeEach(() => {
    calls = [];
    vi.useFakeTimers();
    vi.stubEnv("NEXT_PUBLIC_API_URL", API);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("memeriksa kedua endpoint tanpa kredensial, tanpa cache, dengan sinyal pembatal", async () => {
    stubFetch();
    const { result } = renderHook(() => useBackendHealth(false), { wrapper });
    await advance(0);

    expect(calls.map((c) => c.url)).toEqual([
      `${API}/healthz`,
      `${API}/readyz`,
    ]);
    for (const { init } of calls) {
      expect(init.credentials).toBe("omit");
      expect(init.cache).toBe("no-store");
      expect(init.signal).toBeInstanceOf(AbortSignal);
    }
    expect(result.current?.overall).toBe("operational");
  });

  it("enabled=false: tidak memeriksa sama sekali; mulai begitu diaktifkan", async () => {
    stubFetch();
    const { result, rerender } = renderHook(
      ({ enabled }) => useBackendHealth(false, enabled),
      { wrapper, initialProps: { enabled: false } },
    );
    await advance(SLOW_INTERVAL_MS * 3);
    expect(calls).toHaveLength(0);
    expect(result.current).toBeNull();

    rerender({ enabled: true });
    await advance(0);
    expect(calls).toHaveLength(2);
  });

  it("jeda lambat 60 dtk; jeda cepat 10 dtk", async () => {
    stubFetch();
    const { rerender } = renderHook(({ fast }) => useBackendHealth(fast), {
      wrapper,
      initialProps: { fast: false },
    });
    await advance(0);
    expect(calls).toHaveLength(2);
    await advance(SLOW_INTERVAL_MS - 1000);
    expect(calls).toHaveLength(2);
    await advance(1000);
    expect(calls).toHaveLength(4);

    // Hasil baru saja diambil → beralih ke cepat tidak memicu pemeriksaan
    // tambahan; berikutnya datang 10 dtk kemudian.
    rerender({ fast: true });
    await advance(0);
    expect(calls).toHaveLength(4);
    await advance(FAST_INTERVAL_MS - 1000);
    expect(calls).toHaveLength(4);
    await advance(1000);
    expect(calls).toHaveLength(6);
    await advance(FAST_INTERVAL_MS);
    expect(calls).toHaveLength(8);
  });

  it("panel dibuka saat hasil sudah basi: langsung diperiksa ulang, tidak menunggu 10 dtk", async () => {
    stubFetch();
    const { result, rerender } = renderHook(
      ({ fast }) => useBackendHealth(fast),
      { wrapper, initialProps: { fast: false } },
    );
    await advance(0);
    const first = result.current?.checkedAt;
    await advance(55_000);
    expect(calls).toHaveLength(2);

    rerender({ fast: true });
    await advance(0);
    expect(calls).toHaveLength(4);
    expect(result.current?.checkedAt).toBeGreaterThan(first as number);
  });

  it("backend menjawab 429: melambat ke 60 dtk walau panel terbuka, dan tidak memaksa periksa ulang", async () => {
    stubFetch(429);
    const { result } = renderHook(() => useBackendHealth(true), { wrapper });
    await advance(0);
    expect(result.current?.overall).toBe("limited");
    expect(calls).toHaveLength(2);

    await advance(FAST_INTERVAL_MS * 3);
    expect(calls).toHaveLength(2);
    await advance(SLOW_INTERVAL_MS - FAST_INTERVAL_MS * 3);
    expect(calls).toHaveLength(4);
  });

  it("permintaan yang menggantung dibatalkan setelah batas waktu → unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (url: string, init: Init) =>
          new Promise((_, reject) => {
            calls.push({ url, init });
            init.signal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            );
          }),
      ),
    );
    const { result } = renderHook(() => useBackendHealth(false), { wrapper });
    await advance(PROBE_TIMEOUT_MS - 1);
    expect(calls).toHaveLength(1);
    expect(calls[0].init.signal.aborted).toBe(false);

    await advance(1);
    expect(calls[0].init.signal.aborted).toBe(true);
    await advance(PROBE_TIMEOUT_MS);
    expect(result.current?.overall).toBe("unavailable");
  });

  it("isi jawaban yang menggantung juga kena batas waktu (polling tidak berhenti selamanya)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init: Init) => {
        calls.push({ url, init });
        return Promise.resolve({
          status: 200,
          json: () =>
            new Promise((_, reject) => {
              init.signal.addEventListener("abort", () =>
                reject(new DOMException("aborted", "AbortError")),
              );
            }),
        });
      }),
    );
    const { result } = renderHook(() => useBackendHealth(false), { wrapper });
    await advance(PROBE_TIMEOUT_MS - 1);
    expect(result.current).toBeNull();

    await advance(PROBE_TIMEOUT_MS + 1);
    // Header 200 tiba tetapi isinya tidak pernah selesai: bukan "ok".
    expect(result.current?.overall).toBe("degraded");
  });
});

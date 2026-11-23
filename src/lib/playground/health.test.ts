import { describe, expect, it, vi } from "vitest";
import {
  CHECK_NAMES,
  classifyCheck,
  formatClock,
  healthPath,
  healthUrl,
  probeHealth,
  summarizeHealth,
  type CheckState,
  type HealthCheck,
} from "./health";

const check = (state: CheckState): HealthCheck => ({
  name: "healthz",
  path: "/api/v1/healthz",
  state,
  latencyMs: 1,
});

describe("classifyCheck", () => {
  it("200 dengan isi yang diharapkan = ok", () => {
    expect(classifyCheck("healthz", 200, { data: { status: "ok" } })).toBe(
      "ok",
    );
    expect(classifyCheck("readyz", 200, { data: { status: "ready" } })).toBe(
      "ok",
    );
  });

  it("200 dengan isi lain (mis. halaman proxy, isi tertukar) = degraded", () => {
    expect(classifyCheck("readyz", 200, { data: { status: "ok" } })).toBe(
      "degraded",
    );
    expect(classifyCheck("healthz", 200, { status: "ok" })).toBe("degraded");
    for (const body of [null, undefined, "ok", 42, [], { data: null }]) {
      expect(classifyCheck("healthz", 200, body)).toBe("degraded");
    }
  });

  it("503 dan 5xx lain = degraded; 429 = limited", () => {
    expect(classifyCheck("readyz", 503, null)).toBe("degraded");
    expect(classifyCheck("readyz", 500, null)).toBe("degraded");
    expect(classifyCheck("readyz", 429, null)).toBe("limited");
  });

  it("gagal jaringan, 404 (endpoint belum ada), dan 4xx lain = unavailable", () => {
    expect(classifyCheck("healthz", null, null)).toBe("unavailable");
    expect(classifyCheck("healthz", 404, null)).toBe("unavailable");
    expect(classifyCheck("healthz", 403, null)).toBe("unavailable");
    expect(classifyCheck("healthz", 301, null)).toBe("unavailable");
  });

  it("isi jawaban galat tidak pernah mengubah hasil (tidak dipercaya)", () => {
    expect(classifyCheck("readyz", 503, { data: { status: "ready" } })).toBe(
      "degraded",
    );
  });
});

describe("summarizeHealth", () => {
  it("semua ok = operational", () => {
    expect(summarizeHealth([check("ok"), check("ok")])).toBe("operational");
  });
  it("ada yang degraded = degraded, apa pun sisanya", () => {
    expect(summarizeHealth([check("ok"), check("degraded")])).toBe("degraded");
    expect(summarizeHealth([check("unavailable"), check("degraded")])).toBe(
      "degraded",
    );
  });
  it("ada yang tak terjangkau (tanpa degraded) = unavailable", () => {
    expect(summarizeHealth([check("ok"), check("unavailable")])).toBe(
      "unavailable",
    );
  });
  it("semua dibatasi = limited; sebagian dibatasi tidak menjatuhkan status", () => {
    expect(summarizeHealth([check("limited"), check("limited")])).toBe(
      "limited",
    );
    expect(summarizeHealth([check("ok"), check("limited")])).toBe(
      "operational",
    );
  });
  it("tanpa pemeriksaan = unavailable", () => {
    expect(summarizeHealth([])).toBe("unavailable");
  });
});

describe("healthUrl & healthPath", () => {
  it("menyambung ke basis API, tanpa garis miring ganda", () => {
    expect(healthUrl("http://localhost:8080/api/v1", "healthz")).toBe(
      "http://localhost:8080/api/v1/healthz",
    );
    expect(healthUrl("https://api.example.com/api/v1///", "readyz")).toBe(
      "https://api.example.com/api/v1/readyz",
    );
    expect(healthUrl("/api/v1", "readyz")).toBe("/api/v1/readyz");
  });
  it("basis kosong atau tidak diset = tidak ada URL", () => {
    expect(healthUrl(undefined, "healthz")).toBeNull();
    expect(healthUrl("   ", "healthz")).toBeNull();
  });
  it("path yang ditampilkan tidak memuat origin, kredensial, atau query", () => {
    expect(healthPath("http://localhost:8080/api/v1", "healthz")).toBe(
      "/api/v1/healthz",
    );
    expect(healthPath("https://user:pw@api.example.com/v1", "readyz")).toBe(
      "/v1/readyz",
    );
    expect(healthPath("/api/v1", "readyz")).toBe("/api/v1/readyz");
    expect(healthPath(undefined, "readyz")).toBe("/readyz");
  });
});

/** Jam tiruan: tiap pembacaan maju `tick` milidetik. */
function clock(tick: number) {
  let t = 1000;
  return () => (t += tick);
}
const reply = (status: number, body: unknown) =>
  Promise.resolve({ status, json: () => Promise.resolve(body) });

describe("probeHealth", () => {
  const BASE = "http://localhost:8080/api/v1";

  it("memanggil kedua endpoint berurutan dan mengukur waktunya", async () => {
    const calls: string[] = [];
    const fetchImpl = vi.fn((url: string, init?: RequestInit) => {
      void init;
      calls.push(url);
      return url.endsWith("/healthz")
        ? reply(200, { data: { status: "ok" } })
        : reply(200, { data: { status: "ready" } });
    });
    const health = await probeHealth(fetchImpl, BASE, clock(7), () => 4242);

    expect(calls).toEqual([`${BASE}/healthz`, `${BASE}/readyz`]);
    expect(fetchImpl.mock.calls[0][1]).toMatchObject({ cache: "no-store" });
    expect(health).toEqual({
      overall: "operational",
      checkedAt: 4242,
      checks: [
        {
          name: "healthz",
          path: "/api/v1/healthz",
          state: "ok",
          latencyMs: 7,
        },
        { name: "readyz", path: "/api/v1/readyz", state: "ok", latencyMs: 7 },
      ],
    });
  });

  it("readyz 503 → degraded, dengan waktu tetap dicatat", async () => {
    const health = await probeHealth(
      (url) =>
        url.endsWith("/healthz")
          ? reply(200, { data: { status: "ok" } })
          : reply(503, { error: { code: "SERVICE_UNAVAILABLE" } }),
      BASE,
      clock(3),
    );
    expect(health.overall).toBe("degraded");
    expect(health.checks[1]).toMatchObject({ state: "degraded", latencyMs: 3 });
  });

  it("fetch melempar (jaringan/CORS/batas waktu) → unavailable, tidak ikut melempar", async () => {
    const health = await probeHealth(
      () => Promise.reject(new TypeError("Failed to fetch")),
      BASE,
      clock(1),
    );
    expect(health.overall).toBe("unavailable");
    expect(health.checks.map((c) => [c.state, c.latencyMs])).toEqual([
      ["unavailable", null],
      ["unavailable", null],
    ]);
  });

  it("isi bukan JSON (mis. halaman galat HTML) tidak melempar", async () => {
    const health = await probeHealth(
      () =>
        Promise.resolve({
          status: 200,
          json: () => Promise.reject(new SyntaxError("Unexpected token <")),
        }),
      BASE,
      clock(1),
    );
    expect(health.overall).toBe("degraded");
  });

  it("404 (backend lama tanpa endpoint ini) → unavailable tanpa latensi", async () => {
    const health = await probeHealth(() => reply(404, null), BASE, clock(1));
    expect(health.overall).toBe("unavailable");
    expect(health.checks[0].latencyMs).toBeNull();
  });

  it("429 → limited; tidak dianggap gangguan", async () => {
    const health = await probeHealth(() => reply(429, null), BASE, clock(1));
    expect(health.overall).toBe("limited");
  });

  it("basis API tidak diset: tidak ada permintaan sama sekali", async () => {
    const fetchImpl = vi.fn(() => reply(200, null));
    const health = await probeHealth(fetchImpl, undefined, clock(1));
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(health.overall).toBe("unavailable");
  });

  it("jam yang mundur tidak menghasilkan latensi negatif", async () => {
    let t = 100;
    const health = await probeHealth(
      () => reply(200, { data: { status: "ok" } }),
      BASE,
      () => (t -= 5),
    );
    expect(health.checks[0].latencyMs).toBe(0);
  });
});

describe("formatClock", () => {
  it("jam lokal HH:MM:SS, dengan nol di depan", () => {
    expect(formatClock(new Date(2026, 10, 20, 9, 5, 7).getTime())).toBe(
      "09:05:07",
    );
    expect(formatClock(new Date(2026, 10, 20, 23, 59, 0).getTime())).toBe(
      "23:59:00",
    );
    expect(formatClock(new Date(2026, 0, 1, 0, 0, 0).getTime())).toBe(
      "00:00:00",
    );
  });

  it("cap waktu rusak tidak menghasilkan NaN di layar", () => {
    expect(formatClock(NaN)).toBe("--:--:--");
    expect(formatClock(Infinity)).toBe("--:--:--");
  });

  it("tidak memakai Intl: panggilan pertamanya memblokir utas utama saat pengunjung menggulir", () => {
    const locale = vi.spyOn(Date.prototype, "toLocaleTimeString");
    const format = vi.spyOn(Intl, "DateTimeFormat");
    formatClock(Date.now());
    expect(locale).not.toHaveBeenCalled();
    expect(format).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

describe("CHECK_NAMES", () => {
  it("urutan pemeriksaan sama dengan urutan hasil probeHealth", async () => {
    const health = await probeHealth(
      () => reply(200, { data: { status: "ok" } }),
      "http://api.test/api/v1",
      clock(1),
    );
    expect(health.checks.map((check) => check.name)).toEqual([...CHECK_NAMES]);
  });
});

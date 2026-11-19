/**
 * Pemeriksaan status backend untuk terminal di playground.
 *
 * Fungsi murni (fetch dan jam disuntikkan) supaya bisa diuji tanpa jaringan.
 * Browser pengunjung memanggil dua endpoint publik di bawah `/api/v1`:
 * - `/healthz` — proses API hidup;
 * - `/readyz`  — API siap melayani (termasuk ketergantungannya).
 *
 * Backend sengaja tidak membuka detail (mis. status database); yang tampil ke
 * pengunjung hanya "operational / degraded / unavailable".
 */

export type CheckName = "healthz" | "readyz";

/**
 * - `ok`          : 200 dengan isi yang diharapkan;
 * - `degraded`    : server menjawab tetapi tidak sehat (503, 5xx lain, isi janggal);
 * - `limited`     : 429 — pemeriksaan terlalu sering, hasilnya tidak diketahui;
 * - `unavailable` : tidak terjangkau, atau endpoint belum ada (404).
 */
export type CheckState = "ok" | "degraded" | "limited" | "unavailable";

export interface HealthCheck {
  name: CheckName;
  /** Path yang ditampilkan ke pengunjung, mis. `/api/v1/healthz`. */
  path: string;
  state: CheckState;
  /** Waktu pulang-pergi dari browser, dalam milidetik; `null` bila gagal. */
  latencyMs: number | null;
}

export type OverallState =
  "operational" | "degraded" | "limited" | "unavailable";

export interface Health {
  checks: HealthCheck[];
  overall: OverallState;
  /** `Date.now()` saat pemeriksaan selesai. */
  checkedAt: number;
}

const EXPECTED: Record<CheckName, string> = { healthz: "ok", readyz: "ready" };
const NAMES: CheckName[] = ["healthz", "readyz"];

/** Klasifikasikan satu jawaban. `status === null` berarti permintaan gagal. */
export function classifyCheck(
  name: CheckName,
  status: number | null,
  body: unknown,
): CheckState {
  if (status === null || status === 404) return "unavailable";
  if (status === 429) return "limited";
  if (status === 200) {
    const reported =
      typeof body === "object" && body !== null
        ? (body as { data?: { status?: unknown } }).data?.status
        : undefined;
    return reported === EXPECTED[name] ? "ok" : "degraded";
  }
  // 503 dan galat server lain: API terjangkau tetapi tidak sehat.
  return status >= 500 ? "degraded" : "unavailable";
}

export function summarizeHealth(checks: HealthCheck[]): OverallState {
  if (checks.length === 0) return "unavailable";
  if (checks.some((check) => check.state === "degraded")) return "degraded";
  if (checks.some((check) => check.state === "unavailable")) {
    return "unavailable";
  }
  if (checks.every((check) => check.state === "limited")) return "limited";
  return "operational";
}

/** URL sebuah pemeriksaan dari basis API (`NEXT_PUBLIC_API_URL`), atau `null`. */
export function healthUrl(
  base: string | undefined,
  name: CheckName,
): string | null {
  const trimmed = (base ?? "").trim().replace(/\/+$/, "");
  return trimmed ? `${trimmed}/${name}` : null;
}

/** Path untuk ditampilkan: tanpa origin, apa pun bentuk basisnya. */
export function healthPath(base: string | undefined, name: CheckName): string {
  const url = healthUrl(base, name);
  if (!url) return `/${name}`;
  try {
    return new URL(url, "http://local.invalid").pathname;
  } catch {
    return `/${name}`;
  }
}

type FetchLike = (
  input: string,
  init?: RequestInit,
) => Promise<{ status: number; json: () => Promise<unknown> }>;

/**
 * Jalankan kedua pemeriksaan, berurutan supaya latensinya tidak saling
 * memengaruhi. Tidak pernah melempar: kegagalan menjadi `unavailable`.
 */
export async function probeHealth(
  fetchImpl: FetchLike,
  base: string | undefined,
  now: () => number,
  wallClock: () => number = Date.now,
): Promise<Health> {
  const checks: HealthCheck[] = [];
  for (const name of NAMES) {
    const url = healthUrl(base, name);
    const path = healthPath(base, name);
    if (!url) {
      checks.push({ name, path, state: "unavailable", latencyMs: null });
      continue;
    }
    const started = now();
    try {
      const response = await fetchImpl(url, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const body = await response.json().catch(() => null);
      const state = classifyCheck(name, response.status, body);
      checks.push({
        name,
        path,
        state,
        latencyMs:
          state === "unavailable"
            ? null
            : Math.max(0, Math.round(now() - started)),
      });
    } catch {
      checks.push({ name, path, state: "unavailable", latencyMs: null });
    }
  }
  return { checks, overall: summarizeHealth(checks), checkedAt: wallClock() };
}

/** Label untuk pengunjung (teks, bukan hanya warna). */
export const OVERALL_LABEL: Record<OverallState, string> = {
  operational: "Operational",
  degraded: "Degraded",
  limited: "Checking paused",
  unavailable: "Unavailable",
};

export const CHECK_LABEL: Record<CheckState, string> = {
  ok: "ok",
  degraded: "degraded",
  limited: "rate limited",
  unavailable: "unavailable",
};

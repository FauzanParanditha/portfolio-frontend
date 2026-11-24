import {
  CHECK_LABEL,
  CHECK_NAMES,
  type CheckState,
  formatClock,
  type Health,
  healthPath,
  OVERALL_LABEL,
  type OverallState,
} from "@/lib/playground/health";
import { CircleCheck, CircleX, Clock, TriangleAlert } from "lucide-react";

const OVERALL_STYLE: Record<
  OverallState,
  { icon: typeof CircleCheck; className: string }
> = {
  operational: {
    icon: CircleCheck,
    className: "border-emerald-400/60 text-emerald-300",
  },
  degraded: {
    icon: TriangleAlert,
    className: "border-amber-400/60 text-amber-300",
  },
  limited: { icon: Clock, className: "border-zinc-500 text-zinc-300" },
  unavailable: { icon: CircleX, className: "border-zinc-500 text-zinc-300" },
};

/**
 * Ringkasan status backend: pil keseluruhan, tabel per pemeriksaan, dan waktu
 * periksa. Dipakai panel terminal di /playground dan kartu status di tur.
 *
 * Status selalu disampaikan dengan ikon + teks, tidak hanya warna.
 *
 * Tabel dan baris waktu sudah dirender (berisi tanda tunggu) sebelum hasil
 * pertama tiba, supaya tinggi kartu tidak berubah saat hasilnya datang: kartu
 * yang memanjang menggeser semua isi di bawahnya dan memaksa seluruh halaman
 * ditata ulang di tengah pengunjung menggulir.
 */
export function HealthSummary({
  health,
  refreshHint = "Refreshes every 10 seconds while this panel is open.",
}: {
  health: Health | null;
  /** Kalimat setelah "Checked at …"; berbeda antara panel dan kartu tur. */
  refreshHint?: string;
}) {
  const style = health ? OVERALL_STYLE[health.overall] : null;
  const Icon = style?.icon ?? Clock;
  const rows: {
    name: string;
    path: string;
    state: CheckState | null;
    latencyMs: number | null;
  }[] =
    health?.checks ??
    CHECK_NAMES.map((name) => ({
      name,
      path: healthPath(process.env.NEXT_PUBLIC_API_URL, name),
      state: null,
      latencyMs: null,
    }));

  return (
    <>
      {/* role="status": perubahan "Checking…" → hasil diumumkan pembaca layar.
          Hanya pil ini — baris "Checked at…" berubah tiap 10 dtk. */}
      <p
        role="status"
        className={`inline-flex min-h-11 items-center gap-2 self-start rounded-full border px-4 text-sm font-medium ${
          style?.className ?? "border-zinc-600 text-zinc-300"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {health ? OVERALL_LABEL[health.overall] : "Checking…"}
      </p>

      <table
        data-requires-js
        className="w-full border-collapse font-mono text-sm tabular-nums"
      >
        <caption className="sr-only">Health checks</caption>
        <thead>
          <tr className="text-left text-xs tracking-widest text-zinc-400 uppercase">
            <th scope="col" className="pb-2 font-normal">
              Endpoint
            </th>
            <th scope="col" className="pb-2 font-normal">
              Result
            </th>
            <th scope="col" className="pb-2 text-right font-normal">
              Round trip
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((check) => (
            <tr key={check.name} className="border-t border-zinc-800">
              <th
                scope="row"
                className="py-3 pr-3 text-left font-normal break-all text-zinc-200"
              >
                {check.path}
              </th>
              <td
                className={`py-3 pr-3 ${
                  check.state === "ok"
                    ? "text-emerald-300"
                    : check.state === "degraded"
                      ? "text-amber-300"
                      : "text-zinc-300"
                }`}
              >
                {check.state === null ? (
                  // Tanda tunggu sengaja lebih sempit dari judul kolomnya:
                  // teks yang lebih lebar ("checking…") melebarkan kolom ini,
                  // mempersempit kolom alamat, dan di layar 320 px membuat
                  // alamatnya terlipat lebih banyak daripada setelah "ok" tiba
                  // — kartu lalu berubah tinggi 20 px.
                  <>
                    <span aria-hidden="true">…</span>
                    <span className="sr-only">checking</span>
                  </>
                ) : (
                  CHECK_LABEL[check.state]
                )}
              </td>
              <td className="py-3 text-right text-zinc-300">
                {check.latencyMs === null ? (
                  <>
                    <span aria-hidden="true">—</span>
                    <span className="sr-only">not measured</span>
                  </>
                ) : (
                  `${check.latencyMs} ms`
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Dua baris tersendiri: kalimat pertama berbeda panjang sebelum dan
          sesudah hasil tiba, dan bila menyambung dengan petunjuk dalam satu
          paragraf, jumlah barisnya (jadi tinggi kartu) bisa berubah di lebar
          tertentu. `data-requires-js`: tanpa JavaScript tidak akan pernah ada
          jawaban, jadi tabel tunggu dan janji penyegaran tidak ditampilkan. */}
      <p data-requires-js className="text-sm leading-relaxed text-zinc-400">
        <span className="block">
          {health
            ? `Checked at ${formatClock(health.checkedAt)}.`
            : "Waiting for an answer."}
        </span>
        {health?.overall !== "limited" && (
          <span className="block">{refreshHint}</span>
        )}
      </p>

      {health && (
        <>
          {health.overall === "unavailable" && (
            <p className="text-sm leading-relaxed text-zinc-400">
              The status endpoint can&apos;t be reached from here. The rest of
              the site may still work.
            </p>
          )}
          {health.overall === "limited" && (
            <p className="text-sm leading-relaxed text-zinc-400">
              The API asked this browser to slow down. Checking again once a
              minute until it answers.
            </p>
          )}
        </>
      )}
    </>
  );
}

/**
 * Pengukuran performa tur di perangkat sungguhan (lihat TourPerf.tsx).
 * Fungsi murni: ringkasan frame dan teks laporan, supaya bisa diuji.
 */

/**
 * Frame lebih lama dari ini dihitung "lambat". Sedikit di atas 33,3 ms (30 fps)
 * supaya layar 30 Hz yang stabil tidak ikut terhitung akibat pembulatan.
 */
const SLOW_FRAME_MS = 34;

export interface FrameSummary {
  frames: number;
  seconds: number;
  /** Rata-rata frame per detik. */
  avgFps: number;
  /** "1% terendah": laju pada 1% frame terlambat — terasa sebagai sendatan. */
  lowFps: number;
  /** Frame terlama, dalam milidetik. */
  worstMs: number;
  /** Bagian frame yang lebih lama dari 34 ms (di bawah 30 fps), 0..1. */
  slowShare: number;
}

/**
 * Ringkas cap waktu `requestAnimationFrame` (milidetik, menaik) menjadi angka
 * yang bisa dibandingkan antar-perangkat. Butuh minimal dua cap waktu.
 */
export function summarizeFrames(times: readonly number[]): FrameSummary | null {
  if (times.length < 2) return null;
  const gaps: number[] = [];
  for (let i = 1; i < times.length; i++) {
    const gap = times[i] - times[i - 1];
    // Cap waktu yang mundur atau sama (jam disetel, frame ganda) diabaikan.
    if (gap > 0 && Number.isFinite(gap)) gaps.push(gap);
  }
  if (gaps.length === 0) return null;

  const total = gaps.reduce((sum, gap) => sum + gap, 0);
  const sorted = gaps.slice().sort((a, b) => a - b);
  // Persentil ke-99 jeda antar-frame; untuk sampel kecil = frame terlama.
  const low =
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
  return {
    frames: gaps.length,
    seconds: total / 1000,
    avgFps: 1000 / (total / gaps.length),
    lowFps: 1000 / low,
    worstMs: sorted[sorted.length - 1],
    slowShare: gaps.filter((gap) => gap > SLOW_FRAME_MS).length / gaps.length,
  };
}

export interface PerfReport {
  mode: "3d" | "simple";
  viewport: string;
  dpr: number;
  /** Ukuran kanvas dalam piksel sebenarnya, atau `null` tanpa kanvas. */
  canvas: string | null;
  gpu: string | null;
  cores: number | null;
  memoryGb: number | null;
  /** Milidetik; `null` bila browser tidak melaporkannya (mis. Safari lama). */
  lcpMs: number | null;
  cls: number | null;
  /** Total waktu tugas panjang di atas 50 ms, milidetik. */
  blockedMs: number | null;
  /** Byte yang diunduh, `null` bila tidak dilaporkan. */
  scriptKb: number | null;
  totalKb: number | null;
  idle: FrameSummary | null;
  scroll: FrameSummary | null;
  userAgent: string;
}

const dash = "n/a";
const round = (value: number | null, digits = 0) =>
  value === null || !Number.isFinite(value) ? dash : value.toFixed(digits);

function frameLine(label: string, summary: FrameSummary | null): string {
  if (!summary) return `${label}: ${dash}`;
  return `${label}: avg ${summary.avgFps.toFixed(1)} fps, 1% low ${summary.lowFps.toFixed(1)} fps, worst ${summary.worstMs.toFixed(0)} ms, slow frames ${(summary.slowShare * 100).toFixed(1)}% (${summary.frames} frames / ${summary.seconds.toFixed(1)} s)`;
}

/** Teks laporan untuk disalin dari ponsel. Satu fakta per baris. */
export function formatReport(report: PerfReport): string {
  return [
    "Tour perf report",
    `mode: ${report.mode}`,
    `viewport: ${report.viewport} @ dpr ${report.dpr}`,
    `canvas: ${report.canvas ?? dash}`,
    `gpu: ${report.gpu ?? dash}`,
    `cpu cores: ${round(report.cores)} | memory: ${report.memoryGb === null ? dash : `${report.memoryGb} GB`}`,
    `LCP: ${round(report.lcpMs)} ms | CLS: ${round(report.cls, 3)} | blocked: ${round(report.blockedMs)} ms`,
    `download: scripts ${round(report.scriptKb)} KB, total ${round(report.totalKb)} KB`,
    frameLine("idle", report.idle),
    frameLine("scroll", report.scroll),
    `ua: ${report.userAgent}`,
  ].join("\n");
}

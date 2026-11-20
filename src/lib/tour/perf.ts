/**
 * Pengukuran performa tur di perangkat sungguhan (lihat TourPerf.tsx).
 * Fungsi murni: ringkasan frame dan teks laporan, supaya bisa diuji.
 */

/**
 * Frame lebih lama dari ini dihitung "lambat". Sedikit di atas 33,3 ms (30 fps)
 * supaya layar 30 Hz yang stabil tidak ikut terhitung akibat pembulatan.
 */
const SLOW_FRAME_MS = 34;

/** Jendela ukur saat diam, milidetik. */
export const IDLE_WINDOW_MS = 5_000;
/**
 * Jendela diam yang lebih pendek dari ini ditandai di laporan: uji dimulai
 * sebelum jendelanya penuh, jadi isinya didominasi sendatan saat halaman (dan
 * adegan 3D) baru dimuat — bukan keadaan diam.
 */
const SHORT_IDLE_SECONDS = (IDLE_WINDOW_MS / 1000) * 0.8;

export interface FrameSummary {
  frames: number;
  seconds: number;
  /** Rata-rata frame per detik. */
  avgFps: number;
  /**
   * "1% terendah": laju rata-rata pada 1% frame TERLAMA (minimal satu frame)
   * — terasa sebagai sendatan. Sengaja rata-rata, bukan persentil ke-99:
   * persentil membuang frame terlama, sehingga satu bekuan setengah detik di
   * antara ratusan frame mulus tetap terbaca "60 fps".
   */
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
  const slowest = sorted.slice(-Math.max(1, Math.ceil(sorted.length * 0.01)));
  const low = slowest.reduce((sum, gap) => sum + gap, 0) / slowest.length;
  return {
    frames: gaps.length,
    seconds: total / 1000,
    avgFps: 1000 / (total / gaps.length),
    lowFps: 1000 / low,
    worstMs: sorted[sorted.length - 1],
    slowShare: gaps.filter((gap) => gap > SLOW_FRAME_MS).length / gaps.length,
  };
}

/** Bagian `PerformanceResourceTiming` yang dipakai untuk menghitung unduhan. */
export interface ResourceSample {
  name: string;
  initiatorType: string;
  transferSize: number;
  decodedBodySize: number;
}

export interface DownloadSummary {
  /** Byte yang benar-benar lewat jaringan, `null` bila tidak dilaporkan. */
  scriptKb: number | null;
  totalKb: number | null;
  /** Jumlah berkas (termasuk dokumennya), dan berapa yang datang dari cache. */
  files: number | null;
  cachedFiles: number | null;
}

/**
 * Jumlahkan byte yang diunduh halaman ini. Berkas dari cache browser
 * ber-`transferSize` 0 walau isinya ada — dihitung terpisah supaya laporan
 * dari kunjungan kedua tidak terbaca sebagai "halaman ini hanya 26 KB".
 */
export function summarizeDownloads(
  resources: readonly ResourceSample[],
  navigation?: ResourceSample,
): DownloadSummary {
  if (resources.length === 0 || typeof resources[0].transferSize !== "number") {
    return { scriptKb: null, totalKb: null, files: null, cachedFiles: null };
  }
  let script = 0;
  let total = 0;
  let cached = 0;
  const all = navigation ? [navigation, ...resources] : resources;
  for (const resource of all) {
    total += resource.transferSize;
    if (resource.transferSize === 0 && resource.decodedBodySize > 0) cached++;
    // Berkas .js yang dimuat lewat <link rel="preload"> ber-inisiator "link".
    if (
      resource.initiatorType === "script" ||
      /\.js(\?|$)/.test(resource.name)
    ) {
      script += resource.transferSize;
    }
  }
  return {
    scriptKb: script / 1024,
    totalKb: total / 1024,
    files: all.length,
    cachedFiles: cached,
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
  /** Jumlah berkas dan berapa yang dari cache; `null` bila tidak dilaporkan. */
  files: number | null;
  cachedFiles: number | null;
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

/** Catatan di baris `idle` bila jendelanya belum penuh saat uji dimulai. */
function idleNote(summary: FrameSummary | null): string {
  return summary && summary.seconds < SHORT_IDLE_SECONDS
    ? " [short window: includes start-up, wait 5 s before testing]"
    : "";
}

/** Catatan di baris `download` bila sebagian berkas tidak lewat jaringan. */
function cacheNote(report: PerfReport): string {
  const { cachedFiles, files } = report;
  if (!cachedFiles || !files || !Number.isFinite(cachedFiles)) return "";
  return ` [${cachedFiles} of ${files} files from cache: not the full download]`;
}

/** Teks laporan untuk disalin dari ponsel. Satu fakta per baris. */
export function formatReport(report: PerfReport): string {
  return [
    "Tour perf report",
    `mode: ${report.mode}`,
    `viewport: ${report.viewport} @ dpr ${round(report.dpr, 2).replace(/\.?0+$/, "")}`,
    `canvas: ${report.canvas ?? dash}`,
    `gpu: ${report.gpu ?? dash}`,
    `cpu cores: ${round(report.cores)} | memory: ${round(report.memoryGb, 1).replace(/\.0$/, "")}${report.memoryGb === null || !Number.isFinite(report.memoryGb) ? "" : " GB"}`,
    // CLS di sini = jumlah semua pergeseran sejak halaman dimuat (bukan
    // jendela sesi seperti CLS standar), jadi tidak pernah lebih kecil darinya.
    `LCP: ${round(report.lcpMs)} ms | CLS (sum since load): ${round(report.cls, 3)} | blocked: ${round(report.blockedMs)} ms`,
    `download: scripts ${round(report.scriptKb)} KB, total ${round(report.totalKb)} KB${cacheNote(report)}`,
    frameLine("idle", report.idle) + idleNote(report.idle),
    frameLine("scroll", report.scroll),
    `ua: ${report.userAgent}`,
  ].join("\n");
}

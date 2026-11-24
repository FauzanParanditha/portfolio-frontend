"use client";

import {
  type DownloadSummary,
  formatReport,
  type FrameSummary,
  IDLE_WINDOW_MS,
  type LongFrameSample,
  type PerfReport,
  summarizeDownloads,
  summarizeFrames,
  summarizeLongFrames,
} from "@/lib/tour/perf";
import { useCallback, useEffect, useRef, useState } from "react";

/** Lama uji gulir otomatis. */
const SCROLL_TEST_MS = 12_000;
/**
 * Percobaan "tanpa blur": mematikan `backdrop-filter` di seluruh tur. Kartu
 * ber-blur di atas kanvas yang terus bergerak harus dihitung ulang tiap frame;
 * sakelar ini mengukur berapa biayanya di perangkat yang sedang diuji.
 */
const NO_BLUR_CSS =
  ".tour, .tour * { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }";

/** Batas entri frame panjang yang disimpan. */
const MAX_LONG_FRAMES = 200;
/** Lama menunggu sebelum uji boleh dimulai: satu jendela diam penuh. */
const WARM_UP_SECONDS = IDLE_WINDOW_MS / 1000;

interface Vitals {
  lcpMs: number | null;
  cls: number | null;
  blockedMs: number | null;
}

/** Pasang pengamat untuk jenis entri yang didukung browser ini saja. */
function observe(
  type: string,
  onEntry: (entry: PerformanceEntry) => void,
): PerformanceObserver | null {
  if (
    typeof PerformanceObserver === "undefined" ||
    !PerformanceObserver.supportedEntryTypes?.includes(type)
  ) {
    return null;
  }
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) onEntry(entry);
  });
  observer.observe({ type, buffered: true });
  return observer;
}

/** Unduhan halaman ini menurut browser (lihat `summarizeDownloads`). */
function downloadSizes(): DownloadSummary {
  const resources = performance.getEntriesByType(
    "resource",
  ) as PerformanceResourceTiming[];
  const [navigation] = performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[];
  return summarizeDownloads(resources, navigation);
}

/** Elemen tur yang saat ini benar-benar memakai `backdrop-filter`. */
function countBlurred(): number | null {
  try {
    let count = 0;
    for (const element of document.querySelectorAll(".tour, .tour *")) {
      const style = getComputedStyle(element);
      // Rel perhentian tetap ada di DOM saat disembunyikan (ponsel): tidak
      // digambar, jadi tidak ikut dihitung.
      if (style.display === "none") continue;
      const value =
        style.backdropFilter ||
        style.getPropertyValue("-webkit-backdrop-filter");
      if (value && value !== "none") count++;
    }
    return count;
  } catch {
    return null;
  }
}

function gpuName(): string | null {
  try {
    const gl = document.createElement("canvas").getContext("webgl");
    if (!gl) return null;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info
      ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
      : null;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return name;
  } catch {
    return null;
  }
}

/**
 * Panel ukur untuk menguji tur di perangkat sungguhan. Hanya dimuat bila
 * alamatnya memuat `?perf` — pengunjung biasa tidak pernah mengunduhnya.
 *
 * Semua angka dihitung di perangkat itu sendiri dan tidak dikirim ke mana pun;
 * tombol "Copy" menyalin teks laporan supaya bisa ditempel ke catatan.
 *
 * "Close" melepas panelnya sungguhan (bukan sekadar menyembunyikan), sehingga
 * pengukuran dan uji gulir yang sedang berjalan ikut berhenti.
 */
export default function TourPerf({ show3d }: { show3d: boolean }) {
  const [closed, setClosed] = useState(false);
  const close = useCallback(() => setClosed(true), []);
  return closed ? null : <Panel show3d={show3d} onClose={close} />;
}

function Panel({ show3d, onClose }: { show3d: boolean; onClose: () => void }) {
  const frames = useRef<number[]>([]);
  const vitals = useRef<Vitals>({ lcpMs: null, cls: null, blockedMs: null });
  /** Entri `long-animation-frame`; `null` bila browser tidak mendukungnya. */
  const longFrames = useRef<LongFrameSample[] | null>(null);
  const longFrameObserver = useRef<PerformanceObserver | null>(null);
  /** Membatalkan uji gulir yang sedang berjalan; `null` bila tidak ada. */
  const cancelTest = useRef<(() => void) | null>(null);
  const [idle, setIdle] = useState<FrameSummary | null>(null);
  const [scroll, setScroll] = useState<FrameSummary | null>(null);
  const [testing, setTesting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [report, setReport] = useState("");
  const [copied, setCopied] = useState(false);
  const [blur, setBlur] = useState(true);
  // Gaya percobaan hidup di <head> selama blur dimatikan, dan ikut dicabut
  // saat panel dilepas — pengunjung berikutnya tidak mewarisinya.
  useEffect(() => {
    if (blur) return;
    const style = document.createElement("style");
    style.dataset.tourPerf = "no-blur";
    style.textContent = NO_BLUR_CSS;
    document.head.append(style);
    return () => style.remove();
  }, [blur]);
  /**
   * Detik tersisa sebelum uji boleh dimulai (0 = siap). Uji yang ditekan tepat
   * setelah halaman dimuat atau tampilan diganti ikut merekam sendatan awal
   * (hidrasi, kompilasi shader) sebagai sendatan saat bergulir. Di uji ponsel
   * sungguhan hampir semua laporan dimulai terlalu cepat walau petunjuknya
   * meminta menunggu, jadi tombolnya yang menunggu sampai jendela diam penuh.
   */
  const [wait, setWait] = useState(WARM_UP_SECONDS);
  const warmSince = useRef(0);
  // Ganti tampilan atau sakelar blur: hitung mundur dari awal, sejak render
  // ini juga (bukan menunggu detak berikutnya) supaya tombol tidak sempat
  // ditekan. Uji yang sedang berjalan dibatalkan: separuh rekamannya berasal
  // dari tampilan lama, dan jarak gulirnya sudah tidak cocok.
  const warmKey = `${show3d}:${blur}`;
  const [shownKey, setShownKey] = useState(warmKey);
  if (shownKey !== warmKey) {
    setShownKey(warmKey);
    setWait(WARM_UP_SECONDS);
    if (testing) {
      setTesting(false);
      setNote("Test cancelled: the view changed. Run it again.");
    }
  }
  useEffect(() => {
    warmSince.current = performance.now();
    cancelTest.current?.();
  }, [warmKey]);

  // Cap waktu tiap frame, disimpan untuk jendela terakhir saja.
  useEffect(() => {
    let frame = requestAnimationFrame(function tick(now) {
      const times = frames.current;
      times.push(now);
      while (times.length > 2 && now - times[0] > SCROLL_TEST_MS + 1_000) {
        times.shift();
      }
      frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  // Ringkasan saat diam, diperbarui tiap detik.
  useEffect(() => {
    const timer = setInterval(() => {
      const now = performance.now();
      // 3D di jaringan lambat: kode adegan bisa butuh lebih dari 5 dtk untuk
      // tiba. Selama kanvasnya belum ada, masa tunggu belum mulai berjalan.
      if (show3d && !document.querySelector(".tour canvas")) {
        warmSince.current = now;
      }
      setWait(
        Math.max(
          0,
          Math.ceil((IDLE_WINDOW_MS - (now - warmSince.current)) / 1000),
        ),
      );
      setIdle(
        summarizeFrames(
          frames.current.filter((time) => now - time <= IDLE_WINDOW_MS),
        ),
      );
    }, 1_000);
    return () => clearInterval(timer);
  }, [show3d]);

  useEffect(() => {
    const current = vitals.current;
    const observers = [
      observe("largest-contentful-paint", (entry) => {
        current.lcpMs = entry.startTime;
      }),
      observe("layout-shift", (entry) => {
        const shift = entry as PerformanceEntry & {
          value: number;
          hadRecentInput: boolean;
        };
        // Pergeseran akibat ketukan pengunjung (mis. ganti tampilan) tidak
        // dihitung, sama seperti CLS standar.
        if (!shift.hadRecentInput) {
          current.cls = (current.cls ?? 0) + shift.value;
        }
      }),
      observe("long-animation-frame", (entry) => {
        const list = (longFrames.current ??= []);
        list.push(entry as unknown as LongFrameSample);
        // Cukup yang terbaru; uji 12 dtk tidak akan menghasilkan sebanyak ini.
        if (list.length > MAX_LONG_FRAMES) list.shift();
      }),
      observe("longtask", (entry) => {
        current.blockedMs =
          (current.blockedMs ?? 0) + Math.max(0, entry.duration - 50);
      }),
    ];
    // Didukung tetapi belum ada entri = nol, bukan "tidak dilaporkan".
    if (observers[1]) current.cls ??= 0;
    if (observers[2]) longFrames.current ??= [];
    longFrameObserver.current = observers[2];
    if (observers[3]) current.blockedMs ??= 0;
    return () => {
      for (const observer of observers) observer?.disconnect();
    };
  }, []);

  // Panel dilepas (Close, pindah halaman): hentikan uji yang masih berjalan.
  // Tanpa ini halaman berikutnya terus digulir sendiri sampai 12 dtk habis.
  useEffect(() => () => cancelTest.current?.(), []);

  // Tab disembunyikan di tengah uji: browser menghentikan frame, dan jeda
  // panjang itu akan terbaca sebagai sendatan. Batalkan saja.
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden" && cancelTest.current) {
        cancelTest.current();
        setTesting(false);
        setNote("Test cancelled: the tab was hidden. Run it again.");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const buildReport = useCallback(
    (
      scrollSummary: FrameSummary | null,
      idleSummary: FrameSummary | null,
      start: number,
    ) => {
      const canvas = document.querySelector<HTMLCanvasElement>(".tour canvas");
      const memory = (navigator as Navigator & { deviceMemory?: number })
        .deviceMemory;
      const data: PerfReport = {
        mode: show3d ? "3d" : "simple",
        blur,
        blurred: countBlurred(),
        viewport: `${window.innerWidth}x${window.innerHeight}`,
        dpr: window.devicePixelRatio || 1,
        canvas: canvas ? `${canvas.width}x${canvas.height}` : null,
        gpu: gpuName(),
        cores: navigator.hardwareConcurrency ?? null,
        memoryGb: memory ?? null,
        ...vitals.current,
        ...downloadSizes(),
        idle: idleSummary,
        scroll: scrollSummary,
        longFrames:
          longFrames.current &&
          summarizeLongFrames(longFrames.current, start, SCROLL_TEST_MS),
        userAgent: navigator.userAgent,
      };
      return formatReport(data);
    },
    [show3d, blur],
  );

  // Gulir seluruh halaman dengan laju tetap, lalu ringkas frame selama itu.
  const runScrollTest = () => {
    // Ref, bukan state: dua klik dalam satu tugas tidak boleh memulai dua uji.
    if (cancelTest.current) return;
    const root = document.documentElement;
    const distance = root.scrollHeight - window.innerHeight;
    if (!(distance > 0)) {
      setNote("Nothing to scroll on this page, so there is nothing to test.");
      return;
    }

    setTesting(true);
    setCopied(false);
    setNote(null);
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    const idleBefore = summarizeFrames(
      frames.current.filter(
        (time) => performance.now() - time <= IDLE_WINDOW_MS,
      ),
    );
    const start = performance.now();
    let frame = 0;
    const stop = () => {
      cancelAnimationFrame(frame);
      root.style.scrollBehavior = previous;
      cancelTest.current = null;
    };
    cancelTest.current = stop;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / SCROLL_TEST_MS);
      window.scrollTo(0, distance * t);
      if (t < 1) {
        frame = requestAnimationFrame(step);
        return;
      }
      const summary = summarizeFrames(
        frames.current.filter((time) => time >= start),
      );
      // Entri frame panjang diantar asinkron; yang terjadi di detik terakhir
      // uji bisa masih mengantre di pengamatnya.
      const pending = longFrameObserver.current?.takeRecords?.() ?? [];
      if (longFrames.current) {
        longFrames.current.push(...(pending as unknown as LongFrameSample[]));
      }
      stop();
      window.scrollTo(0, 0);
      setScroll(summary);
      setReport(buildReport(summary, idleBefore, start));
      setTesting(false);
    };
    window.scrollTo(0, 0);
    frame = requestAnimationFrame(step);
  };

  const copy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
    } catch {
      // Clipboard ditolak (mis. http di jaringan lokal): teksnya tetap bisa
      // dipilih dan disalin manual dari kotak di bawah.
      setCopied(false);
    }
  };

  return (
    <aside
      aria-label="Performance test"
      className="fixed bottom-3 left-3 z-40 flex w-[min(22rem,calc(100vw-1.5rem))] flex-col gap-2 rounded-lg border border-zinc-700 bg-zinc-950/95 p-3 font-mono text-xs text-zinc-200 shadow-xl"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="tracking-widest text-cyan-400 uppercase">
          Perf · {show3d ? "3D" : "simple"}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="min-h-9 rounded px-2 text-zinc-400 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-hidden"
        >
          Close
        </button>
      </div>
      {/* Tinggi tetap (dua baris): teks status yang memanjang tidak boleh
          mengubah tinggi panel — pergeseran itu ikut terhitung sebagai CLS. */}
      <p role="status" className="h-8 overflow-hidden leading-4 tabular-nums">
        {testing
          ? "Scrolling the page for 12 s…"
          : wait > 0
            ? `Warming up: test ready in ${wait} s`
            : (note ??
              (idle
                ? `idle ${idle.avgFps.toFixed(0)} fps · worst ${idle.worstMs.toFixed(0)} ms`
                : "Measuring…"))}
        {scroll && !testing && !note && wait === 0
          ? ` · scroll ${scroll.avgFps.toFixed(0)} fps (1% low ${scroll.lowFps.toFixed(0)})`
          : ""}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={runScrollTest}
          disabled={testing || wait > 0}
          className="min-h-11 flex-1 rounded-md bg-white px-3 font-sans text-xs font-medium tracking-widest text-zinc-950 uppercase disabled:opacity-50"
        >
          Run scroll test
        </button>
        <button
          type="button"
          onClick={copy}
          disabled={!report}
          className="min-h-11 rounded-md border border-zinc-600 px-3 font-sans text-xs font-medium tracking-widest uppercase disabled:opacity-50"
        >
          {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          aria-pressed={!blur}
          onClick={() => setBlur((on) => !on)}
          disabled={testing}
          className="min-h-11 rounded-md border border-zinc-600 px-3 font-sans text-xs font-medium tracking-widest whitespace-nowrap uppercase disabled:opacity-50 aria-pressed:border-amber-400 aria-pressed:text-amber-300"
        >
          No blur
        </button>
      </div>
      {/* Selalu dirender, dengan tinggi tetap: kotak yang baru muncul setelah
          uji akan menggeser isi panel dan mencemari angka CLS uji berikutnya. */}
      <textarea
        readOnly
        aria-label="Report"
        value={report}
        placeholder="Run the scroll test to get a report."
        rows={7}
        onFocus={(event) => event.currentTarget.select()}
        className="w-full resize-none rounded border border-zinc-800 bg-black p-2 text-[0.7rem] leading-snug text-zinc-300 placeholder:text-zinc-500"
      />
    </aside>
  );
}

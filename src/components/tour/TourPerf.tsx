"use client";

import {
  formatReport,
  type FrameSummary,
  type PerfReport,
  summarizeFrames,
} from "@/lib/tour/perf";
import { useCallback, useEffect, useRef, useState } from "react";

/** Lama uji gulir otomatis dan jendela ukur saat diam. */
const SCROLL_TEST_MS = 12_000;
const IDLE_WINDOW_MS = 5_000;

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

/** Byte yang diunduh halaman ini (0 = dari cache atau tidak dilaporkan). */
function downloadSizes(): { scriptKb: number | null; totalKb: number | null } {
  const resources = performance.getEntriesByType(
    "resource",
  ) as PerformanceResourceTiming[];
  const [navigation] = performance.getEntriesByType(
    "navigation",
  ) as PerformanceNavigationTiming[];
  if (resources.length === 0 || typeof resources[0].transferSize !== "number") {
    return { scriptKb: null, totalKb: null };
  }
  let script = 0;
  let total = navigation?.transferSize ?? 0;
  for (const resource of resources) {
    total += resource.transferSize;
    // Berkas .js yang dimuat lewat <link rel="preload"> ber-inisiator "link".
    if (
      resource.initiatorType === "script" ||
      /\.js(\?|$)/.test(resource.name)
    ) {
      script += resource.transferSize;
    }
  }
  return { scriptKb: script / 1024, totalKb: total / 1024 };
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
  /** Membatalkan uji gulir yang sedang berjalan; `null` bila tidak ada. */
  const cancelTest = useRef<(() => void) | null>(null);
  const [idle, setIdle] = useState<FrameSummary | null>(null);
  const [scroll, setScroll] = useState<FrameSummary | null>(null);
  const [testing, setTesting] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [report, setReport] = useState("");
  const [copied, setCopied] = useState(false);

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
      setIdle(
        summarizeFrames(
          frames.current.filter((time) => now - time <= IDLE_WINDOW_MS),
        ),
      );
    }, 1_000);
    return () => clearInterval(timer);
  }, []);

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
      observe("longtask", (entry) => {
        current.blockedMs =
          (current.blockedMs ?? 0) + Math.max(0, entry.duration - 50);
      }),
    ];
    // Didukung tetapi belum ada entri = nol, bukan "tidak dilaporkan".
    if (observers[1]) current.cls ??= 0;
    if (observers[2]) current.blockedMs ??= 0;
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
    (scrollSummary: FrameSummary | null, idleSummary: FrameSummary | null) => {
      const canvas = document.querySelector<HTMLCanvasElement>(".tour canvas");
      const memory = (navigator as Navigator & { deviceMemory?: number })
        .deviceMemory;
      const data: PerfReport = {
        mode: show3d ? "3d" : "simple",
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
        userAgent: navigator.userAgent,
      };
      return formatReport(data);
    },
    [show3d],
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
      stop();
      window.scrollTo(0, 0);
      setScroll(summary);
      setReport(buildReport(summary, idleBefore));
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
        {note ??
          (testing
            ? "Scrolling the page for 12 s…"
            : idle
              ? `idle ${idle.avgFps.toFixed(0)} fps · worst ${idle.worstMs.toFixed(0)} ms`
              : "Measuring…")}
        {scroll && !testing && !note
          ? ` · scroll ${scroll.avgFps.toFixed(0)} fps (1% low ${scroll.lowFps.toFixed(0)})`
          : ""}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={runScrollTest}
          disabled={testing}
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

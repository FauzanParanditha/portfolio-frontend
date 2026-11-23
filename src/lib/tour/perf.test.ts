import { describe, expect, it } from "vitest";
import {
  formatReport,
  type PerfReport,
  type ResourceSample,
  summarizeDownloads,
  summarizeFrames,
  summarizeLongFrames,
} from "./perf";

/** Cap waktu frame dengan jeda tetap. */
const steady = (count: number, gap: number, start = 0) =>
  Array.from({ length: count }, (_, i) => start + i * gap);

describe("summarizeFrames", () => {
  it("60 fps stabil", () => {
    const summary = summarizeFrames(steady(301, 1000 / 60))!;
    expect(summary.frames).toBe(300);
    expect(summary.seconds).toBeCloseTo(5);
    expect(summary.avgFps).toBeCloseTo(60);
    expect(summary.lowFps).toBeCloseTo(60);
    expect(summary.worstMs).toBeCloseTo(16.67, 1);
    expect(summary.slowShare).toBe(0);
  });

  it("sendatan: rata-rata tetap tinggi, tetapi 1% terendah dan frame terlama mengungkapnya", () => {
    // 297 frame mulus + 3 frame 100 ms.
    const times = steady(298, 1000 / 60);
    let t = times[times.length - 1];
    for (let i = 0; i < 3; i++) times.push((t += 100));
    const summary = summarizeFrames(times)!;
    expect(summary.avgFps).toBeGreaterThan(55);
    // 1% dari 300 frame = 3 frame terlama, semuanya 100 ms.
    expect(summary.lowFps).toBeCloseTo(10);
    expect(summary.worstMs).toBeCloseTo(100);
    expect(summary.slowShare).toBeCloseTo(3 / 300);
  });

  it("satu bekuan di antara ratusan frame mulus tetap terlihat di 1% terendah", () => {
    // 720 frame 60 fps (uji gulir 12 dtk) dengan satu frame 500 ms. Persentil
    // ke-99 akan membuang frame itu dan melaporkan 60 fps.
    const times = steady(720, 1000 / 60);
    times.push(times[times.length - 1] + 500);
    const summary = summarizeFrames(times)!;
    expect(summary.worstMs).toBeCloseTo(500);
    expect(summary.lowFps).toBeLessThan(15);
    expect(summary.lowFps).toBeLessThan(summary.avgFps);
  });

  it("1% terendah tidak pernah lebih tinggi dari rata-rata, dan frame terlama tidak lebih cepat darinya", () => {
    for (const times of [
      steady(11, 20),
      [0, 16, 32, 200, 216, 232],
      [...steady(200, 16), 200 * 16 + 90, 200 * 16 + 106],
    ]) {
      const summary = summarizeFrames(times)!;
      expect(summary.lowFps).toBeLessThanOrEqual(summary.avgFps + 1e-9);
      expect(1000 / summary.worstMs).toBeLessThanOrEqual(summary.lowFps + 1e-9);
    }
  });

  it("jeda tak hingga (cap waktu rusak) diabaikan", () => {
    const summary = summarizeFrames([0, 16, Infinity, 32, 48])!;
    expect(Number.isFinite(summary.avgFps)).toBe(true);
    expect(Number.isFinite(summary.worstMs)).toBe(true);
  });

  it("20 fps: semua frame terhitung lambat", () => {
    const summary = summarizeFrames(steady(41, 50))!;
    expect(summary.avgFps).toBeCloseTo(20);
    expect(summary.slowShare).toBe(1);
  });

  it("30 fps yang stabil tidak dihitung lambat (batasnya 34 ms)", () => {
    expect(summarizeFrames(steady(31, 1000 / 30))!.slowShare).toBe(0);
    expect(summarizeFrames(steady(31, 35))!.slowShare).toBe(1);
  });

  it("kurang dari dua cap waktu, atau tanpa jeda sah: tidak ada ringkasan", () => {
    expect(summarizeFrames([])).toBeNull();
    expect(summarizeFrames([100])).toBeNull();
    expect(summarizeFrames([100, 100, 100])).toBeNull();
    expect(summarizeFrames([100, NaN])).toBeNull();
  });

  it("cap waktu yang mundur diabaikan, tidak menghasilkan laju negatif", () => {
    const summary = summarizeFrames([0, 16, 10, 26, 42])!;
    expect(summary.frames).toBe(3);
    expect(summary.avgFps).toBeGreaterThan(0);
    expect(summary.worstMs).toBe(16);
  });
});

describe("summarizeFrames: posisi frame terlama", () => {
  it("melaporkan di mana frame terlama terjadi, 0..1 dari rekaman", () => {
    // 12 dtk @ 60 fps dengan satu bekuan 240 ms yang berakhir di detik ke-4,8.
    const times: number[] = [];
    for (let t = 0; t <= 12_000; t += 1000 / 60) {
      if (t > 4560 && t < 4800) continue;
      times.push(t);
    }
    const summary = summarizeFrames(times)!;
    expect(summary.worstMs).toBeGreaterThan(230);
    expect(summary.worstAt).toBeCloseTo(0.4, 2);
  });

  it("bekuan di awal dan di akhir: 0 dan 1, tidak keluar rentang", () => {
    const early = summarizeFrames([0, 300, 316, 332, 348])!;
    expect(early.worstAt).toBeCloseTo(300 / 348);
    const late = summarizeFrames([0, 16, 32, 48, 348])!;
    expect(late.worstAt).toBe(1);
    const first = summarizeFrames([0, 300, 1300, 2300, 3000])!;
    expect(first.worstAt).toBeGreaterThanOrEqual(0);
    expect(first.worstAt).toBeLessThanOrEqual(1);
  });

  it("frame yang sama panjang: yang pertama yang dilaporkan", () => {
    expect(summarizeFrames([0, 100, 200, 300, 400])!.worstAt).toBe(0.25);
  });
});

describe("formatReport", () => {
  const base: PerfReport = {
    mode: "3d",
    blur: true,
    viewport: "390x844",
    dpr: 3,
    canvas: "780x1688",
    gpu: "Adreno 610",
    cores: 8,
    memoryGb: 4,
    lcpMs: 1234.4,
    cls: 0.0123,
    blockedMs: 310.2,
    scriptKb: 484,
    totalKb: 586,
    files: 30,
    cachedFiles: 0,
    idle: summarizeFrames(steady(301, 1000 / 60)),
    scroll: summarizeFrames(steady(61, 1000 / 30)),
    longFrames: [],
    userAgent: "TestBrowser/1.0",
  };

  it("satu fakta per baris, dengan satuannya", () => {
    const lines = formatReport(base).split("\n");
    expect(lines[0]).toBe("Tour perf report");
    expect(lines).toContain("mode: 3d");
    expect(lines[2]).toBe("backdrop blur: on");
    expect(formatReport({ ...base, blur: false }).split("\n")[2]).toBe(
      "backdrop blur: off (experiment)",
    );
    expect(lines).toContain("viewport: 390x844 @ dpr 3");
    expect(lines).toContain("canvas: 780x1688");
    expect(lines).toContain("gpu: Adreno 610");
    expect(lines).toContain("cpu cores: 8 | memory: 4 GB");
    expect(lines).toContain(
      "LCP: 1234 ms | CLS (sum since load): 0.012 | blocked: 310 ms",
    );
    expect(lines).toContain("download: scripts 484 KB, total 586 KB");
    expect(lines.find((line) => line.startsWith("idle:"))).toMatch(
      /^idle: avg 60\.0 fps, 1% low 60\.0 fps, worst 17 ms, slow frames 0\.0% \(300 frames \/ 5\.0 s\)$/,
    );
    // Hanya baris scroll yang menyebut posisi frame terlama: uji gulir
    // bergerak dengan laju tetap, jadi posisinya = posisi gulir.
    expect(lines.find((line) => line.startsWith("scroll:"))).toMatch(
      /^scroll: avg 30\.0 fps, 1% low 30\.0 fps, worst 33 ms at \d+%, slow frames/,
    );
    expect(lines.find((line) => line.startsWith("idle:"))).not.toMatch(
      / at \d+%/,
    );
    expect(lines[lines.length - 1]).toBe("ua: TestBrowser/1.0");
  });

  it("yang tidak dilaporkan browser ditulis n/a, bukan 0 atau NaN", () => {
    const text = formatReport({
      ...base,
      mode: "simple",
      canvas: null,
      gpu: null,
      cores: null,
      memoryGb: null,
      lcpMs: null,
      cls: null,
      blockedMs: null,
      scriptKb: null,
      totalKb: null,
      files: null,
      cachedFiles: null,
      idle: null,
      scroll: null,
    });
    expect(text).toContain("canvas: n/a");
    expect(text).toContain("gpu: n/a");
    expect(text).toContain("cpu cores: n/a | memory: n/a");
    expect(text).toContain(
      "LCP: n/a ms | CLS (sum since load): n/a | blocked: n/a ms",
    );
    expect(text).toContain("download: scripts n/a KB, total n/a KB");
    expect(text).toContain("idle: n/a");
    expect(text).toContain("scroll: n/a");
    expect(text).not.toMatch(/NaN|undefined|null/);
  });

  it("angka rusak (NaN, tak hingga) dari browser ditulis n/a di SEMUA kolom", () => {
    const text = formatReport({
      ...base,
      dpr: NaN,
      cores: NaN,
      memoryGb: Infinity,
      lcpMs: NaN,
      cls: -Infinity,
      blockedMs: NaN,
      scriptKb: NaN,
      totalKb: Infinity,
      files: NaN,
      cachedFiles: NaN,
    });
    expect(text).not.toMatch(/NaN|Infinity|undefined|null/);
    expect(text).toContain("@ dpr n/a");
    expect(text).toContain("cpu cores: n/a | memory: n/a");
    expect(text).not.toContain("n/a GB");
  });

  it("dpr dan memori pecahan ditulis apa adanya, tanpa nol di belakang", () => {
    const text = formatReport({ ...base, dpr: 2.625, memoryGb: 0.5 });
    expect(text).toContain("@ dpr 2.63");
    expect(text).toContain("memory: 0.5 GB");
    expect(formatReport(base)).toContain("@ dpr 3\n");
    expect(formatReport(base)).toContain("memory: 4 GB");
  });

  it("jendela diam yang belum penuh ditandai: isinya sendatan awal, bukan keadaan diam", () => {
    // Laporan dari ponsel sungguhan: uji dimulai 1,1 dtk setelah halaman
    // dimuat, dan baris idle-nya (1% low 5,5 fps) terbaca seperti masalah.
    const short = formatReport({
      ...base,
      idle: summarizeFrames(steady(60, 1000 / 60)),
    });
    expect(short).toMatch(
      /\nidle: .*\(59 frames \/ 1\.0 s\) \[short window: includes start-up, wait 5 s before testing\]\n/,
    );
    // Jendela penuh (5 dtk) dan hampir penuh (4 dtk) tidak ditandai.
    for (const count of [301, 241]) {
      const full = formatReport({
        ...base,
        idle: summarizeFrames(steady(count, 1000 / 60)),
      });
      expect(full).not.toContain("short window");
    }
    // Sedikit di bawah 4 dtk sudah ditandai.
    expect(
      formatReport({ ...base, idle: summarizeFrames(steady(235, 1000 / 60)) }),
    ).toContain("short window");
  });

  it("catatan jendela pendek hanya untuk baris idle, tidak untuk scroll", () => {
    const text = formatReport({
      ...base,
      scroll: summarizeFrames(steady(31, 1000 / 30)),
    });
    expect(text.split("\n").find((line) => line.startsWith("scroll:"))).toMatch(
      /\(30 frames \/ 1\.0 s\)$/,
    );
  });

  it("berkas dari cache disebut di baris download, supaya angkanya tidak dibaca sebagai unduhan penuh", () => {
    const text = formatReport({
      ...base,
      scriptKb: 0,
      totalKb: 26,
      files: 31,
      cachedFiles: 28,
    });
    expect(text).toContain(
      "download: scripts 0 KB, total 26 KB [28 of 31 files from cache: not the full download]\n",
    );
    // Tanpa berkas dari cache, atau bila tidak dilaporkan: tanpa catatan.
    expect(formatReport(base)).toContain(
      "download: scripts 484 KB, total 586 KB\n",
    );
    expect(formatReport({ ...base, files: null, cachedFiles: null })).toContain(
      "download: scripts 484 KB, total 586 KB\n",
    );
  });
});

describe("summarizeDownloads", () => {
  const file = (
    name: string,
    initiatorType: string,
    transferSize: number,
    decodedBodySize = transferSize * 3,
  ): ResourceSample => ({ name, initiatorType, transferSize, decodedBodySize });

  it("menjumlahkan byte jaringan; skrip dikenali dari inisiator atau akhiran .js", () => {
    const summary = summarizeDownloads(
      [
        file("https://x.test/a.js", "script", 2048),
        // .js lewat <link rel="preload">: inisiatornya "link".
        file("https://x.test/b.js?v=1", "link", 1024),
        file("https://x.test/style.css", "link", 4096),
        file("https://x.test/photo.jpg", "img", 8192),
      ],
      file("https://x.test/tour", "navigation", 1024),
    );
    expect(summary.scriptKb).toBe(3);
    // Dokumennya ikut di total, tetapi bukan skrip.
    expect(summary.totalKb).toBe(16);
    expect(summary.files).toBe(5);
    expect(summary.cachedFiles).toBe(0);
  });

  it("berkas dari cache (0 byte lewat jaringan, isinya ada) dihitung terpisah", () => {
    const summary = summarizeDownloads(
      [
        file("https://x.test/a.js", "script", 0, 90_000),
        file("https://x.test/b.js", "script", 0, 50_000),
        file("https://x.test/c.js", "script", 2048),
        // Lintas-origin tanpa Timing-Allow-Origin: 0 dan 0 — tidak diketahui,
        // jadi tidak diklaim "dari cache".
        file("https://cdn.test/font.woff2", "css", 0, 0),
      ],
      file("https://x.test/tour", "navigation", 0, 40_000),
    );
    expect(summary.scriptKb).toBe(2);
    expect(summary.totalKb).toBe(2);
    expect(summary.files).toBe(5);
    expect(summary.cachedFiles).toBe(3);
  });

  it("tanpa entri, atau browser tanpa transferSize: tidak dilaporkan (null), bukan 0", () => {
    const none = {
      scriptKb: null,
      totalKb: null,
      files: null,
      cachedFiles: null,
    };
    expect(summarizeDownloads([])).toEqual(none);
    expect(
      summarizeDownloads([
        { name: "a.js", initiatorType: "script" } as ResourceSample,
      ]),
    ).toEqual(none);
  });

  it("tanpa entri navigasi tetap menjumlahkan berkasnya", () => {
    const summary = summarizeDownloads([file("a.js", "script", 1024)]);
    expect(summary).toEqual({
      scriptKb: 1,
      totalKb: 1,
      files: 1,
      cachedFiles: 0,
    });
  });
});

describe("summarizeLongFrames", () => {
  const START = 10_000;
  const SPAN = 12_000;
  const entry = (
    at: number,
    duration: number,
    extra: Partial<Parameters<typeof summarizeLongFrames>[0][number]> = {},
  ) => ({ startTime: START + at * SPAN, duration, ...extra });

  it("hanya frame di dalam jendela uji, terlama lebih dulu, dengan posisinya", () => {
    const frames = summarizeLongFrames(
      [
        entry(-0.2, 400), // sebelum uji (mis. saat halaman dimuat)
        entry(0.4, 90),
        entry(0.79, 209),
        entry(0.1, 60),
        entry(1.1, 300), // setelah uji selesai
      ],
      START,
      SPAN,
    );
    expect(
      frames.map((frame) => [Math.round(frame.at * 100), frame.ms]),
    ).toEqual([
      [79, 209],
      [40, 90],
      [10, 60],
    ]);
  });

  it("frame yang mulai sebelum uji tetapi berakhir di dalamnya ikut dihitung, di posisi 0", () => {
    const [frame] = summarizeLongFrames([entry(-0.005, 200)], START, SPAN);
    expect(frame.at).toBe(0);
    expect(frame.ms).toBe(200);
  });

  it("isi frame: total skrip, pemanggil dan berkas skrip terlama, waktu tata letak", () => {
    const [frame] = summarizeLongFrames(
      [
        entry(0.5, 200, {
          // Tata letak mulai 30 ms sebelum frame berakhir.
          styleAndLayoutStart: START + 0.5 * SPAN + 170,
          scripts: [
            { duration: 20, invoker: "FrameRequestCallback", sourceURL: "" },
            {
              duration: 120,
              invoker: "MessagePort.onmessage",
              sourceURL: "http://x.test/_next/static/chunks/abc123.js?v=1#x",
            },
          ],
        }),
      ],
      START,
      SPAN,
    );
    expect(frame.scriptMs).toBe(140);
    expect(frame.invoker).toBe("MessagePort.onmessage");
    expect(frame.source).toBe("abc123.js");
    expect(frame.layoutMs).toBe(30);
  });

  it("frame tanpa skrip dan tanpa tata letak: nol, bukan NaN (jeda di luar skrip)", () => {
    const [frame] = summarizeLongFrames([entry(0.3, 120)], START, SPAN);
    expect(frame).toEqual({
      at: expect.closeTo(0.3),
      ms: 120,
      scriptMs: 0,
      invoker: null,
      source: null,
      layoutMs: 0,
    });
    const [zero] = summarizeLongFrames(
      [entry(0.3, 120, { styleAndLayoutStart: 0, scripts: [] })],
      START,
      SPAN,
    );
    expect(zero.layoutMs).toBe(0);
  });

  it("dibatasi (bawaan 4), nama panjang dipotong, entri rusak dan jendela kosong diabaikan", () => {
    const many = Array.from({ length: 9 }, (_, i) => entry(i / 10, 60 + i));
    expect(summarizeLongFrames(many, START, SPAN)).toHaveLength(4);
    expect(summarizeLongFrames(many, START, SPAN, 2).map((f) => f.ms)).toEqual([
      68, 67,
    ]);
    const [long] = summarizeLongFrames(
      [
        entry(0.2, 80, {
          scripts: [{ duration: 70, invoker: "x".repeat(80) }],
        }),
      ],
      START,
      SPAN,
    );
    expect(long.invoker).toHaveLength(48);
    expect(long.invoker?.endsWith("…")).toBe(true);
    expect(
      summarizeLongFrames(
        [{ startTime: NaN, duration: 100 }, entry(0.2, Infinity)],
        START,
        SPAN,
      ),
    ).toEqual([]);
    expect(summarizeLongFrames(many, START, 0)).toEqual([]);
  });
});

describe("formatReport: frame panjang", () => {
  const base: PerfReport = {
    mode: "3d",
    blur: true,
    viewport: "390x844",
    dpr: 3,
    canvas: "585x1266",
    gpu: "Adreno 710",
    cores: 8,
    memoryGb: null,
    lcpMs: 760,
    cls: 0,
    blockedMs: 0,
    scriptKb: 1,
    totalKb: 2,
    files: 3,
    cachedFiles: 0,
    idle: null,
    scroll: null,
    longFrames: null,
    userAgent: "TestBrowser/1.0",
  };

  it("tidak didukung browser: n/a; didukung tetapi tidak ada: disebut tidak ada", () => {
    expect(formatReport(base)).toContain("\nlong frames: n/a\nua: ");
    expect(formatReport({ ...base, longFrames: [] })).toContain(
      "\nlong frames: none over 50 ms\nua: ",
    );
  });

  it("satu baris per frame panjang, setelah baris scroll", () => {
    const text = formatReport({
      ...base,
      longFrames: [
        {
          at: 0.79,
          ms: 209.4,
          scriptMs: 150.2,
          invoker: "MessagePort.onmessage",
          source: "abc123.js",
          layoutMs: 12,
        },
        {
          at: 0.4,
          ms: 90,
          scriptMs: 0,
          invoker: null,
          source: null,
          layoutMs: 0,
        },
      ],
    });
    expect(text).toContain(
      "\nscroll: n/a\n" +
        "long frame at 79%: 209 ms (script 150 ms via MessagePort.onmessage in abc123.js, layout 12 ms)\n" +
        "long frame at 40%: 90 ms (script 0 ms, layout 0 ms)\n" +
        "ua: ",
    );
  });
});

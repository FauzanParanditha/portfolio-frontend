import { describe, expect, it } from "vitest";
import { formatReport, type PerfReport, summarizeFrames } from "./perf";

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

describe("formatReport", () => {
  const base: PerfReport = {
    mode: "3d",
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
    idle: summarizeFrames(steady(121, 1000 / 60)),
    scroll: summarizeFrames(steady(61, 1000 / 30)),
    userAgent: "TestBrowser/1.0",
  };

  it("satu fakta per baris, dengan satuannya", () => {
    const lines = formatReport(base).split("\n");
    expect(lines[0]).toBe("Tour perf report");
    expect(lines).toContain("mode: 3d");
    expect(lines).toContain("viewport: 390x844 @ dpr 3");
    expect(lines).toContain("canvas: 780x1688");
    expect(lines).toContain("gpu: Adreno 610");
    expect(lines).toContain("cpu cores: 8 | memory: 4 GB");
    expect(lines).toContain(
      "LCP: 1234 ms | CLS (sum since load): 0.012 | blocked: 310 ms",
    );
    expect(lines).toContain("download: scripts 484 KB, total 586 KB");
    expect(lines.find((line) => line.startsWith("idle:"))).toMatch(
      /^idle: avg 60\.0 fps, 1% low 60\.0 fps, worst 17 ms, slow frames 0\.0% \(120 frames \/ 2\.0 s\)$/,
    );
    expect(lines.find((line) => line.startsWith("scroll:"))).toMatch(
      /^scroll: avg 30\.0 fps/,
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
});

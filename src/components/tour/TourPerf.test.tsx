import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import TourPerf from "@/components/tour/TourPerf";

describe("TourPerf (panel ukur di perangkat)", () => {
  let scrollTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers({
      toFake: [
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "performance",
        "setInterval",
        "clearInterval",
        "setTimeout",
        "clearTimeout",
        "Date",
      ],
    });
    scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(
      5000,
    );
    vi.spyOn(window, "innerHeight", "get").mockReturnValue(800);
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("menampilkan mode dan, setelah beberapa detik, laju frame saat diam", async () => {
    render(<TourPerf show3d={false} />);
    expect(screen.getByText("Perf · simple")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Measuring…");

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByRole("status")).toHaveTextContent(/idle \d+ fps/);
    // Belum ada laporan sebelum uji dijalankan.
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    // Kotak laporan sudah ada (kosong) sejak awal: kotak yang baru muncul
    // setelah uji akan menggeser panel dan mencemari CLS uji berikutnya.
    expect(screen.getByRole("textbox", { name: "Report" })).toHaveValue("");
  });

  it("uji gulir: menggulir seluruh halaman selama 12 dtk, kembali ke atas, lalu menyajikan laporan", async () => {
    render(<TourPerf show3d />);
    await act(() => vi.advanceTimersByTimeAsync(2000));

    fireEvent.click(screen.getByRole("button", { name: "Run scroll test" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Scrolling the page/);
    // Gulir halus dimatikan selama uji, supaya posisi mengikuti tiap frame.
    expect(document.documentElement.style.scrollBehavior).toBe("auto");
    expect(
      screen.getByRole("button", { name: "Run scroll test" }),
    ).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(6000));
    // Di tengah uji: sudah menggulir sekitar setengah jarak (4200 px).
    const midway = scrollTo.mock.calls.at(-1)?.[1] as number;
    expect(midway).toBeGreaterThan(1500);
    expect(midway).toBeLessThan(2700);

    await act(() => vi.advanceTimersByTimeAsync(7000));
    expect(scrollTo.mock.calls.some(([, y]) => y === 4200)).toBe(true);
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);

    const report = screen.getByRole("textbox", { name: "Report" });
    const text = (report as HTMLTextAreaElement).value;
    expect(text).toMatch(/^Tour perf report\nmode: 3d\n/);
    expect(text).toMatch(/\nscroll: avg \d+\.\d fps, 1% low/);
    expect(text).toMatch(/\nidle: avg \d+\.\d fps/);
    expect(text).not.toMatch(/NaN|undefined/);
    expect(screen.getByRole("status")).toHaveTextContent(/scroll \d+ fps/);
    expect(
      screen.getByRole("button", { name: "Run scroll test" }),
    ).toBeEnabled();
    // Gulir halus situs dipulihkan setelah uji.
    expect(document.documentElement.style.scrollBehavior).toBe("");
  });

  it("Copy menyalin laporan; bila clipboard ditolak teksnya tetap bisa disalin manual", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<TourPerf show3d={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Run scroll test" }));
    await act(() => vi.advanceTimersByTimeAsync(13000));

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(writeText).toHaveBeenCalledWith(
      expect.stringMatching(/^Tour perf report\nmode: simple\n/),
    );
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument();

    // Jalur gagal: tombol tidak berpura-pura berhasil.
    writeText.mockRejectedValueOnce(
      new DOMException("denied", "NotAllowedError"),
    );
    fireEvent.click(screen.getByRole("button", { name: "Run scroll test" }));
    await act(() => vi.advanceTimersByTimeAsync(13000));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy" }));
    });
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Report" })).toBeInTheDocument();
  });

  it("Close menyingkirkan panel DAN menghentikan pengukurannya", async () => {
    const cancel = vi.spyOn(globalThis, "cancelAnimationFrame");
    const clear = vi.spyOn(globalThis, "clearInterval");
    render(<TourPerf show3d={false} />);
    await act(() => vi.advanceTimersByTimeAsync(500));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("complementary")).toBeNull();
    // Loop frame dan interval ringkasan dilepas, bukan dibiarkan jalan.
    expect(cancel).toHaveBeenCalled();
    expect(clear).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("Close di tengah uji: halaman berhenti digulir dan gulir halus dipulihkan", async () => {
    document.documentElement.style.scrollBehavior = "smooth";
    render(<TourPerf show3d />);
    fireEvent.click(screen.getByRole("button", { name: "Run scroll test" }));
    await act(() => vi.advanceTimersByTimeAsync(3000));
    const before = scrollTo.mock.calls.length;
    expect(before).toBeGreaterThan(50);

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(document.documentElement.style.scrollBehavior).toBe("smooth");
    await act(() => vi.advanceTimersByTimeAsync(10000));
    expect(scrollTo.mock.calls.length).toBe(before);
    document.documentElement.style.scrollBehavior = "";
  });

  it("panel dilepas di tengah uji (pindah halaman): tidak terus menggulir halaman berikutnya", async () => {
    const { unmount } = render(<TourPerf show3d />);
    fireEvent.click(screen.getByRole("button", { name: "Run scroll test" }));
    await act(() => vi.advanceTimersByTimeAsync(3000));
    const before = scrollTo.mock.calls.length;
    unmount();
    expect(document.documentElement.style.scrollBehavior).toBe("");
    await vi.advanceTimersByTimeAsync(10000);
    expect(scrollTo.mock.calls.length).toBe(before);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("dua klik beruntun hanya memulai satu uji", async () => {
    render(<TourPerf show3d />);
    const button = screen.getByRole("button", { name: "Run scroll test" });
    // Dua klik dalam satu tugas, sebelum React sempat menonaktifkan tombol.
    act(() => {
      button.click();
      button.click();
    });
    scrollTo.mockClear();
    await act(() => vi.advanceTimersByTimeAsync(160));
    // ±10 frame dalam 160 ms; dua loop akan menggandakannya.
    expect(scrollTo.mock.calls.length).toBeLessThanOrEqual(11);
    await act(() => vi.advanceTimersByTimeAsync(13000));
    expect(document.documentElement.style.scrollBehavior).toBe("");
  });

  it("tab disembunyikan di tengah uji: uji dibatalkan, tidak melaporkan jeda itu sebagai sendatan", async () => {
    render(<TourPerf show3d />);
    fireEvent.click(screen.getByRole("button", { name: "Run scroll test" }));
    await act(() => vi.advanceTimersByTimeAsync(3000));
    const before = scrollTo.mock.calls.length;

    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(screen.getByRole("status")).toHaveTextContent(/Test cancelled/);
    expect(
      screen.getByRole("button", { name: "Run scroll test" }),
    ).toBeEnabled();
    expect(document.documentElement.style.scrollBehavior).toBe("");
    await act(() => vi.advanceTimersByTimeAsync(12000));
    expect(scrollTo.mock.calls.length).toBe(before);
    expect(screen.getByRole("textbox", { name: "Report" })).toHaveValue("");
  });

  it("halaman yang tidak bisa digulir: uji ditolak, tidak melaporkan 'gulir' palsu", async () => {
    vi.spyOn(document.documentElement, "scrollHeight", "get").mockReturnValue(
      800,
    );
    render(<TourPerf show3d={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Run scroll test" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Nothing to scroll/);
    await act(() => vi.advanceTimersByTimeAsync(13000));
    expect(scrollTo).not.toHaveBeenCalled();
    expect(screen.getByRole("textbox", { name: "Report" })).toHaveValue("");
  });

  it("CLS: pergeseran akibat ketukan pengunjung tidak dihitung; LCP dan waktu blokir ikut dilaporkan", async () => {
    // Tiruan PerformanceObserver: menyerahkan entri begitu diamati.
    const entries: Record<string, object[]> = {
      "largest-contentful-paint": [{ startTime: 812.4 }],
      "layout-shift": [
        { value: 0.02, hadRecentInput: false },
        { value: 0.5, hadRecentInput: true },
        { value: 0.03, hadRecentInput: false },
      ],
      longtask: [{ duration: 180 }, { duration: 40 }],
    };
    class FakeObserver {
      static supportedEntryTypes = Object.keys(entries);
      constructor(
        private callback: (list: { getEntries(): object[] }) => void,
      ) {}
      observe({ type }: { type: string }) {
        this.callback({ getEntries: () => entries[type] ?? [] });
      }
      disconnect() {}
    }
    vi.stubGlobal("PerformanceObserver", FakeObserver);

    render(<TourPerf show3d={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Run scroll test" }));
    await act(() => vi.advanceTimersByTimeAsync(13000));
    const text = (
      screen.getByRole("textbox", { name: "Report" }) as HTMLTextAreaElement
    ).value;
    // 0,02 + 0,03; yang 0,5 terjadi tepat setelah ketukan. 180 − 50 = 130 ms.
    expect(text).toContain(
      "LCP: 812 ms | CLS (sum since load): 0.050 | blocked: 130 ms",
    );
  });

  it("laporan menandai uji yang dimulai terlalu cepat dan berkas yang datang dari cache", async () => {
    vi.spyOn(performance, "getEntriesByType").mockImplementation(
      (type) =>
        (type === "navigation"
          ? [
              {
                name: "/tour",
                initiatorType: "navigation",
                transferSize: 0,
                decodedBodySize: 40_000,
              },
            ]
          : [
              {
                name: "/a.js",
                initiatorType: "script",
                transferSize: 0,
                decodedBodySize: 90_000,
              },
              {
                name: "/b.js",
                initiatorType: "script",
                transferSize: 2048,
                decodedBodySize: 6000,
              },
            ]) as unknown as PerformanceEntryList,
    );
    const reportAfter = async (waitMs: number) => {
      const view = render(<TourPerf show3d />);
      await act(() => vi.advanceTimersByTimeAsync(waitMs));
      fireEvent.click(screen.getByRole("button", { name: "Run scroll test" }));
      await act(() => vi.advanceTimersByTimeAsync(13000));
      const text = (
        screen.getByRole("textbox", { name: "Report" }) as HTMLTextAreaElement
      ).value;
      view.unmount();
      return text;
    };

    // Uji ditekan 1 dtk setelah panel muncul: jendela diamnya belum penuh.
    const early = await reportAfter(1000);
    expect(early).toMatch(/\nidle: [^\n]* \[short window: [^\n]*\]\n/);
    expect(early).toContain(
      "download: scripts 2 KB, total 2 KB [2 of 3 files from cache: not the full download]",
    );
    // Menunggu lebih dari 5 dtk: baris idle tanpa catatan.
    const later = await reportAfter(6000);
    expect(later).toMatch(/\nidle: avg /);
    expect(later).not.toContain("short window");
  });

  it("tinggi panel tetap: status dan kotak laporan berukuran sama sebelum dan sesudah uji", async () => {
    render(<TourPerf show3d={false} />);
    const shape = () => [
      screen.getByRole("status").className,
      screen.getByRole("textbox", { name: "Report" }).getAttribute("rows"),
      screen.getByRole("complementary").children.length,
    ];
    const before = shape();
    expect(before[0]).toMatch(/\bh-8\b/);
    fireEvent.click(screen.getByRole("button", { name: "Run scroll test" }));
    await act(() => vi.advanceTimersByTimeAsync(13000));
    expect(shape()).toEqual(before);
  });
});

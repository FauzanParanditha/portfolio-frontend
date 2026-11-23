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
  /** Lewati masa tunggu 5 dtk sebelum tombol uji aktif. */
  const warmUp = () => act(() => vi.advanceTimersByTimeAsync(5000));
  const runButton = () =>
    screen.getByRole("button", { name: "Run scroll test" });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("menampilkan mode dan, setelah beberapa detik, laju frame saat diam", async () => {
    render(<TourPerf show3d={false} />);
    expect(screen.getByText("Perf · simple")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/Warming up/);

    await act(() => vi.advanceTimersByTimeAsync(6000));
    expect(screen.getByRole("status")).toHaveTextContent(/idle \d+ fps/);
    // Belum ada laporan sebelum uji dijalankan.
    expect(screen.getByRole("button", { name: "Copy" })).toBeDisabled();
    // Kotak laporan sudah ada (kosong) sejak awal: kotak yang baru muncul
    // setelah uji akan menggeser panel dan mencemari CLS uji berikutnya.
    expect(screen.getByRole("textbox", { name: "Report" })).toHaveValue("");
  });

  it("uji gulir: menggulir seluruh halaman selama 12 dtk, kembali ke atas, lalu menyajikan laporan", async () => {
    render(<TourPerf show3d />);
    await warmUp();

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
    expect(text).toMatch(/^Tour perf report\nmode: 3d\nbackdrop blur: on\n/);
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
    await warmUp();
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
    await warmUp();
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
    await warmUp();
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
    await warmUp();
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
    await warmUp();
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
    await warmUp();
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
    await warmUp();
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

  it("laporan menyebut berkas yang datang dari cache, dan baris idle-nya berasal dari jendela penuh", async () => {
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
    render(<TourPerf show3d />);
    await warmUp();
    fireEvent.click(runButton());
    await act(() => vi.advanceTimersByTimeAsync(13000));
    const text = (
      screen.getByRole("textbox", { name: "Report" }) as HTMLTextAreaElement
    ).value;
    expect(text).toContain(
      "download: scripts 2 KB, total 2 KB [2 of 3 files from cache: not the full download]",
    );
    // Tombol baru aktif setelah jendela diam penuh, jadi baris idle bersih.
    expect(text).toMatch(/\nidle: avg [^\n]*\(\d+ frames \/ [45]\.\d s\)\n/);
    expect(text).not.toContain("short window");
  });

  it("tombol uji menunggu 5 dtk: uji yang ditekan terlalu cepat ikut merekam sendatan awal", async () => {
    render(<TourPerf show3d />);
    expect(runButton()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Warming up: test ready in 5 s",
    );

    await act(() => vi.advanceTimersByTimeAsync(3000));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Warming up: test ready in 2 s",
    );
    expect(runButton()).toBeDisabled();
    fireEvent.click(runButton());
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(scrollTo).not.toHaveBeenCalled();
    expect(runButton()).toBeDisabled();

    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(runButton()).toBeEnabled();
    expect(screen.getByRole("status")).toHaveTextContent(/idle \d+ fps/);
    expect(screen.getByRole("status")).not.toHaveTextContent(/Warming up/);
  });

  it("ganti tampilan: masa tunggu mulai dari awal, saat itu juga", async () => {
    const view = render(<TourPerf show3d={false} />);
    await warmUp();
    expect(runButton()).toBeEnabled();

    // Adegan 3D baru dimuat: sendatan awalnya tidak boleh masuk uji.
    view.rerender(<TourPerf show3d />);
    expect(runButton()).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Warming up: test ready in 5 s",
    );
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(runButton()).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(runButton()).toBeEnabled();

    // Render ulang tanpa ganti tampilan tidak mengulang masa tunggu.
    view.rerender(<TourPerf show3d />);
    expect(runButton()).toBeEnabled();
  });

  it("frame panjang selama uji dilaporkan dengan posisi dan isinya; yang di luar uji tidak", async () => {
    // Uji dimulai di t = 5000 ms (setelah masa tunggu) dan berjalan 12 dtk.
    const entries: Record<string, object[]> = {
      "long-animation-frame": [
        { startTime: 900, duration: 400, scripts: [] }, // saat halaman dimuat
        {
          startTime: 5000 + 0.79 * 12000,
          duration: 209,
          styleAndLayoutStart: 5000 + 0.79 * 12000 + 197,
          scripts: [
            {
              duration: 150,
              invoker: "MessagePort.onmessage",
              sourceURL: "http://x.test/chunks/abc123.js",
            },
          ],
        },
      ],
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

    render(<TourPerf show3d />);
    await warmUp();
    fireEvent.click(runButton());
    await act(() => vi.advanceTimersByTimeAsync(13000));
    const text = (
      screen.getByRole("textbox", { name: "Report" }) as HTMLTextAreaElement
    ).value;
    expect(text).toContain(
      "long frame at 79%: 209 ms (script 150 ms via MessagePort.onmessage in abc123.js, layout 12 ms)",
    );
    expect(text).not.toContain("400 ms");
    expect(text.match(/long frame at/g)).toHaveLength(1);
  });

  it("didukung tetapi belum ada entri = nol atau 'none', bukan n/a — per jenis entri", async () => {
    const reportWith = async (supported: string[]) => {
      class FakeObserver {
        static supportedEntryTypes = supported;
        observe() {}
        disconnect() {}
      }
      vi.stubGlobal("PerformanceObserver", FakeObserver);
      const view = render(<TourPerf show3d={false} />);
      await warmUp();
      fireEvent.click(runButton());
      await act(() => vi.advanceTimersByTimeAsync(13000));
      const text = (
        screen.getByRole("textbox", { name: "Report" }) as HTMLTextAreaElement
      ).value;
      view.unmount();
      return text;
    };

    const all = await reportWith([
      "largest-contentful-paint",
      "layout-shift",
      "long-animation-frame",
      "longtask",
    ]);
    expect(all).toContain("CLS (sum since load): 0.000 | blocked: 0 ms");
    expect(all).toContain("\nlong frames: none over 50 ms\n");

    // Browser lama: tugas panjang ada, frame panjang belum.
    const older = await reportWith(["layout-shift", "longtask"]);
    expect(older).toContain("CLS (sum since load): 0.000 | blocked: 0 ms");
    expect(older).toContain("\nlong frames: n/a\n");

    // Hanya frame panjang.
    const only = await reportWith(["long-animation-frame"]);
    expect(only).toContain("CLS (sum since load): n/a | blocked: n/a ms");
    expect(only).toContain("\nlong frames: none over 50 ms\n");
  });

  it("browser tanpa long-animation-frame: baris frame panjang ditulis n/a", async () => {
    render(<TourPerf show3d={false} />);
    await warmUp();
    fireEvent.click(runButton());
    await act(() => vi.advanceTimersByTimeAsync(13000));
    expect(
      (screen.getByRole("textbox", { name: "Report" }) as HTMLTextAreaElement)
        .value,
    ).toContain("\nlong frames: n/a\n");
  });

  it("percobaan tanpa blur: mematikan backdrop-filter di tur, tercatat di laporan, dan dicabut saat panel ditutup", async () => {
    const injected = () =>
      document.head.querySelector<HTMLStyleElement>("style[data-tour-perf]");
    render(<TourPerf show3d />);
    const toggle = screen.getByRole("button", { name: "No blur" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(injected()).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(injected()?.textContent).toMatch(
      /\.tour, \.tour \* \{[^}]*backdrop-filter: none !important/,
    );

    await warmUp();
    fireEvent.click(runButton());
    // Sakelar terkunci selama uji: mengubahnya di tengah jalan mencampur hasil.
    expect(toggle).toBeDisabled();
    await act(() => vi.advanceTimersByTimeAsync(13000));
    expect(
      (screen.getByRole("textbox", { name: "Report" }) as HTMLTextAreaElement)
        .value,
    ).toMatch(
      /^Tour perf report\nmode: 3d\nbackdrop blur: off \(experiment\)\n/,
    );

    // Dimatikan lagi: gaya dicabut.
    fireEvent.click(toggle);
    expect(injected()).toBeNull();
    // Panel ditutup saat percobaan aktif: halaman tidak mewarisinya.
    fireEvent.click(toggle);
    expect(injected()).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(injected()).toBeNull();
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
    await warmUp();
    expect(shape()).toEqual(before);
    fireEvent.click(runButton());
    await act(() => vi.advanceTimersByTimeAsync(13000));
    expect(screen.getByRole("textbox", { name: "Report" })).not.toHaveValue("");
    expect(shape()).toEqual(before);
  });
});

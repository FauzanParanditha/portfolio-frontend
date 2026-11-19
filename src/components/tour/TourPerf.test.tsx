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
    expect(screen.queryByRole("textbox", { name: "Report" })).toBeNull();
  });

  it("uji gulir: menggulir seluruh halaman selama 12 dtk, kembali ke atas, lalu menyajikan laporan", async () => {
    render(<TourPerf show3d />);
    await act(() => vi.advanceTimersByTimeAsync(2000));

    fireEvent.click(screen.getByRole("button", { name: "Run scroll test" }));
    expect(screen.getByRole("status")).toHaveTextContent(/Scrolling the page/);
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

  it("Close menyingkirkan panel", () => {
    render(<TourPerf show3d={false} />);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("complementary")).toBeNull();
  });
});

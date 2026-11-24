import { render, screen, within } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HealthSummary } from "@/components/playground/HealthSummary";
import type { Health, OverallState } from "@/lib/playground/health";

const result = (overall: OverallState = "operational"): Health => ({
  overall,
  checkedAt: new Date(2026, 10, 20, 14, 3, 9).getTime(),
  checks: [
    { name: "healthz", path: "/api/v1/healthz", state: "ok", latencyMs: 12 },
    { name: "readyz", path: "/api/v1/readyz", state: "ok", latencyMs: 31 },
  ],
});

/** Kerangka kartu: jenis dan jumlah elemen, tanpa isinya. */
const shape = (container: HTMLElement) =>
  [...container.querySelectorAll("p, table, tr, th, td")].map(
    (element) => element.tagName,
  );

describe("HealthSummary", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sebelum hasil pertama: tabel dan baris waktu sudah ada, berisi tanda tunggu", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test/api/v1");
    render(<HealthSummary health={null} refreshHint="Hint here." />);

    expect(screen.getByRole("status")).toHaveTextContent("Checking…");
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    // Kepala tabel + satu baris per pemeriksaan.
    expect(rows).toHaveLength(3);
    expect(rows[1]).toHaveTextContent("/api/v1/healthz");
    // Terlihat: "…" saja (lebih sempit dari judul kolom, supaya lebar kolom
    // tidak berubah saat "ok" tiba); pembaca layar mendapat katanya.
    const pending = rows[1].querySelectorAll("td")[0];
    expect(pending.querySelector('[aria-hidden="true"]')).toHaveTextContent(
      "…",
    );
    expect(pending.querySelector(".sr-only")).toHaveTextContent("checking");
    expect(pending.textContent).toBe("…checking");
    expect(rows[1]).toHaveTextContent("not measured");
    expect(rows[2]).toHaveTextContent("/api/v1/readyz");
    expect(screen.getByText("Waiting for an answer.")).toBeInTheDocument();
    expect(screen.getByText("Hint here.")).toBeInTheDocument();
  });

  it("kerangka kartu (jenis dan jumlah elemen) sama sebelum dan sesudah hasil tiba", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "http://api.test/api/v1");
    const view = render(<HealthSummary health={null} />);
    const before = shape(view.container);
    view.rerender(<HealthSummary health={result()} />);
    expect(shape(view.container)).toEqual(before);
    // Dan baris yang sama berisi hasilnya.
    const rows = within(screen.getByRole("table")).getAllByRole("row");
    expect(rows[1]).toHaveTextContent("/api/v1/healthz");
    expect(rows[1]).toHaveTextContent("ok");
    expect(rows[1]).toHaveTextContent("12 ms");
    expect(rows[1]).not.toHaveTextContent("checking");
  });

  it("hasil: status, jam periksa (HH:MM:SS lokal), dan petunjuk penyegaran", () => {
    render(<HealthSummary health={result()} refreshHint="Hint here." />);
    expect(screen.getByRole("status")).toHaveTextContent("Operational");
    expect(screen.getByText("Checked at 14:03:09.")).toBeInTheDocument();
    expect(screen.getByText("Hint here.")).toBeInTheDocument();
    expect(screen.queryByText(/Waiting for an answer/)).toBeNull();
  });

  it("dibatasi (429): tanpa janji penyegaran 10 detik, dengan penjelasannya", () => {
    render(
      <HealthSummary health={result("limited")} refreshHint="Hint here." />,
    );
    expect(screen.getByText("Checked at 14:03:09.")).toBeInTheDocument();
    expect(screen.queryByText(/Hint here/)).toBeNull();
    expect(
      screen.getByText(/asked this browser to slow down/),
    ).toBeInTheDocument();
  });

  it("tidak terjangkau: penjelasan tambahan muncul", () => {
    render(<HealthSummary health={result("unavailable")} />);
    expect(
      screen.getByText(/can\u2019t be reached|can't be reached/),
    ).toBeInTheDocument();
  });

  it("kalimat waktu dan petunjuk penyegaran berada di baris masing-masing, sebelum maupun sesudah hasil", () => {
    // Bila menyambung dalam satu baris teks, jumlah barisnya (jadi tinggi
    // kartu) berubah di lebar tertentu saat kalimat pertama memendek.
    const lines = (container: HTMLElement) =>
      [...container.querySelectorAll("p[data-requires-js] > span")].map(
        (span) => [span.className, span.textContent],
      );
    const view = render(<HealthSummary health={null} refreshHint="Hint." />);
    expect(lines(view.container)).toEqual([
      ["block", "Waiting for an answer."],
      ["block", "Hint."],
    ]);
    view.rerender(<HealthSummary health={result()} refreshHint="Hint." />);
    expect(lines(view.container)).toEqual([
      ["block", "Checked at 14:03:09."],
      ["block", "Hint."],
    ]);
  });

  it("tanpa JavaScript tidak ada jawaban: tabel tunggu dan janji penyegaran ditandai butuh JS", () => {
    const view = render(<HealthSummary health={null} />);
    expect(screen.getByRole("table")).toHaveAttribute("data-requires-js");
    expect(
      screen.getByText("Waiting for an answer.").closest("p"),
    ).toHaveAttribute("data-requires-js");
    // Pil statusnya tetap tampil.
    expect(screen.getByRole("status")).not.toHaveAttribute("data-requires-js");
    expect(view.container.querySelectorAll("[data-requires-js]")).toHaveLength(
      2,
    );
  });

  it("tidak memformat waktu lewat Intl/toLocale…: panggilan pertamanya memblokir utas utama", () => {
    const source = readFileSync(
      resolve(__dirname, "HealthSummary.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/toLocale|Intl\./);
    expect(source).toContain("formatClock(health.checkedAt)");
  });
});

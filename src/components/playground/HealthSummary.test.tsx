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
    expect(rows[1]).toHaveTextContent("checking…");
    expect(rows[1]).toHaveTextContent("not measured");
    expect(rows[2]).toHaveTextContent("/api/v1/readyz");
    expect(
      screen.getByText("Waiting for the first answer. Hint here."),
    ).toBeInTheDocument();
  });

  it("kerangka kartu sama sebelum dan sesudah hasil tiba, supaya tingginya tidak berubah", () => {
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
    expect(rows[1]).not.toHaveTextContent("checking…");
  });

  it("hasil: status, jam periksa (HH:MM:SS lokal), dan petunjuk penyegaran", () => {
    render(<HealthSummary health={result()} refreshHint="Hint here." />);
    expect(screen.getByRole("status")).toHaveTextContent("Operational");
    expect(
      screen.getByText("Checked at 14:03:09. Hint here."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Waiting for the first answer/)).toBeNull();
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

  it("tidak memformat waktu lewat Intl/toLocale…: panggilan pertamanya memblokir utas utama", () => {
    const source = readFileSync(
      resolve(__dirname, "HealthSummary.tsx"),
      "utf8",
    );
    expect(source).not.toMatch(/toLocale|Intl\./);
    expect(source).toContain("formatClock(health.checkedAt)");
  });
});

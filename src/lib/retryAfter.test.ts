import { AxiosError, AxiosHeaders } from "axios";

import {
  getRetryAfterSeconds,
  MAX_RETRY_AFTER_SECONDS,
} from "@/lib/retryAfter";

function errorWithHeaders(headers: Record<string, string>): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(
    "Too Many Requests",
    "ERR_BAD_REQUEST",
    config,
    {},
    {
      status: 429,
      statusText: "Too Many Requests",
      headers,
      config,
      data: {},
    },
  );
}

describe("getRetryAfterSeconds", () => {
  it("membaca nilai detik", () => {
    expect(
      getRetryAfterSeconds(errorWithHeaders({ "retry-after": "42" })),
    ).toBe(42);
  });

  it("membaca tanggal HTTP relatif terhadap `now`", () => {
    const now = Date.parse("2026-11-16T10:00:00Z");
    expect(
      getRetryAfterSeconds(
        errorWithHeaders({ "retry-after": "Mon, 16 Nov 2026 10:00:30 GMT" }),
        now,
      ),
    ).toBe(30);
  });

  it.each([
    ["header tidak ada", {}],
    ["kosong", { "retry-after": "" }],
    ["nol", { "retry-after": "0" }],
    ["tidak valid", { "retry-after": "nanti" }],
    [
      "tanggal yang sudah lewat",
      { "retry-after": "Mon, 01 Jan 2001 00:00:00 GMT" },
    ],
  ])("null bila %s", (_label, headers) => {
    expect(getRetryAfterSeconds(errorWithHeaders(headers))).toBeNull();
  });

  it.each([
    ["angka sangat panjang (Infinity)", { "retry-after": "9".repeat(400) }],
    ["di atas integer aman", { "retry-after": "9007199254740993" }],
    ["di atas batas satu jam", { "retry-after": "3601" }],
    ["desimal", { "retry-after": "1.5" }],
    ["negatif", { "retry-after": "-5" }],
  ])("null bila nilai detik ekstrem/tidak valid: %s", (_label, headers) => {
    expect(getRetryAfterSeconds(errorWithHeaders(headers))).toBeNull();
  });

  it("menerima tepat batas atas", () => {
    expect(
      getRetryAfterSeconds(
        errorWithHeaders({ "retry-after": String(MAX_RETRY_AFTER_SECONDS) }),
      ),
    ).toBe(3600);
  });

  it("null bila tanggal HTTP lebih dari satu jam ke depan", () => {
    const now = Date.parse("2026-11-16T10:00:00Z");
    expect(
      getRetryAfterSeconds(
        errorWithHeaders({ "retry-after": "Mon, 16 Nov 2026 11:00:01 GMT" }),
        now,
      ),
    ).toBeNull();
  });

  it("membaca header lewat AxiosHeaders#get (tidak peka huruf besar/kecil)", () => {
    const config = { headers: new AxiosHeaders() };
    const error = new AxiosError(
      "Too Many Requests",
      "ERR_BAD_REQUEST",
      config,
      {},
      {
        status: 429,
        statusText: "Too Many Requests",
        headers: new AxiosHeaders({ "Retry-After": "12" }),
        config,
        data: {},
      },
    );
    expect(getRetryAfterSeconds(error)).toBe(12);
  });

  it("null untuk error yang bukan AxiosError", () => {
    expect(getRetryAfterSeconds(new Error("x"))).toBeNull();
  });
});

import { AxiosError, AxiosHeaders } from "axios";

import { getRetryAfterSeconds } from "@/lib/retryAfter";

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

  it("null untuk error yang bukan AxiosError", () => {
    expect(getRetryAfterSeconds(new Error("x"))).toBeNull();
  });
});

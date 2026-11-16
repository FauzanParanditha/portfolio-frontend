import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

import { formatErrorDetails, handleAxiosError } from "@/lib/handleAxiosError";
import { projectFieldLabel } from "@/lib/mapper/project";

function axiosErrorWith(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(
    "Request failed",
    "ERR_BAD_REQUEST",
    config,
    {},
    {
      status,
      statusText: "",
      headers: {},
      config,
      data,
    },
  );
}

describe("formatErrorDetails", () => {
  it("satu baris per field, kunci apa adanya tanpa pemeta", () => {
    expect(formatErrorDetails({ DemoURL: "x", Title: "y" })).toBe(
      "DemoURL: x\nTitle: y",
    );
  });

  it("memakai pemeta label bila diberikan", () => {
    expect(
      formatErrorDetails(
        { DemoURL: "harus http(s)", "Screenshots[1]": "tidak valid" },
        projectFieldLabel,
      ),
    ).toBe("Live URL: harus http(s)\nScreenshots URLs (line 2): tidak valid");
  });
});

describe("handleAxiosError", () => {
  afterEach(() => {
    mockToast.mockReset();
  });

  it("422: judul validasi dan detail per field berlabel", () => {
    handleAxiosError(
      axiosErrorWith(422, {
        error: {
          message: "validasi gagal",
          code: "VALIDATION_ERROR",
          details: { DemoURL: "harus berupa URL http:// atau https://" },
        },
        requestId: "rid-1",
      }),
      { fieldLabel: projectFieldLabel },
    );

    expect(mockToast).toHaveBeenCalledTimes(1);
    const arg = mockToast.mock.calls[0][0] as {
      title: string;
      description: string;
    };
    expect(arg.title).toBe("Validation Error");
    expect(arg.description).toContain("validasi gagal");
    expect(arg.description).toContain(
      "Live URL: harus berupa URL http:// atau https://",
    );
    expect(arg.description).toContain("rid: rid-1");
  });

  it("details null dari backend tidak dirender sebagai detail", () => {
    handleAxiosError(
      axiosErrorWith(404, {
        error: { message: "tidak ditemukan", details: null },
      }),
    );
    const arg = mockToast.mock.calls[0][0] as { description: string };
    expect(arg.description).toBe("tidak ditemukan");
  });
});

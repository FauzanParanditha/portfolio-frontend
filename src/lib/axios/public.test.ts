import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

import publicClient from "@/lib/axios/public";

// Adapter palsu: setiap request langsung gagal dengan status tertentu, jadi
// interceptor respons berjalan apa adanya tanpa jaringan.
function failWith(status: number, data: unknown = {}) {
  return (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError(
        "fail",
        "ERR_BAD_RESPONSE",
        config,
        {},
        {
          status,
          statusText: "",
          headers: {},
          config,
          data,
        },
      ),
    );
}

describe("interceptor publicClient", () => {
  afterEach(() => {
    mockToast.mockReset();
  });

  it("429: tidak memunculkan toast (ditangani pemanggil) tapi tetap reject", async () => {
    await expect(
      publicClient.post("/contact-messages", {}, { adapter: failWith(429) }),
    ).rejects.toMatchObject({ response: { status: 429 } });
    expect(mockToast).not.toHaveBeenCalled();
  });

  it("membaca pesan dari envelope backend { error: { message } }", async () => {
    await expect(
      publicClient.get("/projects/x", {
        adapter: failWith(404, {
          error: { message: "proyek tidak ditemukan", code: "NOT_FOUND" },
          requestId: "rid-1",
        }),
      }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "proyek tidak ditemukan" }),
    );
  });

  it("masih menerima `message` di tingkat atas sebagai cadangan", async () => {
    await expect(
      publicClient.get("/projects", {
        adapter: failWith(400, { message: "pesan lama" }),
      }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "pesan lama" }),
    );
  });

  it("tanpa pesan dari backend: memakai teks bawaan per status", async () => {
    await expect(
      publicClient.get("/projects", { adapter: failWith(404) }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Data tidak ditemukan" }),
    );
  });

  it("500: tetap memunculkan toast generik", async () => {
    await expect(
      publicClient.get("/projects", { adapter: failWith(500) }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(mockToast).toHaveBeenCalledTimes(1);
  });
});

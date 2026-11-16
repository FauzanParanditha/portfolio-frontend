import { AxiosError, type InternalAxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

import adminClient from "@/lib/axios/admin";

// Adapter palsu: request langsung gagal dengan status & body tertentu, jadi
// interceptor respons berjalan apa adanya tanpa jaringan. Status selain 401
// dipakai agar jalur refresh sesi tidak tersentuh.
function failWith(status: number, data: unknown = {}) {
  return (config: InternalAxiosRequestConfig) =>
    Promise.reject(
      new AxiosError(
        "fail",
        "ERR_BAD_RESPONSE",
        config,
        {},
        { status, statusText: "", headers: {}, config, data },
      ),
    );
}

describe("interceptor adminClient", () => {
  afterEach(() => {
    mockToast.mockReset();
  });

  it("membaca pesan dari envelope backend { error: { message } }", async () => {
    await expect(
      adminClient.get("/admin/projects", {
        adapter: failWith(403, {
          error: { message: "akses ditolak", code: "FORBIDDEN" },
          requestId: "rid-1",
        }),
      }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(mockToast).toHaveBeenCalledTimes(1);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Error 403",
        description: "akses ditolak",
      }),
    );
  });

  it("masih menerima `message` di tingkat atas sebagai cadangan", async () => {
    await expect(
      adminClient.get("/admin/projects", {
        adapter: failWith(409, { message: "pesan lama" }),
      }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "pesan lama" }),
    );
  });

  it("tanpa pesan dari backend: 'Server Error'", async () => {
    await expect(
      adminClient.get("/admin/projects", { adapter: failWith(500) }),
    ).rejects.toBeInstanceOf(AxiosError);
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ description: "Server Error" }),
    );
  });
});

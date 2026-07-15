import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminContactMessages } from "@/hooks/use-admin-contact-messages";
import type { ContactMessage } from "@/types/contact";
import type { ApiListResponse } from "@/types/experience";

// Mock adminClient (default export) — kita tidak menyentuh jaringan/axios asli.
// get/patch/delete diganti spy agar bisa memverifikasi URL & payload.
vi.mock("@/lib/axios/admin", () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

// Impor SETELAH vi.mock agar yang didapat adalah versi mock.
import adminClient from "@/lib/axios/admin";

const mockedGet = vi.mocked(adminClient.get);
const mockedPatch = vi.mocked(adminClient.patch);
const mockedDelete = vi.mocked(adminClient.delete);

// Contoh pesan untuk payload sukses.
const sampleMessages: ContactMessage[] = [
  {
    id: "msg-1",
    name: "Budi",
    email: "budi@example.com",
    subject: "Halo",
    message: "Isi pesan",
    isRead: false,
    createdAt: "2026-07-01T10:00:00Z",
  },
];

const sampleResponse: ApiListResponse<ContactMessage> = {
  data: sampleMessages,
  meta: {
    hasMore: false,
    limit: 10,
    page: 1,
    q: "",
    total: 1,
    totalPages: 1,
  },
};

// Bungkus hook dengan SWRConfig ber-cache Map baru + dedupingInterval:0
// supaya tiap test deterministik (tak ada cache/dedup lintas render).
function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useAdminContactMessages", () => {
  beforeEach(() => {
    // Default: GET selalu balas payload sukses (axios membungkus dalam { data }).
    mockedGet.mockResolvedValue({ data: sampleResponse });
    mockedPatch.mockResolvedValue({ data: {} });
    mockedDelete.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("penyusunan URL query", () => {
    it("memakai URL dasar tanpa query saat tanpa parameter", async () => {
      renderHook(() => useAdminContactMessages(), { wrapper });

      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
      expect(mockedGet).toHaveBeenCalledWith("/admin/contact-messages");
    });

    it("menyusun page, limit, dan q ke query string", async () => {
      renderHook(
        () => useAdminContactMessages({ page: 2, limit: 20, q: "budi" }),
        { wrapper },
      );

      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
      expect(mockedGet).toHaveBeenCalledWith(
        "/admin/contact-messages?page=2&limit=20&q=budi",
      );
    });

    it("menyertakan isRead=true saat filter dibaca", async () => {
      renderHook(() => useAdminContactMessages({ isRead: true }), { wrapper });

      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
      expect(mockedGet).toHaveBeenCalledWith(
        "/admin/contact-messages?isRead=true",
      );
    });

    it("menyertakan isRead=false saat filter belum dibaca", async () => {
      renderHook(() => useAdminContactMessages({ isRead: false }), { wrapper });

      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
      expect(mockedGet).toHaveBeenCalledWith(
        "/admin/contact-messages?isRead=false",
      );
    });

    it("melewati nilai kosong (page=0, q kosong) dari query string", async () => {
      renderHook(() => useAdminContactMessages({ page: 0, q: "" }), {
        wrapper,
      });

      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
      // page=0 falsy dan q kosong falsy → keduanya dilewati.
      expect(mockedGet).toHaveBeenCalledWith("/admin/contact-messages");
    });
  });

  describe("pemetaan data", () => {
    it("memetakan messages dari data.data dan meta dari data.meta", async () => {
      const { result } = renderHook(() => useAdminContactMessages(), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.messages).toEqual(sampleMessages);
      expect(result.current.meta).toEqual(sampleResponse.meta);
      expect(result.current.error).toBeUndefined();
    });

    it("mengembalikan array kosong saat data belum ada", () => {
      // Belum resolve → messages default [] dan meta undefined.
      const { result } = renderHook(() => useAdminContactMessages(), {
        wrapper,
      });

      expect(result.current.messages).toEqual([]);
      expect(result.current.meta).toBeUndefined();
    });
  });

  describe("markRead", () => {
    it("memanggil PATCH endpoint /read dengan body { isRead: true } lalu revalidate", async () => {
      const { result } = renderHook(() => useAdminContactMessages(), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      mockedGet.mockClear(); // fokus ke revalidate setelah markRead

      await result.current.markRead("msg-1");

      expect(mockedPatch).toHaveBeenCalledWith(
        "/admin/contact-messages/msg-1/read",
        { isRead: true },
      );
      // Revalidasi memanggil GET ulang.
      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    });

    it("meneruskan isRead=false saat diminta menandai belum dibaca", async () => {
      const { result } = renderHook(() => useAdminContactMessages(), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await result.current.markRead("msg-1", false);

      expect(mockedPatch).toHaveBeenCalledWith(
        "/admin/contact-messages/msg-1/read",
        { isRead: false },
      );
    });
  });

  describe("deleteOne", () => {
    it("memanggil DELETE endpoint dengan id lalu revalidate", async () => {
      const { result } = renderHook(() => useAdminContactMessages(), {
        wrapper,
      });

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      mockedGet.mockClear();

      await result.current.deleteOne("msg-1");

      expect(mockedDelete).toHaveBeenCalledWith("/admin/contact-messages/msg-1");
      await waitFor(() => expect(mockedGet).toHaveBeenCalled());
    });
  });

  describe("error", () => {
    it("mengekspos error saat GET gagal dan messages tetap array kosong", async () => {
      mockedGet.mockRejectedValue(new Error("boom"));

      const { result } = renderHook(() => useAdminContactMessages(), {
        wrapper,
      });

      await waitFor(() => expect(result.current.error).toBeDefined());
      expect(result.current.messages).toEqual([]);
    });
  });
});

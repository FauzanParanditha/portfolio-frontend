import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { SWRConfig } from "swr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useAdminTags } from "@/hooks/use-admin-tags";
import type { ApiListResponse, ExperienceTag } from "@/types/experience";

// Mock adminClient (default export) — tidak menyentuh jaringan/axios asli.
vi.mock("@/lib/axios/admin", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

// Impor SETELAH vi.mock agar yang didapat adalah versi mock.
import adminClient from "@/lib/axios/admin";

const mockedGet = vi.mocked(adminClient.get);
const mockedPost = vi.mocked(adminClient.post);
const mockedPut = vi.mocked(adminClient.put);
const mockedDelete = vi.mocked(adminClient.delete);

const sampleTags: ExperienceTag[] = [
  { id: "tag-1", name: "Go", type: "BACKEND" },
  { id: "tag-2", name: "React", type: "FRONTEND" },
];

const sampleResponse: ApiListResponse<ExperienceTag> = {
  data: sampleTags,
  meta: {
    hasMore: false,
    limit: 20,
    page: 1,
    q: "",
    total: 2,
    totalPages: 1,
  },
};

function wrapper({ children }: { children: ReactNode }) {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
}

describe("useAdminTags", () => {
  beforeEach(() => {
    mockedGet.mockResolvedValue({ data: sampleResponse });
    mockedPost.mockResolvedValue({ data: { data: sampleTags[0] } });
    mockedPut.mockResolvedValue({ data: { data: sampleTags[0] } });
    mockedDelete.mockResolvedValue({ data: {} });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("memuat daftar tag dan memakai URL dasar tanpa query", async () => {
    const { result } = renderHook(() => useAdminTags(), { wrapper });

    await waitFor(() => expect(result.current.tags).toHaveLength(2));
    expect(mockedGet).toHaveBeenCalledWith("/admin/tags");
    expect(result.current.meta?.total).toBe(2);
  });

  it("menyusun query dari parameter page/limit/q", async () => {
    const { result } = renderHook(
      () => useAdminTags({ page: 2, limit: 50, q: "go" }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedGet).toHaveBeenCalledWith("/admin/tags?page=2&limit=50&q=go");
  });

  it("createOne mengirim POST ke /admin/tags lalu memuat ulang daftar", async () => {
    const { result } = renderHook(() => useAdminTags(), { wrapper });
    await waitFor(() => expect(result.current.tags).toHaveLength(2));

    const getCallsSebelum = mockedGet.mock.calls.length;
    await result.current.createOne({ name: "Fiber", type: "BACKEND" });

    expect(mockedPost).toHaveBeenCalledWith("/admin/tags", {
      name: "Fiber",
      type: "BACKEND",
    });
    // mutate() memicu revalidasi supaya daftar di layar ikut terbarui.
    await waitFor(() =>
      expect(mockedGet.mock.calls.length).toBeGreaterThan(getCallsSebelum),
    );
  });

  it("updateOne mengirim PUT ke /admin/tags/:id", async () => {
    const { result } = renderHook(() => useAdminTags(), { wrapper });
    await waitFor(() => expect(result.current.tags).toHaveLength(2));

    await result.current.updateOne("tag-1", {
      name: "Golang",
      type: "BACKEND",
    });

    expect(mockedPut).toHaveBeenCalledWith("/admin/tags/tag-1", {
      name: "Golang",
      type: "BACKEND",
    });
  });

  it("deleteOne mengirim DELETE ke /admin/tags/:id", async () => {
    const { result } = renderHook(() => useAdminTags(), { wrapper });
    await waitFor(() => expect(result.current.tags).toHaveLength(2));

    await result.current.deleteOne("tag-2");

    expect(mockedDelete).toHaveBeenCalledWith("/admin/tags/tag-2");
  });

  it("meneruskan error agar pemanggil bisa menampilkannya", async () => {
    const boom = new Error("gagal");
    mockedPost.mockRejectedValueOnce(boom);

    const { result } = renderHook(() => useAdminTags(), { wrapper });
    await waitFor(() => expect(result.current.tags).toHaveLength(2));

    await expect(
      result.current.createOne({ name: "X", type: "Y" }),
    ).rejects.toThrow("gagal");
  });
});

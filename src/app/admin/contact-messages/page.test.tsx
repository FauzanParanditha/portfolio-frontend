import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ContactMessage } from "@/types/contact";

// Mock hook data agar komponen dirender tanpa jaringan/SWR.
const mockUseAdminContactMessages = vi.fn();
vi.mock("@/hooks/use-admin-contact-messages", () => ({
  useAdminContactMessages: () => mockUseAdminContactMessages(),
}));

// Toast tidak relevan untuk smoke test — cukup no-op.
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import AdminContactMessages from "@/app/admin/contact-messages/page";

// Nilai balik hook default (bisa di-override tiap test).
function hookReturn(overrides: Record<string, unknown> = {}) {
  return {
    messages: [],
    meta: undefined,
    isLoading: false,
    error: undefined,
    markRead: vi.fn(),
    deleteOne: vi.fn(),
    refresh: vi.fn(),
    ...overrides,
  };
}

const unreadMessage: ContactMessage = {
  id: "msg-1",
  name: "Budi Santoso",
  email: "budi@example.com",
  subject: "Pertanyaan proyek",
  message: "Halo, saya tertarik bekerja sama.",
  isRead: false,
  createdAt: "2026-07-01T10:00:00Z",
};

describe("Halaman AdminContactMessages", () => {
  beforeEach(() => {
    mockUseAdminContactMessages.mockReturnValue(hookReturn());
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("merender judul dan kontrol filter", () => {
    render(<AdminContactMessages />);

    expect(
      screen.getByRole("heading", { name: "Pesan" }),
    ).toBeInTheDocument();
    // Tab filter status tersedia.
    expect(
      screen.getByRole("button", { name: "Belum dibaca" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sudah dibaca" }),
    ).toBeInTheDocument();
  });

  it("menampilkan empty state saat tidak ada pesan", () => {
    render(<AdminContactMessages />);

    expect(screen.getByText("Belum ada pesan")).toBeInTheDocument();
  });

  it("menampilkan skeleton loading (tanpa empty state) saat memuat", () => {
    mockUseAdminContactMessages.mockReturnValue(
      hookReturn({ isLoading: true }),
    );
    render(<AdminContactMessages />);

    expect(screen.queryByText("Belum ada pesan")).not.toBeInTheDocument();
  });

  it("menampilkan pesan error saat gagal memuat", () => {
    mockUseAdminContactMessages.mockReturnValue(
      hookReturn({ error: new Error("boom") }),
    );
    render(<AdminContactMessages />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Gagal memuat pesan",
    );
  });

  it("merender daftar pesan dengan badge 'Belum dibaca' dan tombol aksi", () => {
    mockUseAdminContactMessages.mockReturnValue(
      hookReturn({
        messages: [unreadMessage],
        meta: { total: 1, totalPages: 1 },
      }),
    );
    render(<AdminContactMessages />);

    // Detail pesan tampil.
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("Pertanyaan proyek")).toBeInTheDocument();
    // Badge status "Belum dibaca" muncul untuk pesan yang belum dibaca.
    // Teks "Belum dibaca" juga dipakai tab filter (button), jadi kita pastikan
    // ada yang berupa badge (span), bukan hanya tombol filter.
    const belumDibaca = screen.getAllByText("Belum dibaca");
    expect(belumDibaca.some((el) => el.tagName === "SPAN")).toBe(true);
    // Tombol aksi (tandai dibaca & hapus) tersedia via aria-label.
    expect(
      screen.getByRole("button", {
        name: "Tandai pesan dari Budi Santoso sebagai dibaca",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Hapus pesan dari Budi Santoso" }),
    ).toBeInTheDocument();
  });
});

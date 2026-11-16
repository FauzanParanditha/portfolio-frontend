import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AxiosError, AxiosHeaders } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

// Mock publicClient (default export) — tidak menyentuh jaringan.
vi.mock("@/lib/axios/public", () => ({
  default: { post: vi.fn() },
}));

import { ContactSection } from "@/components/ContactSection";
import publicClient from "@/lib/axios/public";

const mockedPost = vi.mocked(publicClient.post);

function rateLimitError(headers: Record<string, string> = {}): AxiosError {
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
      data: {
        error: {
          message: "too many messages, please try again later",
          code: "TOO_MANY_REQUESTS",
          details: null,
        },
      },
    },
  );
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Name"), "Budi");
  await user.type(screen.getByLabelText("Email"), "budi@example.com");
  await user.type(screen.getByLabelText("Subject"), "Halo");
  await user.type(screen.getByLabelText("Message"), "Pesan uji");
  await user.click(screen.getByRole("button", { name: /submit/i }));
}

describe("ContactSection", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("429 tanpa Retry-After: SATU toast 'Too many messages' dengan fallback satu menit", async () => {
    mockedPost.mockRejectedValueOnce(rateLimitError());
    render(<ContactSection />);

    await fillAndSubmit();

    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Too many messages.",
        description: "Please try again in a minute.",
      }),
    );
    // Tombol kembali aktif setelah gagal.
    expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();
  });

  it("429 dengan Retry-After: menyebut jumlah detik", async () => {
    mockedPost.mockRejectedValueOnce(rateLimitError({ "retry-after": "37" }));
    render(<ContactSection />);

    await fillAndSubmit();

    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Too many messages.",
        description: "Please try again in 37 seconds.",
      }),
    );
  });

  it("error lain tetap memakai pesan gagal generik", async () => {
    mockedPost.mockRejectedValueOnce(new Error("network"));
    render(<ContactSection />);

    await fillAndSubmit();

    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Transmission Failed." }),
    );
  });
});

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

import {
  CONTACT_MAX_LENGTH,
  ContactSection,
  contactFieldLabel,
} from "@/components/ContactSection";
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

function validationError(data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(
    "Unprocessable Entity",
    "ERR_BAD_REQUEST",
    config,
    {},
    {
      status: 422,
      statusText: "Unprocessable Entity",
      headers: {},
      config,
      data,
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

  it("input memakai maxLength sesuai batas backend", () => {
    render(<ContactSection />);

    expect(screen.getByLabelText("Name")).toHaveAttribute("maxLength", "100");
    expect(screen.getByLabelText("Email")).toHaveAttribute("maxLength", "200");
    expect(screen.getByLabelText("Subject")).toHaveAttribute(
      "maxLength",
      "200",
    );
    expect(screen.getByLabelText("Message")).toHaveAttribute(
      "maxLength",
      "5000",
    );
    expect(CONTACT_MAX_LENGTH).toEqual({
      name: 100,
      email: 200,
      subject: 200,
      message: 5000,
    });
  });

  it("textarea message tidak bisa diisi melebihi 5000 karakter", async () => {
    const user = userEvent.setup();
    render(<ContactSection />);
    const message = screen.getByLabelText("Message") as HTMLTextAreaElement;

    message.focus();
    await user.paste("a".repeat(5100));

    expect(message.value).toHaveLength(5000);
  });

  it("penghitung karakter message terhubung lewat aria-describedby dan ikut berubah", async () => {
    const user = userEvent.setup();
    render(<ContactSection />);
    const message = screen.getByLabelText("Message");

    expect(message).toHaveAccessibleDescription("0 / 5000 characters");

    await user.type(message, "Halo");
    expect(message).toHaveAccessibleDescription("4 / 5000 characters");
  });

  it("sukses: penghitung kembali ke 0 setelah form direset", async () => {
    mockedPost.mockResolvedValueOnce({ data: {} });
    render(<ContactSection />);

    await fillAndSubmit();

    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({ variant: "success" }),
      ),
    );
    expect(screen.getByLabelText("Message")).toHaveAccessibleDescription(
      "0 / 5000 characters",
    );
  });

  it("422 dengan details: SATU toast berisi detail per field berlabel", async () => {
    mockedPost.mockRejectedValueOnce(
      validationError({
        error: {
          message: "validasi gagal",
          code: "UNPROCESSABLE_ENTITY",
          details: {
            Name: "maksimal 100 karakter",
            Email: "format email tidak valid",
            Message: "maksimal 5000 karakter",
          },
        },
        requestId: "rid-1",
      }),
    );
    render(<ContactSection />);

    await fillAndSubmit();

    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith({
      title: "Please check your input.",
      description:
        "Name: maksimal 100 karakter\n" +
        "Email: format email tidak valid\n" +
        "Message: maksimal 5000 karakter",
      variant: "warning",
    });
    expect(screen.getByRole("button", { name: /submit/i })).toBeEnabled();
  });

  it("422 tanpa details: memakai pesan envelope backend", async () => {
    mockedPost.mockRejectedValueOnce(
      validationError({
        error: { message: "body tidak valid", code: "UNPROCESSABLE_ENTITY" },
      }),
    );
    render(<ContactSection />);

    await fillAndSubmit();

    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Please check your input.",
        description: "body tidak valid",
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

describe("contactFieldLabel", () => {
  it.each([
    ["Name", "Name"],
    ["Email", "Email"],
    ["Subject", "Subject"],
    ["Message", "Message"],
    ["message", "Message"],
  ])("%s → %s", (key, label) => {
    expect(contactFieldLabel(key)).toBe(label);
  });

  it.each(["constructor", "__proto__", "toString", "Unknown"])(
    "kunci tak dikenal/prototype %s dikembalikan apa adanya",
    (key) => {
      expect(contactFieldLabel(key)).toBe(key);
    },
  );
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/ui/button";

describe("Button", () => {
  it("merender teks anak sebagai elemen <button>", () => {
    render(<Button>Simpan</Button>);

    const btn = screen.getByRole("button", { name: "Simpan" });
    expect(btn).toBeInTheDocument();
    expect(btn.tagName).toBe("BUTTON");
  });

  it("meneruskan atribut disabled ke elemen", () => {
    render(<Button disabled>Kirim</Button>);

    expect(screen.getByRole("button", { name: "Kirim" })).toBeDisabled();
  });

  it("memanggil onClick saat diklik", async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Klik</Button>);

    await user.click(screen.getByRole("button", { name: "Klik" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("merender sebagai anak (asChild) — mis. <a> lewat Slot", () => {
    render(
      <Button asChild>
        <a href="/admin">Ke Admin</a>
      </Button>,
    );

    const link = screen.getByRole("link", { name: "Ke Admin" });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/admin");
  });
});

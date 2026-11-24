import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Footer } from "@/components/Footer";
import { CONTACT_CHANNELS } from "@/content/profile";

describe("Footer", () => {
  it("surel dan lokasi berasal dari sumber yang sama dengan kartu kontak", () => {
    render(<Footer />);
    const email = CONTACT_CHANNELS.find((channel) => channel.title === "Email");
    const location = CONTACT_CHANNELS.find(
      (channel) => channel.title === "Location",
    );
    expect(screen.getByRole("link", { name: /email/i })).toHaveAttribute(
      "href",
      email?.href,
    );
    expect(
      screen.getByText(String(location?.value).toUpperCase()),
    ).toBeInTheDocument();
  });
});

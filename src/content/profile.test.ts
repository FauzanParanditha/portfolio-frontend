import { describe, expect, it } from "vitest";

import { CONTACT_CHANNELS, contactChannels } from "./profile";

describe("contactChannels", () => {
  it("surel dan lokasi dari env; WhatsApp hanya bila nomornya ada", () => {
    expect(
      contactChannels({
        email: "me@example.com",
        phone: "+62 812-3456-7890",
        location: "Bandung, ID",
      }),
    ).toEqual([
      {
        title: "Email",
        value: "me@example.com",
        href: "mailto:me@example.com",
      },
      {
        title: "WhatsApp",
        value: "+62 812-3456-7890",
        // wa.me hanya menerima angka.
        href: "https://wa.me/6281234567890",
      },
      { title: "Location", value: "Bandung, ID" },
    ]);
  });

  it("tanpa env: bawaan surel dan lokasi, tanpa WhatsApp", () => {
    expect(contactChannels({})).toEqual([
      {
        title: "Email",
        value: "paranditha@gmail.com",
        href: "mailto:paranditha@gmail.com",
      },
      { title: "Location", value: "Tangerang Selatan, ID" },
    ]);
  });

  it("nilai kosong atau hanya spasi (`KUNCI=` di .env) diperlakukan sebagai tidak diisi", () => {
    const channels = contactChannels({ email: "", phone: "  ", location: " " });
    expect(channels.map((channel) => channel.title)).toEqual([
      "Email",
      "Location",
    ]);
    expect(channels[0].href).toBe("mailto:paranditha@gmail.com");
    expect(channels[1].value).toBe("Tangerang Selatan, ID");
  });

  it("nomor tanpa satu angka pun tidak menghasilkan tautan wa.me kosong", () => {
    expect(
      contactChannels({ phone: "n/a" }).some(
        (channel) => channel.title === "WhatsApp",
      ),
    ).toBe(false);
  });

  it("spasi di tepi nilai dibuang dari teks maupun tautan", () => {
    const [email] = contactChannels({ email: "  me@example.com " });
    expect(email).toEqual({
      title: "Email",
      value: "me@example.com",
      href: "mailto:me@example.com",
    });
  });

  it("kanal situs ini selalu punya surel yang bisa diklik", () => {
    expect(CONTACT_CHANNELS[0].href).toMatch(/^mailto:.+@.+/);
  });
});

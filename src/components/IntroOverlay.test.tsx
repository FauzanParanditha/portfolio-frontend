import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { IntroOverlay } from "@/components/IntroOverlay";
import { INTRO_ATTRIBUTE } from "@/lib/intro";

const seen = () => document.documentElement.getAttribute(INTRO_ATTRIBUTE);
const end = (target: Element) =>
  // jsdom tidak punya AnimationEvent; `animationend` biasa yang menggelembung
  // sudah cukup untuk pendengarnya.
  target.dispatchEvent(new Event("animationend", { bubbles: true }));

describe("IntroOverlay", () => {
  afterEach(() => {
    document.documentElement.removeAttribute(INTRO_ATTRIBUTE);
    vi.restoreAllMocks();
  });

  it("lapisan dekoratif: tersembunyi dari pembaca layar", () => {
    const { container } = render(<IntroOverlay />);
    expect(container.querySelector(".intro-overlay")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("selama diputar belum ditandai; ditandai begitu animasi LAPISANNYA selesai", () => {
    const { container } = render(<IntroOverlay />);
    const overlay = container.querySelector(".intro-overlay") as HTMLElement;
    expect(seen()).toBeNull();

    // Animasi tiap huruf selesai lebih dulu dan menggelembung ke lapisan:
    // itu belum akhir intro.
    end(container.querySelector(".intro-overlay__letter") as HTMLElement);
    expect(seen()).toBeNull();

    end(overlay);
    expect(seen()).toBe("seen");
  });

  it("hidrasi datang setelah intro selesai (JS lambat): langsung ditandai, tanpa menunggu event yang sudah lewat", () => {
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, "getComputedStyle").mockImplementation((element) => {
      const style = real(element);
      return (element as Element).classList?.contains("intro-overlay")
        ? ({
            ...style,
            display: "flex",
            visibility: "hidden",
          } as CSSStyleDeclaration)
        : style;
    });
    render(<IntroOverlay />);
    expect(seen()).toBe("seen");
  });

  it("dilepas sebelum selesai (pindah halaman di tengah intro): tidak ditandai, pendengarnya dicabut", () => {
    const { container, unmount } = render(<IntroOverlay />);
    const overlay = container.querySelector(".intro-overlay") as HTMLElement;
    unmount();
    end(overlay);
    expect(seen()).toBeNull();
  });
});

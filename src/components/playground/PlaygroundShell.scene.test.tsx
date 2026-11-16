import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PlaygroundCanvasProps } from "@/components/playground/scene/PlaygroundCanvas";
import type { PlaygroundProject } from "@/lib/playground/layout";

/**
 * Jalur "scene aktif": kanvas 3D diganti tiruan yang merekam props-nya, supaya
 * kontrak shell ↔ scene (perintah jalan, tiba → panel, jeda, tombol Inspect)
 * teruji tanpa WebGL.
 */
const scene = vi.hoisted(() => ({
  props: null as PlaygroundCanvasProps | null,
  commands: [] as Array<{ slot: number; nonce: number }>,
}));

vi.mock("next/dynamic", () => ({
  default: () =>
    function SceneStub(props: PlaygroundCanvasProps) {
      scene.props = props;
      const { command, onReady } = props;
      useEffect(() => {
        onReady();
      }, [onReady]);
      useEffect(() => {
        if (command) scene.commands.push(command);
      }, [command]);
      return <div data-testid="scene" />;
    },
}));

vi.mock("next/image", () => ({
  default: ({ alt }: { alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} />
  ),
}));

import { PlaygroundShell } from "@/components/playground/PlaygroundShell";

function project(n: number): PlaygroundProject {
  return {
    id: `id-${n}`,
    title: `Project ${n}`,
    slug: `project-${n}`,
    shortDesc: `Description ${n}`,
    tags: [],
  };
}

describe("PlaygroundShell (scene aktif)", () => {
  beforeEach(() => {
    scene.props = null;
    scene.commands = [];
    // Pura-pura WebGL tersedia.
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      getExtension: () => null,
    } as never);
  });
  afterEach(() => vi.restoreAllMocks());

  it("memilih rak mengirim perintah jalan; panel baru terbuka saat robot tiba", async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1), project(2)]} total={2} />);
    expect(await screen.findByTestId("scene")).toBeInTheDocument();
    expect(screen.queryByText(/3D view unavailable/i)).toBeNull();

    await user.click(screen.getByRole("link", { name: /Project 2/ }));

    expect(scene.commands).toEqual([{ slot: 1, nonce: 1 }]);
    // Belum tiba: belum ada panel, tapi pembaca layar diberi tahu.
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(
      screen.getByText("Walking to rack R02, Project 2."),
    ).toBeInTheDocument();
    expect(scene.props?.paused).toBe(false);

    act(() => scene.props?.onArrive(1));

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", { name: "Project 2" }),
    ).toBeInTheDocument();
    // Panel terbuka → scene dijeda, pengumuman dikosongkan.
    expect(scene.props?.paused).toBe(true);
    expect(screen.queryByText(/Walking to rack/)).toBeNull();
  });

  it("memilih rak yang sama dua kali menghasilkan perintah baru (nonce naik)", async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    await screen.findByTestId("scene");

    const link = screen.getByRole("link", { name: /Project 1/ });
    await user.click(link);
    act(() => scene.props?.onArrive(0));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("link", { name: /Project 1/ }));

    expect(scene.commands).toEqual([
      { slot: 0, nonce: 1 },
      { slot: 0, nonce: 2 },
    ]);
  });

  it("tombol Inspect muncul saat robot di depan rak, dan membuka panelnya", async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1), project(2)]} total={2} />);
    await screen.findByTestId("scene");
    expect(screen.queryByRole("button", { name: /inspect/i })).toBeNull();

    act(() => scene.props?.onNearChange(1));
    await user.click(
      screen.getByRole("button", { name: /Inspect Project 2/i }),
    );
    expect(
      within(await screen.findByRole("dialog")).getByRole("heading", {
        name: "Project 2",
      }),
    ).toBeInTheDocument();

    // Tombol menghilang selama panel terbuka, dan saat robot menjauh.
    expect(screen.queryByRole("button", { name: /inspect/i })).toBeNull();
    await user.keyboard("{Escape}");
    act(() => scene.props?.onNearChange(null));
    expect(screen.queryByRole("button", { name: /inspect/i })).toBeNull();
  });

  it("tombol E membuka rak di depan robot; tidak berbuat apa-apa bila tidak ada rak di dekatnya", async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    await screen.findByTestId("scene");

    await user.keyboard("e");
    expect(screen.queryByRole("dialog")).toBeNull();

    act(() => scene.props?.onNearChange(0));
    await user.keyboard("e");
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("setelah panel ditutup, fokus kembali ke tombol Inspect (bukan hilang ke body)", async () => {
    const user = userEvent.setup();
    render(<PlaygroundShell projects={[project(1)]} total={1} />);
    await screen.findByTestId("scene");

    act(() => scene.props?.onNearChange(0));
    await user.click(screen.getByRole("button", { name: /inspect/i }));
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).toBeNull();
    // jsdom tidak punya matchMedia → daftar dianggap tersembunyi (ponsel).
    expect(screen.getByRole("button", { name: /inspect/i })).toHaveFocus();
  });
});

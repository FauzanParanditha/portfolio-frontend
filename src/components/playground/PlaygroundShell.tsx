"use client";

import {
  buildLayout,
  buildStations,
  rackCode,
  type PlaygroundProject,
} from "@/lib/playground/layout";
import { ArrowLeft, List, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Component,
  type MouseEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { isPageTarget, isTypingTarget } from "./input";
import type { WalkCommand } from "./scene/PlaygroundCanvas";
import { StationPanel } from "./StationPanel";

// three.js + scene hanya diunduh di halaman ini, dan hanya di browser.
const PlaygroundCanvas = dynamic(() => import("./scene/PlaygroundCanvas"), {
  ssr: false,
});

interface PlaygroundShellProps {
  projects: PlaygroundProject[];
  /** Jumlah proyek di backend; bisa lebih besar dari `projects.length`. */
  total: number;
}

const NOSCRIPT_CSS = `
#playground-loading, [data-requires-js] { display: none !important; }
@media (max-width: 767px) {
  #rack-list {
    display: flex !important;
    inset: 6rem 1rem auto 1rem;
    max-height: calc(100svh - 8rem);
  }
}`;

const focusRing =
  "focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-hidden";

// ── Sumber eksternal (dibaca lewat useSyncExternalStore) ──

const noopSubscribe = () => () => {};

let webglSupport: boolean | null = null;
function detectWebGL(): boolean {
  if (webglSupport !== null) return webglSupport;
  try {
    const canvas = document.createElement("canvas");
    const context =
      canvas.getContext("webgl2") ?? canvas.getContext("webgl") ?? null;
    webglSupport = context !== null;
    // Lepas konteks percobaan; browser membatasi jumlah konteks aktif.
    (context as WebGLRenderingContext | null)
      ?.getExtension("WEBGL_lose_context")
      ?.loseContext();
  } catch {
    webglSupport = false;
  }
  return webglSupport;
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia?.(REDUCED_MOTION_QUERY);
  query?.addEventListener("change", onChange);
  return () => query?.removeEventListener("change", onChange);
}
function getReducedMotion(): boolean {
  return window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false;
}

function subscribeVisibility(onChange: () => void): () => void {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}
function getHidden(): boolean {
  return document.visibilityState === "hidden";
}

/** Menangkap kegagalan scene (mis. konteks WebGL ditolak) → tampilan cadangan. */
class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[playground] scene 3D gagal dimuat:", error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Cangkang halaman /playground.
 *
 * Semua yang bisa dibaca dan diklik adalah DOM biasa — tautan kembali, daftar
 * rak, panel detail. Kanvas 3D adalah lapisan di belakangnya. Akibatnya:
 * - tanpa WebGL (atau saat scene gagal) halaman tetap berguna lewat daftar rak;
 * - daftar rak berupa tautan asli ke /projects/[slug], jadi bekerja juga tanpa
 *   JavaScript dan terbaca mesin pencari;
 * - pembaca layar tidak perlu "melihat" kanvas sama sekali.
 */
export function PlaygroundShell({ projects, total }: PlaygroundShellProps) {
  const stations = useMemo(
    () => buildStations(projects, total),
    [projects, total],
  );
  const layout = useMemo(() => buildLayout(stations.length), [stations.length]);

  const webgl = useSyncExternalStore(noopSubscribe, detectWebGL, () => true);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );
  const hidden = useSyncExternalStore(
    subscribeVisibility,
    getHidden,
    () => false,
  );

  const [ready, setReady] = useState(false);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [command, setCommand] = useState<WalkCommand | null>(null);
  const [panelSlot, setPanelSlot] = useState<number | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [nearSlot, setNearSlot] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(false);
  // Diumumkan ke pembaca layar: memilih rak tidak langsung membuka panel —
  // robot berjalan dulu — jadi tanpa ini aktivasi tautan terasa "tidak ada
  // yang terjadi".
  const [announcement, setAnnouncement] = useState("");

  const linkRefs = useRef(new Map<number, HTMLAnchorElement>());
  const inspectRef = useRef<HTMLButtonElement | null>(null);
  const listToggleRef = useRef<HTMLButtonElement | null>(null);
  // Dari mana panel terakhir dibuka; menentukan ke mana fokus dikembalikan.
  const panelOrigin = useRef<"list" | "inspect" | "scene">("scene");

  const sceneAvailable = webgl && !sceneFailed;
  const sceneActive = sceneAvailable && ready;

  const openPanel = useCallback((slot: number) => {
    setPanelSlot(slot);
    setPanelOpen(true);
    setAnnouncement("");
  }, []);
  const handleReady = useCallback(() => setReady(true), []);
  const handleSceneError = useCallback(() => setSceneFailed(true), []);

  const panelStation =
    panelSlot === null
      ? null
      : (stations[layout.slots[panelSlot]?.station ?? -1] ?? null);
  const nearStation =
    nearSlot === null
      ? null
      : (stations[layout.slots[nearSlot]?.station ?? -1] ?? null);

  // Klik biasa pada tautan rak = jalan ke rak itu lalu buka panelnya.
  // Klik dengan tombol pengubah / tengah tetap membuka halaman proyeknya.
  const handleStationClick = (event: MouseEvent, slot: number) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    setListOpen(false);
    panelOrigin.current = "list";
    if (sceneActive) {
      setCommand((previous) => ({ slot, nonce: (previous?.nonce ?? 0) + 1 }));
      const station = stations[layout.slots[slot]?.station ?? -1];
      if (station && !reducedMotion) {
        setAnnouncement(`Walking to rack ${rackCode(slot)}, ${station.label}.`);
      }
    } else {
      // Tanpa scene, tidak ada yang perlu "berjalan" — langsung buka panel.
      openPanel(slot);
    }
  };

  // E / Enter: periksa rak di depan pemain.
  useEffect(() => {
    if (nearSlot === null || panelOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey)
        return;
      // Enter pada tautan/tombol yang sedang fokus tetap milik elemen itu.
      if (
        event.code === "KeyE"
          ? !isTypingTarget(event.target)
          : event.code === "Enter" && isPageTarget(event.target)
      ) {
        event.preventDefault();
        panelOrigin.current = "scene";
        openPanel(nearSlot);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearSlot, panelOpen, openPanel]);

  const stationSlots = layout.slots.filter((slot) => slot.station !== null);

  // Setelah panel tertutup, kembalikan fokus ke pemicunya:
  // - dari daftar → tautan rak itu (atau tombol Inspect bila daftarnya
  //   sedang tersembunyi, mis. di ponsel);
  // - dari tombol Inspect → tombol itu;
  // - dari scene (klik rak, tombol E) → tidak ada kontrol pemicu. Fokus
  //   dibiarkan kembali ke halaman, supaya tombol panah tetap menggerakkan
  //   robot dan pengguna tidak "terlempar" ke dalam daftar.
  const restoreFocus = (event: Event) => {
    const origin = panelOrigin.current;
    panelOrigin.current = "scene";
    if (origin === "scene") return;

    const listVisible =
      !sceneAvailable ||
      listOpen ||
      (window.matchMedia?.("(min-width: 768px)").matches ?? false);
    const link =
      origin === "list" && panelSlot !== null && listVisible
        ? linkRefs.current.get(panelSlot)
        : undefined;
    const target = link ?? inspectRef.current ?? listToggleRef.current;
    if (!target) return;
    event.preventDefault();
    target.focus();
  };

  return (
    <div className="relative h-svh w-full overflow-hidden bg-zinc-950 font-sans text-zinc-100">
      {/* ── Lapisan 3D ── */}
      <div className="absolute inset-0">
        {sceneAvailable && (
          <SceneBoundary onError={handleSceneError}>
            <PlaygroundCanvas
              layout={layout}
              stations={stations}
              command={command}
              paused={panelOpen || hidden}
              reducedMotion={reducedMotion}
              onArrive={openPanel}
              onNearChange={setNearSlot}
              onReady={handleReady}
            />
          </SceneBoundary>
        )}
      </div>

      {/* Layar muat: sampai scene benar-benar terpasang. */}
      {sceneAvailable && !ready && (
        <div
          id="playground-loading"
          role="status"
          className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-zinc-950"
        >
          <div className="h-px w-40 overflow-hidden bg-zinc-800">
            <div className="h-full w-1/3 animate-pulse bg-cyan-400 motion-reduce:animate-none" />
          </div>
          <p className="font-mono text-xs tracking-widest text-zinc-400 uppercase">
            Booting server room…
          </p>
        </div>
      )}

      {/* Tampilan cadangan tanpa 3D. */}
      {!sceneAvailable && (
        <div className="absolute inset-0 flex items-center justify-center p-6 md:pl-88">
          <div className="max-w-md rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
            <p className="font-mono text-xs tracking-widest text-amber-400 uppercase">
              3D view unavailable
            </p>
            <p className="mt-3 text-base leading-relaxed text-zinc-300">
              This device or browser can&apos;t render the 3D room. Every
              project is still one click away in the rack list.
            </p>
          </div>
        </div>
      )}

      {/* ── HUD atas ── */}
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-4 p-4 sm:p-6">
        <Link
          href="/"
          className={`pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/80 px-4 text-xs font-medium tracking-widest text-zinc-200 uppercase backdrop-blur-md transition-colors hover:border-white hover:text-white ${focusRing}`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>
            Back<span className="hidden sm:inline"> to the regular site</span>
          </span>
        </Link>

        <div className="text-right">
          <p className="font-mono text-[0.7rem] tracking-widest text-cyan-400 uppercase">
            Playground
          </p>
          <h1 className="text-xl leading-tight font-medium tracking-tight text-white sm:text-2xl">
            Server Room
          </h1>
          <p className="sr-only">
            An interactive 3D room where every server rack is one of my
            projects. Use the rack list to open any project without the 3D view.
          </p>
        </div>
      </header>

      {/* ── Daftar rak ── */}
      <nav
        id="rack-list"
        aria-label="Project racks"
        className={`absolute z-20 flex-col rounded-lg border border-zinc-800 bg-zinc-950/85 backdrop-blur-md md:top-24 md:bottom-auto md:left-6 md:flex md:max-h-[calc(100svh-13rem)] md:w-72 ${
          listOpen || !sceneAvailable
            ? "inset-x-4 bottom-20 flex max-h-[60svh]"
            : "hidden"
        }`}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 className="font-mono text-xs tracking-widest text-zinc-400 uppercase">
            Racks · {stationSlots.length}
          </h2>
          {sceneAvailable && (
            <button
              type="button"
              onClick={() => setListOpen(false)}
              aria-label="Close rack list"
              className={`-mr-2 flex h-9 w-9 items-center justify-center rounded-sm text-zinc-400 hover:text-white md:hidden ${focusRing}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {stationSlots.length === 0 ? (
          <p className="p-4 text-sm leading-relaxed text-zinc-400">
            No projects are racked yet.{" "}
            <Link
              href="/projects"
              className={`rounded-sm text-zinc-200 underline underline-offset-4 hover:text-white ${focusRing}`}
            >
              See the projects page
            </Link>
            .
          </p>
        ) : (
          <ul className="overflow-y-auto py-1">
            {stationSlots.map((slot) => {
              const station = stations[slot.station as number];
              const selected = panelOpen && panelSlot === slot.index;
              return (
                <li key={station.id}>
                  <a
                    ref={(node) => {
                      if (node) linkRefs.current.set(slot.index, node);
                      else linkRefs.current.delete(slot.index);
                    }}
                    href={station.href}
                    onClick={(event) => handleStationClick(event, slot.index)}
                    aria-current={selected ? "true" : undefined}
                    className={`flex min-h-11 items-center gap-3 px-4 py-2 text-sm transition-colors hover:bg-zinc-900 hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-hidden focus-visible:ring-inset ${
                      nearSlot === slot.index ? "text-white" : "text-zinc-300"
                    }`}
                  >
                    <span
                      className={`font-mono text-xs ${
                        station.kind === "archive"
                          ? "text-amber-400"
                          : "text-cyan-400"
                      }`}
                    >
                      {rackCode(slot.index)}
                    </span>
                    <span className="truncate">{station.label}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* ── HUD bawah ── */}
      {sceneAvailable && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 p-4 sm:p-6">
          {sceneActive && nearStation && !panelOpen && nearSlot !== null && (
            <button
              ref={inspectRef}
              type="button"
              onClick={() => {
                panelOrigin.current = "inspect";
                openPanel(nearSlot);
              }}
              className={`pointer-events-auto inline-flex min-h-11 max-w-full items-center gap-3 rounded-full bg-white px-5 text-xs font-medium tracking-widest text-zinc-950 uppercase shadow-lg transition-colors hover:bg-cyan-300 ${focusRing}`}
            >
              <span className="truncate">Inspect {nearStation.label}</span>
              <kbd className="hidden rounded border border-zinc-300 px-1.5 py-0.5 font-mono text-[0.65rem] md:inline">
                E
              </kbd>
            </button>
          )}

          <div className="flex w-full items-end justify-between gap-3">
            <button
              ref={listToggleRef}
              type="button"
              onClick={() => setListOpen((open) => !open)}
              aria-expanded={listOpen}
              aria-controls="rack-list"
              data-requires-js
              className={`pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-full border border-zinc-700 bg-zinc-950/80 px-4 text-xs font-medium tracking-widest text-zinc-200 uppercase backdrop-blur-md md:hidden ${focusRing}`}
            >
              <List className="h-4 w-4" aria-hidden="true" />
              Racks
            </button>

            <p
              data-requires-js
              className="mx-auto hidden rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-center text-xs text-zinc-400 backdrop-blur-md md:block"
            >
              Click the floor to walk · Click a rack to inspect · Drag to look
              around · Scroll to zoom · WASD to move
            </p>
            <p
              data-requires-js
              className="rounded-full border border-zinc-800 bg-zinc-950/80 px-4 py-2 text-right text-xs text-zinc-400 backdrop-blur-md md:hidden"
            >
              Tap to walk · Drag to look
            </p>
          </div>
        </div>
      )}

      <StationPanel
        open={panelOpen}
        station={panelStation}
        slotIndex={panelSlot}
        onClose={() => setPanelOpen(false)}
        onCloseAutoFocus={restoreFocus}
      />

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>

      {/* Tanpa JavaScript tidak ada yang bisa membuka daftar rak di layar kecil
          maupun menyingkirkan layar muat — tampilkan daftarnya langsung. */}
      <noscript>
        <style>{NOSCRIPT_CSS}</style>
      </noscript>
    </div>
  );
}

"use client";

import { ContactForm } from "@/components/contact/ContactForm";
import { Footer } from "@/components/Footer";
import { GithubIcon, LinkedinIcon } from "@/components/icons/BrandIcons";
import { ExperienceList } from "@/components/playground/ExperienceList";
import { HealthSummary } from "@/components/playground/HealthSummary";
import { SceneBoundary } from "@/components/playground/SceneBoundary";
import { CV_URL, HEADLINE, PROFILE } from "@/content/profile";
import { useBackendHealth } from "@/hooks/use-backend-health";
import {
  useDocumentHidden,
  useMediaQuery,
  useReducedMotion,
  useWebGLSupport,
} from "@/hooks/use-environment";
import {
  buildLayout,
  buildStations,
  fixtureKindsFor,
  isRackStation,
  type PlaygroundExperience,
  type PlaygroundProject,
  rackCode,
} from "@/lib/playground/layout";
import type { SkillGroup } from "@/lib/skills";
import {
  readTourMode,
  subscribeTourMode,
  writeTourMode,
} from "@/lib/tour/mode";
import {
  buildTour,
  plateaus,
  progressAt,
  type Span,
  type TourStopId,
} from "@/lib/tour/tour";
import { ArrowUpRight } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// three.js + scene hanya diunduh bila tampilan 3D benar-benar dipakai.
const TourCanvas = dynamic(() => import("./TourCanvas"), { ssr: false });
// Panel ukur untuk uji di perangkat sungguhan; hanya diunduh dengan `?perf`.
const TourPerf = dynamic(() => import("./TourPerf"), { ssr: false });

const noopSubscribe = () => () => {};
/** Alamat memuat `?perf`. Dibaca dari `location` — `useSearchParams` akan
 * memaksa halaman statis ini keluar dari prerender. */
const hasPerfFlag = () =>
  new URLSearchParams(window.location.search).has("perf");

interface TourShellProps {
  /** Proyek yang mengisi rak (urutan API), sama seperti di /playground. */
  projects: PlaygroundProject[];
  /** Jumlah proyek di backend; bisa lebih besar dari `projects.length`. */
  total: number;
  /** Proyek unggulan yang ditampilkan di kartu "Projects". */
  featured: PlaygroundProject[];
  experiences: PlaygroundExperience[];
  skills: SkillGroup[];
}

const STOP_LABEL: Record<TourStopId, string> = {
  top: "Lobby",
  about: "About",
  projects: "Projects",
  experience: "Experience",
  status: "Status",
  contact: "Contact",
};

/**
 * Layar yang mendapat tampilan 3D secara bawaan: lebar DAN cukup tinggi
 * (laptop, desktop, tablet lanskap). Ponsel lanskap dan tablet potret tidak —
 * di sana kartu menutupi ruangan, dan kode 3D tidak perlu diunduh.
 * HARUS sama dengan kueri media di globals.css (blok "Tur ruang server").
 */
export const AUTO_3D_QUERY =
  "(min-width: 64rem) and (min-height: 37.5rem) and (prefers-reduced-motion: no-preference)";

const NOSCRIPT_CSS = `
.tour [data-requires-js] { display: none !important; }
.tour .tour-stop { display: block !important; min-height: 0 !important; padding: 1.75rem 1rem !important; }
.tour .tour-stop:first-of-type { padding-top: 6.5rem !important; }
.tour .tour-panel { width: min(100%, 42rem) !important; margin-inline: auto !important; }
.tour .tour-rail, .tour .tour-only-3d { display: none !important; }`;

const focusRing =
  "focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-hidden";
const eyebrowClass =
  "font-mono text-xs tracking-widest text-cyan-400 uppercase";
const titleClass =
  "text-3xl leading-tight font-medium tracking-tight text-balance text-white";
const leadClass = "text-base leading-relaxed text-zinc-300";
const primaryAction = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-white px-5 text-xs font-medium tracking-widest text-zinc-950 uppercase transition-colors hover:bg-cyan-300 ${focusRing}`;
const secondaryAction = `inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-zinc-600 px-5 text-xs font-medium tracking-widest text-zinc-100 uppercase transition-colors hover:border-white ${focusRing}`;

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Tur ruang server: seluruh isi portfolio sebagai kartu HTML yang digulir,
 * dengan ruang server 3D di belakangnya. Menggulir halaman menggerakkan kamera
 * dan robot dari satu perhentian ke perhentian berikutnya.
 *
 * Isinya HTML biasa dan lengkap sejak dari server. Tampilan 3D adalah
 * peningkatan: tanpa WebGL, di layar sempit, atau bila pengunjung meminta
 * gerak dikurangi, halaman yang sama tampil sebagai kartu bertumpuk.
 */
export function TourShell({
  projects,
  total,
  featured,
  experiences,
  skills,
}: TourShellProps) {
  const stations = useMemo(
    () => buildStations(projects, total, experiences),
    [projects, total, experiences],
  );
  const layout = useMemo(
    () =>
      buildLayout(
        stations.filter(isRackStation).length,
        fixtureKindsFor(stations),
      ),
    [stations],
  );
  const tour = useMemo(() => buildTour(layout), [layout]);
  const stopIds = useMemo(() => tour.stops.map((stop) => stop.id), [tour]);

  // ── Tampilan: 3D atau ringkas ──
  const webgl = useWebGLSupport();
  const reducedMotion = useReducedMotion();
  const hidden = useDocumentHidden();
  const auto3d = useMediaQuery(AUTO_3D_QUERY);
  const chosen = useSyncExternalStore(
    subscribeTourMode,
    readTourMode,
    () => null,
  );
  const [sceneFailed, setSceneFailed] = useState(false);
  const perf = useSyncExternalStore(noopSubscribe, hasPerfFlag, () => false);

  const canRender3d = webgl && !sceneFailed;
  const show3d = canRender3d && (chosen ? chosen === "3d" : auto3d);
  // Pilihan pengunjung hidup di <html data-tour-mode> (lihat mode.ts), bukan
  // di sini — supaya sudah berlaku sebelum React terhidrasi. Atribut ini hanya
  // untuk memaksa tata letak ringkas bila 3D mustahil.
  const dataMode = canRender3d ? undefined : "simple";

  const handleSceneError = useCallback(() => setSceneFailed(true), []);

  // ── Posisi gulir → perhentian aktif ──
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stopRefs = useRef(new Map<TourStopId, HTMLElement>());
  const progressRef = useRef(0);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let spans: Span[] = [];
    let frame = 0;

    const update = () => {
      frame = 0;
      const progress = progressAt(
        spans,
        window.scrollY + window.innerHeight / 2,
      );
      progressRef.current = progress;
      const nearest = Math.round(progress);
      setActive((previous) => (previous === nearest ? previous : nearest));
    };
    const measure = () => {
      spans = plateaus(
        stopIds.map((id) => {
          const rect = stopRefs.current.get(id)?.getBoundingClientRect();
          // `rect.top` relatif ke layar; tambah posisi gulir → koordinat dokumen.
          return rect
            ? { top: rect.top + window.scrollY, height: rect.height }
            : { top: 0, height: 0 };
        }),
        window.innerHeight,
      );
      // Frame gulir yang masih tertunda akan memakai ukuran lama; ganti.
      if (frame !== 0) cancelAnimationFrame(frame);
      update();
    };
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update);
    };

    measure();
    // Tinggi kartu berubah (data status tiba, tata letak berganti, font dimuat):
    // titik tengahnya ikut bergeser.
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    if (containerRef.current) observer?.observe(containerRef.current);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [stopIds]);

  // ── Status backend ──
  // Baru diperiksa saat pengunjung mendekati kartunya, dan lebih sering selama
  // kartu itu yang sedang dibaca. Berhenti saat tab tersembunyi.
  const statusIndex = stopIds.indexOf("status");
  const nearStatus = statusIndex !== -1 && Math.abs(active - statusIndex) <= 1;
  const health = useBackendHealth(
    active === statusIndex,
    !hidden && nearStatus,
  );

  // ── Sorotan rak dari kartu proyek ──
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const featuredRows = useMemo(
    () =>
      featured.map((project) => {
        const slot = stations.findIndex(
          (station) => station.kind === "project" && station.id === project.id,
        );
        return { project, slot: slot === -1 ? null : slot };
      }),
    [featured, stations],
  );

  // Satu callback ref untuk semua perhentian, tetap sama antar-render (callback
  // baru tiap render membuat React melepas lalu memasang ulang ref-nya).
  // Perhentiannya dikenali dari `id` elemen; pembersihnya dikembalikan sebagai
  // fungsi (React 19).
  const registerStop = useCallback((element: HTMLElement | null) => {
    if (!element) return;
    const id = element.id as TourStopId;
    const stops = stopRefs.current;
    stops.set(id, element);
    return () => {
      stops.delete(id);
    };
  }, []);

  const cards: Record<TourStopId, ReactNode> = {
    top: (
      <>
        <p className={eyebrowClass}>{PROFILE.role} · Based in Indonesia</p>
        <h1
          id="top-heading"
          className="text-3xl leading-[1.1] font-medium tracking-tight text-balance text-white sm:text-4xl"
        >
          {HEADLINE}
        </h1>
        <div className="flex flex-wrap gap-3">
          <Link href="/projects" className={primaryAction}>
            View projects
          </Link>
          {CV_URL ? (
            <a
              href={CV_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={secondaryAction}
            >
              Download CV
            </a>
          ) : null}
          <a
            href={PROFILE.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryAction}
          >
            <GithubIcon className="h-4 w-4" aria-hidden="true" />
            GitHub
          </a>
          <a
            href={PROFILE.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={secondaryAction}
          >
            <LinkedinIcon className="h-4 w-4" aria-hidden="true" />
            LinkedIn
          </a>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-center">
          {PROFILE.stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col-reverse gap-1 rounded-md border border-zinc-700 p-3"
            >
              <dt className="font-mono text-[0.7rem] tracking-widest text-zinc-400 uppercase">
                {stat.label}
              </dt>
              <dd className="font-mono text-lg font-bold text-white tabular-nums">
                {stat.value}
              </dd>
            </div>
          ))}
        </dl>
        {/* Tampil-tidaknya ditentukan CSS (`.tour-only-3d`), bukan `show3d`:
            baris yang baru muncul setelah hidrasi menggeser isi kartu
            (terukur sebagai layout shift). */}
        <p className="tour-only-3d text-sm text-zinc-400">
          Scroll to walk through the room.
        </p>
      </>
    ),
    about: (
      <>
        <p className={eyebrowClass}>
          {pad(stopIds.indexOf("about") + 1)} · About
        </p>
        <h2 id="about-heading" className={titleClass}>
          Profile &amp; capabilities
        </h2>
        <p className={leadClass}>{PROFILE.about}</p>
        {skills.length > 0 && (
          <dl className="flex flex-col gap-3">
            {skills.map((group) => (
              <div
                key={group.type}
                className="flex flex-col gap-1 border-l border-zinc-700 pl-4"
              >
                <dt className="font-mono text-xs tracking-widest text-zinc-400 uppercase">
                  {group.type}
                </dt>
                <dd className="text-sm leading-relaxed text-zinc-200">
                  {group.names.join(", ")}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </>
    ),
    projects: (
      <>
        <p className={eyebrowClass}>
          {pad(stopIds.indexOf("projects") + 1)} · Projects
        </p>
        <h2 id="projects-heading" className={titleClass}>
          Selected works
        </h2>
        <p className={leadClass}>Each project has its own rack in the room.</p>
        {featuredRows.length === 0 ? (
          <p className="text-sm text-zinc-400">No featured works available.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {featuredRows.map(({ project, slot }) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${encodeURIComponent(project.slug)}`}
                  onPointerEnter={() => setHighlighted(slot)}
                  onPointerLeave={() => setHighlighted(null)}
                  onFocus={() => setHighlighted(slot)}
                  onBlur={() => setHighlighted(null)}
                  className={`flex flex-col gap-1.5 rounded-md border border-zinc-800 bg-zinc-900/70 p-4 transition-colors hover:border-cyan-400 ${focusRing}`}
                >
                  <span className="flex items-baseline gap-3">
                    {slot !== null && (
                      <span className="font-mono text-xs text-cyan-400">
                        {rackCode(slot)}
                      </span>
                    )}
                    <span className="font-medium text-white">
                      {project.title}
                    </span>
                  </span>
                  <span className="text-sm leading-relaxed text-zinc-300">
                    {project.shortDesc}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <Link href="/projects" className={`${secondaryAction} self-start`}>
          All projects
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </>
    ),
    experience: (
      <>
        <p className={eyebrowClass}>
          {pad(stopIds.indexOf("experience") + 1)} · Experience
        </p>
        <h2 id="experience-heading" className={titleClass}>
          Where I&apos;ve worked
        </h2>
        <ExperienceList experiences={experiences} />
      </>
    ),
    status: (
      <>
        <p className={eyebrowClass}>
          {pad(stopIds.indexOf("status") + 1)} · Status
        </p>
        <h2 id="status-heading" className={titleClass}>
          The API behind this page is live
        </h2>
        <p className={leadClass}>
          Your browser is calling the Go API that serves this site. These are
          its answers right now, not a recording.
        </p>
        <HealthSummary
          health={health}
          refreshHint="Refreshes every 10 seconds while you are here."
        />
      </>
    ),
    contact: (
      <>
        <p className={eyebrowClass}>
          {pad(stopIds.indexOf("contact") + 1)} · Contact
        </p>
        <h2 id="contact-heading" className={titleClass}>
          Send a message
        </h2>
        <p className={leadClass}>
          Tell me about the project or role. I read every message.
        </p>
        <ContactForm variant="panel" idPrefix="tour-contact" />
      </>
    ),
  };

  return (
    <div
      ref={containerRef}
      data-mode={dataMode}
      className="tour relative min-h-svh bg-zinc-950 font-sans text-zinc-100"
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-60 focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:font-medium focus:text-black focus:ring-2 focus:ring-white focus:outline-hidden"
      >
        Skip to content
      </a>

      {/* ── Lapisan 3D: di belakang semua kartu, tidak menerima input. ── */}
      {show3d && (
        <TourStage onError={handleSceneError}>
          {(onReady) => (
            <TourCanvas
              layout={layout}
              stations={stations}
              tour={tour}
              progressRef={progressRef}
              highlightedSlot={highlighted}
              health={health}
              paused={hidden}
              reducedMotion={reducedMotion}
              onReady={onReady}
            />
          )}
        </TourStage>
      )}

      {/* ── Bilah atas ── */}
      <header className="fixed inset-x-0 top-0 z-30 flex items-center justify-between gap-3 border-b border-zinc-800 bg-zinc-950/85 px-4 py-2.5 backdrop-blur-md sm:px-6">
        <Link
          href="/"
          className={`rounded-sm text-lg font-semibold tracking-tight text-white ${focusRing}`}
        >
          PARANDITHA
        </Link>
        <div className="flex items-center gap-3">
          <p
            data-requires-js
            aria-hidden="true"
            className="font-mono text-xs text-zinc-400 tabular-nums md:hidden"
          >
            {pad(active + 1)} / {pad(stopIds.length)}
          </p>
          <Link
            href="/playground"
            prefetch={false}
            className={`hidden min-h-11 items-center rounded-full border border-zinc-700 px-4 text-xs font-medium tracking-widest text-zinc-200 uppercase transition-colors hover:border-white hover:text-white sm:inline-flex ${focusRing}`}
          >
            Explore freely
          </Link>
          {canRender3d && (
            <button
              type="button"
              data-requires-js
              onClick={() => writeTourMode(show3d ? "simple" : "3d")}
              // Lebar tetap: teksnya baru benar setelah hidrasi, dan tombol
              // yang melebar akan menggeser tautan di sebelahnya.
              className={`inline-flex min-h-11 min-w-44 items-center justify-center rounded-full border border-zinc-700 bg-zinc-950 px-4 text-xs font-medium tracking-widest text-zinc-200 uppercase transition-colors hover:border-white hover:text-white ${focusRing}`}
            >
              {show3d ? "Simple version" : "3D version"}
            </button>
          )}
        </div>
      </header>

      {/* ── Rel perhentian (layar lebar) ── */}
      <nav
        aria-label="Tour stops"
        className="tour-rail fixed top-1/2 right-4 z-20 -translate-y-1/2 flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-950/85 p-2 backdrop-blur-md"
      >
        {stopIds.map((id, index) => (
          <a
            key={id}
            href={`#${id}`}
            aria-current={active === index ? "location" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-md px-3 font-mono text-xs transition-colors hover:text-white ${focusRing} ${
              active === index ? "bg-zinc-800 text-white" : "text-zinc-400"
            }`}
          >
            <span className={active === index ? "text-cyan-400" : undefined}>
              {pad(index + 1)}
            </span>
            {STOP_LABEL[id]}
          </a>
        ))}
      </nav>

      <main id="main">
        {stopIds.map((id) => (
          <section
            key={id}
            id={id}
            ref={registerStop}
            aria-labelledby={`${id}-heading`}
            className="tour-stop"
          >
            <div className="tour-panel flex flex-col gap-5 rounded-lg border border-zinc-800 bg-zinc-950/85 p-6 backdrop-blur-md">
              {cards[id]}
            </div>
          </section>
        ))}
      </main>

      {/* z-20, sama dengan rel dan muncul belakangan di DOM: footer menutupi
          rel saat halaman sampai di dasar, sehingga tautan sosialnya tidak
          tertindih. */}
      <div className="relative z-20">
        <Footer />
      </div>

      {perf && <TourPerf show3d={show3d} />}

      {/* Tanpa JavaScript tidak ada kanvas: pakai tata letak ringkas dan
          sembunyikan kontrol yang butuh JS. */}
      <noscript>
        <style>{NOSCRIPT_CSS}</style>
      </noscript>
    </div>
  );
}

/**
 * Bingkai kanvas: `position: fixed` di belakang kartu, tersembunyi dari
 * pembaca layar, dan baru memudar masuk setelah scene benar-benar terpasang.
 *
 * Komponen sendiri supaya keadaan "sudah siap" ikut hilang tiap kanvas dilepas
 * (ganti ke tampilan ringkas, layar diputar) — pemasangan berikutnya memudar
 * masuk lagi, bukan menampilkan kanvas kosong sekejap.
 */
function TourStage({
  onError,
  children,
}: {
  onError: () => void;
  children: (onReady: () => void) => ReactNode;
}) {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-0 z-0 transition-opacity duration-700 motion-reduce:transition-none ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      <SceneBoundary onError={onError}>{children(handleReady)}</SceneBoundary>
    </div>
  );
}

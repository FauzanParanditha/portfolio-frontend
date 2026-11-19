"use client";

import { ContactForm } from "@/components/contact/ContactForm";
import { GithubIcon } from "@/components/icons/BrandIcons";
import { ProjectImage } from "@/components/ProjectImage";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  CHECK_LABEL,
  type Health,
  OVERALL_LABEL,
  type OverallState,
} from "@/lib/playground/health";
import { experiencePeriod, type Station } from "@/lib/playground/layout";
import { safeHttpUrl } from "@/lib/safeUrl";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleCheck,
  CircleX,
  Clock,
  ExternalLink,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";

interface StationPanelProps {
  open: boolean;
  /**
   * Stasiun yang ditampilkan. Sengaja dipisah dari `open`: induk tetap
   * mengirim stasiun terakhir saat panel menutup, supaya isinya tidak hilang
   * di tengah animasi keluar.
   */
  station: Station | null;
  /** Kode pendek tujuan (R01, API, …) untuk label di panel. */
  code: string;
  /** Status backend terbaru; hanya dipakai panel terminal. */
  health?: Health | null;
  onClose: () => void;
  /**
   * Dipanggil setelah panel tertutup, saat Radix hendak mengembalikan fokus.
   * Panel ini tidak punya `Trigger`, jadi induk yang memutuskan fokus kembali
   * ke mana (tanpa ini fokus jatuh ke <body>).
   */
  onCloseAutoFocus?: (event: Event) => void;
}

const actionClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-xs font-medium tracking-widest uppercase transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 focus-visible:outline-hidden";

/**
 * Panel detail stasiun — DOM biasa (Radix Dialog), bukan bagian dari kanvas.
 * Jadi tetap terbaca pembaca layar, bisa ditutup dengan Escape, dan fokus
 * terkunci di dalamnya selama terbuka.
 */
export function StationPanel({
  open,
  station,
  code,
  health = null,
  onClose,
  onCloseAutoFocus,
}: StationPanelProps) {
  return (
    <Sheet
      open={open && station !== null}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side="right"
        onCloseAutoFocus={onCloseAutoFocus}
        // Lapisan lebih tipis dari bawaan: ruangan tetap terlihat di belakang.
        overlayClassName="bg-black/45"
        // Tombol tutup: area sentuh 44×44 px dan berlatar, supaya mudah
        // diketuk dan terbaca di atas gambar cover apa pun.
        closeClassName="top-1.5 right-1.5 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-zinc-950/75 text-white opacity-100 backdrop-blur-sm hover:bg-zinc-800 focus-visible:ring-cyan-400 focus-visible:ring-offset-0"
        // Panelnya sendiri tidak menggulir — isinya yang menggulir — sehingga
        // tombol tutup selalu terlihat. Di ponsel panel selebar layar: tidak
        // ada overlay untuk diketuk, jadi tombol itu satu-satunya jalan keluar.
        className="flex w-full flex-col gap-0 overflow-hidden border-zinc-800 bg-zinc-950 p-0 text-zinc-100 sm:max-w-md"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          {station?.kind === "project" ? (
            <ProjectBody station={station} code={code} />
          ) : station?.kind === "archive" ? (
            <ArchiveBody remaining={station.remaining} code={code} />
          ) : station?.kind === "status" ? (
            <StatusBody health={health} />
          ) : station?.kind === "experience" ? (
            <ExperienceBody station={station} />
          ) : station?.kind === "contact" ? (
            <ContactBody />
          ) : (
            // Radix mewajibkan judul selama konten terpasang (animasi tutup).
            <SheetTitle className="sr-only">Station details</SheetTitle>
          )}

          <div className="mt-auto border-t border-zinc-800 p-6">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-sm text-sm text-zinc-400 transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-hidden"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to the regular site
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ProjectBody({
  station,
  code,
}: {
  station: Extract<Station, { kind: "project" }>;
  code: string;
}) {
  const { project } = station;
  // URL berasal dari data API — hanya http/https yang boleh jadi tautan.
  const demoUrl = safeHttpUrl(project.demoUrl);
  const repoUrl = safeHttpUrl(project.repoUrl);
  const meta = [project.category, project.timeline, project.role].filter(
    Boolean,
  );

  return (
    <>
      <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-zinc-900">
        <ProjectImage
          src={project.coverImageUrl}
          alt=""
          sizes="(min-width: 640px) 448px, 100vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs tracking-widest text-cyan-400 uppercase">
            Rack {code}
          </p>
          <SheetTitle className="text-2xl leading-tight font-medium tracking-tight text-white">
            {project.title}
          </SheetTitle>
          {meta.length > 0 && (
            <p className="text-sm text-zinc-400">{meta.join(" · ")}</p>
          )}
        </div>

        <SheetDescription className="text-base leading-relaxed text-zinc-300">
          {project.shortDesc}
        </SheetDescription>

        {project.tags.length > 0 && (
          <ul aria-label="Technologies" className="flex flex-wrap gap-2">
            {project.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href={station.href}
            className={`${actionClass} bg-white text-zinc-950 hover:bg-cyan-300`}
          >
            View case study
            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          {(demoUrl || repoUrl) && (
            <div className="flex flex-wrap gap-3">
              {demoUrl && (
                <a
                  href={demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${actionClass} flex-1 border border-zinc-700 text-zinc-200 hover:border-white hover:text-white`}
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  Live demo
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${actionClass} flex-1 border border-zinc-700 text-zinc-200 hover:border-white hover:text-white`}
                >
                  <GithubIcon className="h-4 w-4" aria-hidden="true" />
                  Source
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function ArchiveBody({ remaining, code }: { remaining: number; code: string }) {
  return (
    <div className="flex flex-col gap-5 p-6 pt-14">
      <div className="flex flex-col gap-2">
        <p className="font-mono text-xs tracking-widest text-amber-400 uppercase">
          Rack {code}
        </p>
        <SheetTitle className="text-2xl leading-tight font-medium tracking-tight text-white">
          Project archive
        </SheetTitle>
      </div>
      <SheetDescription className="text-base leading-relaxed text-zinc-300">
        {remaining} more {remaining === 1 ? "project lives" : "projects live"}{" "}
        in the archive. The full list has search and filters.
      </SheetDescription>
      <Link
        href="/projects"
        className={`${actionClass} bg-white text-zinc-950 hover:bg-cyan-300`}
      >
        Browse all projects
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

const eyebrowClass =
  "font-mono text-xs tracking-widest text-cyan-400 uppercase";
const titleClass =
  "text-2xl leading-tight font-medium tracking-tight text-white";

// Keadaan disampaikan dengan ikon + teks, tidak hanya warna.
const OVERALL_STYLE: Record<
  OverallState,
  { icon: typeof CircleCheck; className: string }
> = {
  operational: {
    icon: CircleCheck,
    className: "border-emerald-400/60 text-emerald-300",
  },
  degraded: {
    icon: TriangleAlert,
    className: "border-amber-400/60 text-amber-300",
  },
  limited: { icon: Clock, className: "border-zinc-500 text-zinc-300" },
  unavailable: { icon: CircleX, className: "border-zinc-500 text-zinc-300" },
};

/** Terminal: status backend yang sebenarnya, diperiksa dari browser ini. */
function StatusBody({ health }: { health: Health | null }) {
  const style = health ? OVERALL_STYLE[health.overall] : null;
  const Icon = style?.icon ?? Clock;

  return (
    <div className="flex flex-col gap-5 p-6 pt-14">
      <div className="flex flex-col gap-2">
        <p className={eyebrowClass}>Terminal · API</p>
        <SheetTitle className={titleClass}>Live status</SheetTitle>
      </div>
      <SheetDescription className="text-base leading-relaxed text-zinc-300">
        Your browser is calling the API that serves this site. These are its
        answers right now, not a recording.
      </SheetDescription>

      <p
        className={`inline-flex min-h-11 items-center gap-2 self-start rounded-full border px-4 text-sm font-medium ${
          style?.className ?? "border-zinc-600 text-zinc-300"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {health ? OVERALL_LABEL[health.overall] : "Checking…"}
      </p>

      {health && (
        <>
          <table className="w-full border-collapse font-mono text-sm tabular-nums">
            <caption className="sr-only">Health checks</caption>
            <thead>
              <tr className="text-left text-xs tracking-widest text-zinc-400 uppercase">
                <th scope="col" className="pb-2 font-normal">
                  Endpoint
                </th>
                <th scope="col" className="pb-2 font-normal">
                  Result
                </th>
                <th scope="col" className="pb-2 text-right font-normal">
                  Round trip
                </th>
              </tr>
            </thead>
            <tbody>
              {health.checks.map((check) => (
                <tr key={check.name} className="border-t border-zinc-800">
                  <th
                    scope="row"
                    className="py-3 pr-3 text-left font-normal break-all text-zinc-200"
                  >
                    {check.path}
                  </th>
                  <td
                    className={`py-3 pr-3 ${
                      check.state === "ok"
                        ? "text-emerald-300"
                        : check.state === "degraded"
                          ? "text-amber-300"
                          : "text-zinc-300"
                    }`}
                  >
                    {CHECK_LABEL[check.state]}
                  </td>
                  <td className="py-3 text-right text-zinc-300">
                    {check.latencyMs === null ? "—" : `${check.latencyMs} ms`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <p className="text-sm leading-relaxed text-zinc-400">
            Checked at {new Date(health.checkedAt).toLocaleTimeString()}.
            Refreshes every 10 seconds while this panel is open.
          </p>
          {health.overall === "unavailable" && (
            <p className="text-sm leading-relaxed text-zinc-400">
              The status endpoint can&apos;t be reached from here. The rest of
              the site may still work.
            </p>
          )}
          {health.overall === "limited" && (
            <p className="text-sm leading-relaxed text-zinc-400">
              The API asked this browser to slow down. Checks resume on their
              own.
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ExperienceBody({
  station,
}: {
  station: Extract<Station, { kind: "experience" }>;
}) {
  return (
    <div className="flex flex-col gap-6 p-6 pt-14">
      <div className="flex flex-col gap-2">
        <p className={eyebrowClass}>Wall · Experience</p>
        <SheetTitle className={titleClass}>Where I&apos;ve worked</SheetTitle>
        <SheetDescription className="sr-only">
          Work history, one entry per role.
        </SheetDescription>
      </div>

      <ol className="flex flex-col gap-6">
        {station.experiences.map((experience) => (
          <li
            key={experience.id}
            className="flex flex-col gap-2 border-l border-zinc-700 pl-4"
          >
            <p className="font-mono text-xs tracking-widest text-cyan-400 uppercase">
              {experiencePeriod(experience)}
            </p>
            <h3 className="text-lg leading-snug font-medium text-white">
              {experience.title}
            </h3>
            <p className="text-sm text-zinc-400">
              {[experience.company, experience.location]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {experience.description && (
              <p className="text-sm leading-relaxed text-zinc-300">
                {experience.description}
              </p>
            )}
            {experience.highlights.length > 0 && (
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-zinc-300">
                {experience.highlights.map((highlight, index) => (
                  <li key={index}>{highlight}</li>
                ))}
              </ul>
            )}
            {experience.tags.length > 0 && (
              <ul
                aria-label="Technologies"
                className="flex flex-wrap gap-2 pt-1"
              >
                {experience.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ContactBody() {
  return (
    <div className="flex flex-col gap-6 p-6 pt-14">
      <div className="flex flex-col gap-2">
        <p className={eyebrowClass}>Mailbox · Contact</p>
        <SheetTitle className={titleClass}>Send a message</SheetTitle>
      </div>
      <SheetDescription className="text-base leading-relaxed text-zinc-300">
        Tell me about the project or role. It goes to the same inbox as the form
        on the main site.
      </SheetDescription>
      <ContactForm variant="panel" idPrefix="pg-contact" />
    </div>
  );
}

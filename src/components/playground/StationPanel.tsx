"use client";

import {
  type ContactDraft,
  ContactForm,
  EMPTY_CONTACT_DRAFT,
} from "@/components/contact/ContactForm";
import { GithubIcon } from "@/components/icons/BrandIcons";
import { ProjectImage } from "@/components/ProjectImage";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Health } from "@/lib/playground/health";
import type { Station } from "@/lib/playground/layout";
import { safeHttpUrl } from "@/lib/safeUrl";
import { ArrowLeft, ArrowUpRight, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ExperienceList } from "./ExperienceList";
import { HealthSummary } from "./HealthSummary";
import { useState } from "react";

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
  // Radix melepas isi panel saat tertutup. Draf pesan disimpan di sini (panel
  // ini sendiri tetap terpasang) supaya Escape atau klik di luar panel tidak
  // menghapus ketikan pengunjung.
  const [contactDraft, setContactDraft] =
    useState<ContactDraft>(EMPTY_CONTACT_DRAFT);

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
        {/* Wadah gulir bisa difokus: tanpa itu pengguna keyboard tidak bisa
            menggulir isi panjang (mis. riwayat kerja) di Chrome/Safari. */}
        <div
          role="region"
          aria-label="Station details"
          tabIndex={0}
          className="flex min-h-0 flex-1 flex-col overflow-y-auto focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-hidden focus-visible:ring-inset"
        >
          {station?.kind === "project" ? (
            <ProjectBody station={station} code={code} />
          ) : station?.kind === "archive" ? (
            <ArchiveBody remaining={station.remaining} code={code} />
          ) : station?.kind === "status" ? (
            <StatusBody health={health} />
          ) : station?.kind === "experience" ? (
            <ExperienceBody station={station} />
          ) : station?.kind === "contact" ? (
            <ContactBody draft={contactDraft} onDraftChange={setContactDraft} />
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
              Back to home
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

/** Terminal: status backend yang sebenarnya, diperiksa dari browser ini. */
function StatusBody({ health }: { health: Health | null }) {
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
      <HealthSummary health={health} />
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

      <ExperienceList experiences={station.experiences} />
    </div>
  );
}

function ContactBody({
  draft,
  onDraftChange,
}: {
  draft: ContactDraft;
  onDraftChange: (draft: ContactDraft) => void;
}) {
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
      <ContactForm
        variant="panel"
        idPrefix="pg-contact"
        initialDraft={draft}
        onDraftChange={onDraftChange}
      />
    </div>
  );
}

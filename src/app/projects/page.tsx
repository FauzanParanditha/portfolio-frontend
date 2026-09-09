import { ProjectCardOverlay } from "@/components/ProjectCardOverlay";
import { ProjectImage } from "@/components/ProjectImage";
import { GithubIcon } from "@/components/icons/BrandIcons";
import { ProjectSearch } from "@/components/projects/ProjectSearch";
import { Button } from "@/components/ui/button";
import { getProjectsPage, getUsedProjectTags } from "@/lib/server/portfolio";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";

/**
 * Indeks proyek — komponen SERVER.
 *
 * Sebelumnya `"use client"` dengan SWR, sehingga HTML-nya (18,5 KB) tidak
 * memuat satu pun kartu proyek. Padahal ini halaman tujuan tombol
 * "View projects" di hero — kemungkinan halaman kedua yang dibuka recruiter.
 *
 * Kata kunci, filter tag, dan nomor halaman kini hidup di URL, bukan di state
 * React. Tiga akibatnya:
 *
 *   1. Isinya terkirim di HTML pertama, terbaca crawler dan koneksi lambat.
 *   2. Hasil pencarian/filter bisa di-bookmark dan dibagikan; tombol Back jalan.
 *   3. Filter tag dan paginasi dikerjakan DATABASE. Versi lama menyaring tag di
 *      browser atas satu halaman hasil, jadi memfilter di halaman 2 dengan tag
 *      yang hanya ada di halaman 1 menghasilkan kosong — dan jumlah halamannya
 *      salah.
 */

const PROJECTS_PER_PAGE = 6;

// Data proyek jarang berubah; segarkan tiap 5 menit seperti beranda.
export const revalidate = 300;

interface PageProps {
  searchParams: Promise<{ q?: string; tag?: string; page?: string }>;
}

/** Menyusun URL /projects dengan hanya parameter yang benar-benar terpakai. */
function buildHref(params: { q?: string; tag?: string; page?: number }) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.tag) qs.set("tag", params.tag);
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  const s = qs.toString();
  return s ? `/projects?${s}` : "/projects";
}

export default async function ProjectsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const tag = sp.tag?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  const [result, tagNames] = await Promise.all([
    getProjectsPage({ page, limit: PROJECTS_PER_PAGE, q, tag }),
    getUsedProjectTags(),
  ]);

  const { projects, totalPages } = result;
  const hasFilter = q !== "" || tag !== "";

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Header */}
      <header className="bg-background/80 sticky top-0 z-50 py-6 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 lg:px-12">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 transition-opacity hover:bg-transparent hover:opacity-70"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-xl font-medium tracking-tight">Projects</h1>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 lg:px-12 lg:py-32">
        <div className="container mx-auto">
          <h2 className="rise-in mb-8 max-w-4xl text-5xl font-medium tracking-tight md:text-7xl lg:text-8xl">
            Selected Works
          </h2>

          <p
            className="rise-in text-muted-foreground max-w-2xl text-lg md:text-xl"
            style={{ animationDelay: "100ms" }}
          >
            A collection of digital experiences and solutions, focused on clean
            design and robust engineering.
          </p>

          <ProjectSearch initialQuery={q} />

          {/* Filter tag. Tautan biasa, bukan tombol — bisa dibuka di tab baru,
              dan berfungsi tanpa JavaScript sama sekali. */}
          {tagNames.length > 0 ? (
            <nav aria-label="Filter berdasarkan tag" className="mt-12">
              <ul className="flex flex-wrap gap-x-6 gap-y-3">
                <li>
                  <Link
                    href={buildHref({ q })}
                    aria-current={tag === "" ? "page" : undefined}
                    className={`flex min-h-11 items-center text-sm tracking-wide transition-all ${
                      tag === ""
                        ? "border-foreground border-b pb-1 font-medium opacity-100"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    All
                  </Link>
                </li>
                {tagNames.map((name) => (
                  <li key={name}>
                    <Link
                      href={buildHref({ q, tag: name })}
                      aria-current={tag === name ? "page" : undefined}
                      className={`flex min-h-11 items-center text-sm tracking-wide transition-all ${
                        tag === name
                          ? "border-foreground border-b pb-1 font-medium opacity-100"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      {name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ) : null}
        </div>
      </section>

      {/* Grid */}
      <section className="px-6 pt-8 pb-24 lg:px-12">
        <div className="container mx-auto">
          {projects.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-muted-foreground text-lg">
                No projects found.
              </p>
              {hasFilter ? (
                <Button variant="outline" className="mt-4" asChild>
                  <Link href="/projects">Clear filters</Link>
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-16 md:grid-cols-2 lg:gap-24">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="reveal-on-scroll group flex flex-col gap-6"
                >
                  <Link
                    href={`/projects/${project.slug}`}
                    className="bg-muted/20 relative block aspect-4/3 overflow-hidden"
                  >
                    <ProjectImage
                      src={project.coverImageUrl}
                      alt={project.title}
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-105 motion-reduce:transition-none"
                    />
                    <ProjectCardOverlay />
                  </Link>

                  <div className="flex flex-col gap-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <Link
                          href={`/projects/${project.slug}`}
                          className="transition-opacity group-hover:opacity-80"
                        >
                          <h3 className="text-2xl font-medium tracking-tight">
                            {project.title}
                          </h3>
                        </Link>

                        {project.tags.length > 0 ? (
                          <p className="text-muted-foreground mt-1 text-sm">
                            {project.tags.map((t) => t.name).join(" • ")}
                          </p>
                        ) : null}
                      </div>

                      {/* Tautan cepat. `focus-within` pada kartu ikut
                          memunculkannya, supaya pengguna keyboard tidak
                          menemukan tautan yang tak terlihat. */}
                      <div className="flex gap-4 opacity-0 transition-opacity duration-300 group-focus-within:opacity-100 group-hover:opacity-100">
                        {project.repoUrl ? (
                          <a
                            href={project.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground flex h-11 w-11 items-center justify-center"
                            aria-label={`Kode sumber ${project.title}`}
                          >
                            <GithubIcon
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </a>
                        ) : null}
                        {project.demoUrl ? (
                          <a
                            href={project.demoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground flex h-11 w-11 items-center justify-center"
                            aria-label={`Demo ${project.title}`}
                          >
                            <ExternalLink
                              className="h-5 w-5"
                              aria-hidden="true"
                            />
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <p className="text-muted-foreground line-clamp-2 max-w-md text-base opacity-80">
                      {project.shortDesc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Paginasi: tautan biasa, jadi bisa dibuka di tab baru, di-crawl,
              dan tetap jalan tanpa JavaScript. */}
          {totalPages > 1 ? (
            <nav aria-label="Paginasi proyek" className="mt-16">
              <ul className="flex flex-wrap items-center justify-center gap-2">
                <li>
                  {page > 1 ? (
                    <Link
                      href={buildHref({ q, tag, page: page - 1 })}
                      rel="prev"
                      className="flex min-h-11 items-center px-4 text-sm tracking-wide hover:opacity-70"
                    >
                      Previous
                    </Link>
                  ) : (
                    <span className="flex min-h-11 items-center px-4 text-sm tracking-wide opacity-40">
                      Previous
                    </span>
                  )}
                </li>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (n) => (
                    <li key={n}>
                      <Link
                        href={buildHref({ q, tag, page: n })}
                        aria-current={n === page ? "page" : undefined}
                        aria-label={`Halaman ${n}`}
                        className={`flex h-11 w-11 items-center justify-center text-sm tabular-nums ${
                          n === page
                            ? "border-foreground border-b font-medium"
                            : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        {n}
                      </Link>
                    </li>
                  ),
                )}

                <li>
                  {page < totalPages ? (
                    <Link
                      href={buildHref({ q, tag, page: page + 1 })}
                      rel="next"
                      className="flex min-h-11 items-center px-4 text-sm tracking-wide hover:opacity-70"
                    >
                      Next
                    </Link>
                  ) : (
                    <span className="flex min-h-11 items-center px-4 text-sm tracking-wide opacity-40">
                      Next
                    </span>
                  )}
                </li>
              </ul>
            </nav>
          ) : null}
        </div>
      </section>

      {/* CTA */}
      <section className="border-border/40 border-t px-6 py-24 lg:px-12">
        <div className="reveal-on-scroll container mx-auto max-w-3xl text-center">
          <h3 className="mb-6 text-4xl font-medium tracking-tight">
            Interested in working together?
          </h3>
          <p className="text-muted-foreground mb-10 text-xl">
            I&apos;m always open to discussing new projects and opportunities.
          </p>
          <Button
            size="lg"
            className="bg-foreground text-background hover:bg-foreground/90 rounded-none px-8 py-6 text-base tracking-wide"
            asChild
          >
            <Link href="/#contact">Get in Touch</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}

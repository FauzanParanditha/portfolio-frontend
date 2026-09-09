import { GithubIcon } from "@/components/icons/BrandIcons";
import { ScreenshotGallery } from "@/components/projects/ScreenshotGallery";
import { Button } from "@/components/ui/button";
import { canOptimizeImage } from "@/lib/imageHosts";
import { getProjectBySlug } from "@/lib/server/portfolio";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

/**
 * Halaman detail proyek — komponen SERVER.
 *
 * Sebelumnya `"use client"` dengan SWR. Akibatnya HTML-nya (16,7 KB) memuat
 * metadata saja: judul dan og:description benar, tapi deskripsi panjang,
 * challenge, solution, technical details, dan daftar fitur NOL kemunculan.
 * Justru bagian itu yang paling menunjukkan cara berpikir sebagai engineer,
 * dan justru itu yang tidak terbaca crawler.
 *
 * Sekaligus menghapus pengambilan data ganda: `layout.tsx` sudah mengambil
 * proyek di server untuk `generateMetadata`, lalu halaman ini mengambilnya lagi
 * di browser. Keduanya sekarang memakai `getProjectBySlug`, dan karena URL serta
 * opsinya sama, cache `fetch` Next menyatukannya jadi satu permintaan.
 *
 * Yang tersisa sebagai klien hanya galeri screenshot (lightbox) —
 * lihat ScreenshotGallery.
 */

// Data proyek jarang berubah; segarkan tiap 5 menit seperti halaman lain.
export const revalidate = 300;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);

  // Slug tak dikenal -> 404 sungguhan, bukan halaman 200 bertulisan
  // "Project not found". Yang lama membuat mesin pencari mengindeks halaman
  // kosong sebagai halaman sah.
  if (!project) notFound();

  // API mengembalikan objek {imageUrl, sortOrder}; galeri hanya butuh URL-nya,
  // diurutkan sesuai sortOrder.
  const screenshots = (project.screenshots ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => s.imageUrl)
    .filter(Boolean);
  const technologies = project.tags?.map((t) => t.name) ?? [];
  const technicalDetails = Object.entries(
    project.technicalDetails ?? {},
  ).filter(([, value]) => value);
  const features = project.features ?? [];
  const results = project.results ?? [];

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Header */}
      <header className="bg-background/80 sticky top-0 z-40 py-6 backdrop-blur-md">
        <div className="container mx-auto flex items-center justify-between px-6 lg:px-12">
          {/* Dulu <Button onClick={router.push()}> — sekarang tautan sungguhan:
              bisa dibuka di tab baru, di-crawl, dan tidak butuh JavaScript. */}
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 transition-opacity hover:bg-transparent hover:opacity-70"
            asChild
          >
            <Link href="/projects">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Projects
            </Link>
          </Button>

          <div className="flex gap-4">
            {project.repoUrl ? (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-2 text-sm font-medium tracking-wide opacity-70 transition-opacity hover:opacity-100"
              >
                <GithubIcon className="h-4 w-4" aria-hidden="true" /> Code
              </a>
            ) : null}
            {project.demoUrl ? (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center gap-2 text-sm font-medium tracking-wide opacity-70 transition-opacity hover:opacity-100"
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" /> Live
                Demo
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 py-20 lg:px-12 lg:py-32">
        <div className="container mx-auto">
          <div className="rise-in flex flex-col justify-between gap-12 md:flex-row md:items-end">
            <div className="max-w-3xl">
              {project.category ? (
                <span className="text-muted-foreground mb-6 inline-block text-sm tracking-widest uppercase">
                  {project.category}
                </span>
              ) : null}
              <h1 className="mb-8 text-5xl font-medium tracking-tight md:text-7xl lg:text-8xl">
                {project.title}
              </h1>
              <p className="text-muted-foreground text-xl leading-relaxed md:text-2xl">
                {project.longDescription}
              </p>
            </div>

            <div className="text-foreground/80 flex flex-col gap-4 text-sm tracking-wide md:min-w-[200px]">
              {project.timeline ? (
                <div className="border-border/40 flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-xs uppercase">
                    Timeline
                  </span>
                  <span>{project.timeline}</span>
                </div>
              ) : null}
              {project.role ? (
                <div className="border-border/40 flex justify-between border-b pb-2">
                  <span className="text-muted-foreground text-xs uppercase">
                    Role
                  </span>
                  <span>{project.role}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {/* Cover */}
      {project.coverImageUrl ? (
        <section className="px-6 pb-24 lg:px-12">
          <div className="container mx-auto">
            <div className="bg-muted/20 relative aspect-video w-full overflow-hidden md:aspect-21/9">
              {/* Lapisan gambar diperbesar melebihi bingkai lalu digeser
                  mengikuti posisi gulir. Hanya lapisan dekoratif yang bergerak;
                  judul tidak, karena teks ber-parallax menyulitkan pembacaan
                  dan memicu mabuk gerak. */}
              <div className="parallax-slow absolute inset-x-0 -inset-y-[8%]">
                <Image
                  src={project.coverImageUrl}
                  alt={project.title}
                  className="h-full w-full object-cover"
                  width={1920}
                  height={1080}
                  sizes="100vw"
                  priority
                  unoptimized={!canOptimizeImage(project.coverImageUrl)}
                />
              </div>
            </div>

            {technologies.length > 0 ? (
              <div className="text-muted-foreground mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm tracking-widest uppercase">
                {technologies.map((tech, index) => (
                  <span key={tech + index}>{tech}</span>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Case study */}
      {project.challenge || project.solution || results.length > 0 ? (
        <section className="bg-muted/10 px-6 py-24 lg:px-12">
          <div className="container mx-auto max-w-5xl">
            <h2 className="reveal-on-scroll mb-16 text-3xl font-medium tracking-tight md:text-5xl">
              Case Study
            </h2>

            <div className="grid gap-16 md:grid-cols-2">
              {project.challenge ? (
                <div className="reveal-on-scroll">
                  <h3 className="mb-6 text-xl font-medium">The Challenge</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {project.challenge}
                  </p>
                </div>
              ) : null}

              {project.solution ? (
                <div className="reveal-on-scroll">
                  <h3 className="mb-6 text-xl font-medium">The Solution</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {project.solution}
                  </p>
                </div>
              ) : null}
            </div>

            {results.length > 0 ? (
              <div className="mt-24">
                <h3 className="mb-8 text-2xl font-medium tracking-tight">
                  Key Results
                </h3>
                <div className="grid gap-6 md:grid-cols-2">
                  {results.map((result, index) => (
                    <div
                      key={result + index}
                      className="reveal-on-scroll border-border/40 flex gap-4 border-t pt-6"
                    >
                      <span className="text-muted-foreground text-sm tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="text-lg leading-relaxed">{result}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* Galeri — grid dirender di HTML, lightbox-nya yang butuh klien */}
      {screenshots.length > 0 ? (
        <section className="px-6 py-24 lg:px-12">
          <div className="container mx-auto">
            <h2 className="reveal-on-scroll mb-16 text-center text-3xl font-medium tracking-tight">
              Gallery
            </h2>
            <ScreenshotGallery
              screenshots={screenshots}
              projectTitle={project.title}
            />
          </div>
        </section>
      ) : null}

      {/* Spesifikasi & fitur */}
      {technicalDetails.length > 0 || features.length > 0 ? (
        <section className="border-border/40 bg-muted/10 border-t border-b px-6 py-24 lg:px-12">
          <div className="container mx-auto max-w-6xl">
            <div className="grid gap-16 lg:grid-cols-2">
              {technicalDetails.length > 0 ? (
                <div>
                  <h2 className="reveal-on-scroll mb-8 text-2xl font-medium tracking-tight">
                    Technical Specs
                  </h2>
                  <div className="flex flex-col">
                    {technicalDetails.map(([key, value]) => (
                      <div
                        key={key}
                        className="reveal-on-scroll border-border/40 flex flex-col gap-2 border-b py-4 sm:flex-row sm:gap-8"
                      >
                        <span className="text-muted-foreground min-w-[140px] text-xs tracking-widest uppercase">
                          {key}
                        </span>
                        <span className="text-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {features.length > 0 ? (
                <div>
                  <h2 className="reveal-on-scroll mb-8 text-2xl font-medium tracking-tight">
                    Key Features
                  </h2>
                  <div className="flex flex-col gap-4">
                    {features.map((feature, index) => (
                      <div
                        key={feature.text + index}
                        className="reveal-on-scroll flex items-start gap-4"
                      >
                        <span className="text-muted-foreground mt-1 text-sm tabular-nums opacity-50">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="text-lg">{feature.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {/* CTA */}
      <section className="px-6 py-32 lg:px-12">
        <div className="reveal-on-scroll container mx-auto max-w-3xl text-center">
          <h3 className="mb-6 text-4xl font-medium tracking-tight">
            Interested in similar solutions?
          </h3>
          <p className="text-muted-foreground mb-10 text-xl">
            Let&apos;s discuss how I can help bring your ideas to life.
          </p>
          <div className="flex flex-col justify-center gap-6 sm:flex-row">
            <Button
              size="lg"
              variant="link"
              className="h-auto p-0 text-lg underline-offset-8"
              asChild
            >
              <Link href="/projects">&larr; View More Works</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

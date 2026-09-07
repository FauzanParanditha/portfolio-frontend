"use client";

import { ProjectImage } from "@/components/ProjectImage";
import { Button } from "@/components/ui/button";
import type { Project } from "@/types/portfolio";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useRef } from "react";

import Link from "next/link";

/**
 * Daftar proyek unggulan di beranda.
 *
 * Datanya kini datang sebagai prop dari komponen server (lihat
 * `src/lib/server/portfolio.ts`), bukan lagi diambil SWR di browser — sehingga
 * judul, deskripsi, dan tag setiap proyek sudah ada di HTML pertama. Komponen
 * ini tetap "use client" karena animasi reveal-nya, tapi tidak lagi menahan
 * isi apa pun di balik permintaan jaringan.
 */
export const ProjectsSection = ({ projects }: { projects: Project[] }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
  };

  return (
    <section
      ref={ref}
      className="border-thin w-full border-b bg-zinc-950 pt-32 pb-16"
      id="projects"
      aria-labelledby="projects-heading"
    >
      <div className="container mx-auto px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex flex-col gap-16"
        >
          {/* Header */}
          <motion.div
            variants={itemVariants}
            className="border-thin flex items-end justify-between border-b pb-8"
          >
            <h2 id="projects-heading" className="section-title">
              Selected <br /> Works
            </h2>
            <div className="eyebrow hidden md:block">[ RECENT PROJECTS ]</div>
          </motion.div>

          {projects.length === 0 && (
            <p className="eyebrow">No featured works available.</p>
          )}

          {/* Projects Grid */}
          {projects.length > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-2"
            >
              {projects.map((project, index) => {
                const technologies = project.tags?.map((t) => t.name) ?? [];

                return (
                  <motion.div
                    key={project.id}
                    variants={itemVariants}
                    className="group relative flex flex-col gap-6"
                  >
                    {/* Project Image */}
                    <Link
                      href={`/projects/${project.slug}`}
                      className="border-thin relative block aspect-4/3 overflow-hidden border"
                    >
                      <ProjectImage
                        src={project.coverImageUrl}
                        alt={project.title}
                        // Grid 1 kolom di ponsel, 2 kolom mulai md — dipakai
                        // browser untuk memilih ukuran berkas yang diunduh.
                        sizes="(min-width: 768px) 50vw, 100vw"
                        className="object-cover grayscale transition-all duration-700 ease-[0.16_1_0.3_1] group-hover:scale-105 group-hover:grayscale-0"
                      />
                    </Link>

                    {/* Metadata & Details */}
                    <div className="border-thin flex flex-col gap-4 border-b pb-6">
                      <div className="flex items-start justify-between">
                        <Link href={`/projects/${project.slug}`}>
                          <h3 className="flex items-center gap-2 text-2xl font-bold tracking-tight uppercase transition-colors hover:opacity-70 md:text-3xl">
                            {project.title}
                            <ArrowUpRight
                              className="h-5 w-5 -translate-x-2 translate-y-2 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
                              aria-hidden="true"
                            />
                          </h3>
                        </Link>
                        <span className="eyebrow tabular-nums">
                          (0{index + 1})
                        </span>
                      </div>

                      <p className="text-sm leading-relaxed text-zinc-400 md:text-base">
                        {project.shortDesc}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {technologies.slice(0, 4).map((tech) => (
                          <span
                            key={tech}
                            className="border-thin border px-2 py-1 font-mono text-[10px] tracking-widest uppercase md:text-xs"
                          >
                            {tech}
                          </span>
                        ))}
                        {technologies.length > 4 && (
                          <span className="border-thin border px-2 py-1 font-mono text-[10px] tracking-widest uppercase md:text-xs">
                            +{technologies.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          )}

          {/* View All Button */}
          <motion.div
            variants={itemVariants}
            className="mt-8 flex justify-center"
          >
            <Button
              variant="outline"
              size="lg"
              className="border-thin hover:bg-foreground hover:text-background"
              asChild
            >
              <Link href="/projects">Index of All Works</Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

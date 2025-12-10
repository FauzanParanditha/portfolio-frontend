"use client";

import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/use-projects";
import { motion, useInView } from "framer-motion";
import { Github } from "lucide-react";
import { useRef, useState } from "react";

export const ProjectsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [hoveredProject, setHoveredProject] = useState<number | string | null>(
    null,
  );

  const { projects, isLoading, isError } = useProjects({ featured: true });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  return (
    <section ref={ref} className="px-6 py-20" id="projects">
      <div className="container mx-auto">
        {/* Header */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mb-16 text-center"
        >
          <motion.h2
            variants={itemVariants}
            className="mb-6 bg-gradient-primary bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
          >
            Featured Projects
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mx-auto max-w-2xl text-lg text-muted-foreground"
          >
            A showcase of my recent work, featuring modern web applications
            built with cutting-edge technologies and best practices.
          </motion.p>
        </motion.div>

        {/* State loading / error / empty */}
        {isLoading && (
          <p className="text-center text-sm text-muted-foreground">
            Loading projects...
          </p>
        )}

        {isError && !isLoading && (
          <p className="text-center text-sm text-red-500">
            Gagal memuat data project.
          </p>
        )}

        {!isLoading && !isError && projects.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Belum ada project yang ditandai sebagai featured.
          </p>
        )}

        {/* Grid projects */}
        {!isLoading && !isError && projects.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate={isInView ? "visible" : "hidden"}
            className="grid grid-cols-1 gap-8 lg:grid-cols-2 xl:grid-cols-3"
          >
            {projects.map((project) => {
              const technologies = project.tags?.map((t) => t.name) ?? [];
              const features = project.features?.map((f) => f.text) ?? [];

              return (
                <motion.div
                  key={project.id}
                  variants={itemVariants}
                  onHoverStart={() => setHoveredProject(project.id)}
                  onHoverEnd={() => setHoveredProject(null)}
                  className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-500 hover:shadow-glow"
                >
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden">
                    <motion.img
                      src={project.coverImageUrl}
                      alt={project.title}
                      className="h-full w-full object-cover"
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <h3 className="mb-3 text-xl font-bold transition-colors group-hover:text-primary">
                      {project.title}
                    </h3>

                    <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                      {project.shortDesc}
                    </p>

                    {/* Features */}
                    {features.length > 0 && (
                      <div className="mb-4">
                        <h4 className="mb-2 text-sm font-semibold">
                          Key Features:
                        </h4>
                        <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          {features.map((feature) => (
                            <div
                              key={feature}
                              className="flex items-center gap-1"
                            >
                              <span className="text-primary">●</span>
                              {feature}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Technologies */}
                    {technologies.length > 0 && (
                      <div className="mb-4 flex flex-wrap gap-2">
                        {technologies.map((tech) => (
                          <span
                            key={tech}
                            className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Animated border gradient */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: hoveredProject === project.id ? 1 : 0,
                    }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 -z-10 rounded-xl bg-gradient-primary opacity-20 blur-sm"
                  />
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Tombol lihat semua */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mt-12 text-center"
        >
          <Button
            variant="outline"
            size="lg"
            className="border-primary"
            asChild
          >
            <a href="/projects">
              <Github className="mr-2 h-5 w-5" />
              View All Projects
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

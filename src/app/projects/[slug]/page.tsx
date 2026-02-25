"use client";

import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/use-project";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Github,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const ProjectDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const slugParam = params?.slug;
  const slug =
    typeof slugParam === "string"
      ? slugParam
      : Array.isArray(slugParam)
        ? slugParam[0]
        : "";

  const { project, isLoading, isError } = useProject(slug);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-6 py-16">
        <div className="container mx-auto">
          <p className="text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  // Error / not found
  if (isError || !project) {
    return (
      <div className="min-h-screen bg-background px-6 py-16">
        <div className="container mx-auto space-y-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => router.push("/projects")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
          <p className="text-red-500">Project not found.</p>
        </div>
      </div>
    );
  }

  const screenshots = project.screenshots ?? [];
  const hasScreenshots = screenshots.length > 0;

  const nextImage = () => {
    if (!hasScreenshots || selectedImage === null) return;
    setSelectedImage((selectedImage + 1) % screenshots.length);
  };

  const prevImage = () => {
    if (!hasScreenshots || selectedImage === null) return;
    setSelectedImage(
      (selectedImage - 1 + screenshots.length) % screenshots.length,
    );
  };

  const technologies = project.tags?.map((t) => t.name) ?? [];

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-40 bg-background/80 py-6 backdrop-blur-md"
      >
        <div className="container mx-auto flex items-center justify-between px-6 lg:px-12">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 transition-opacity hover:bg-transparent hover:opacity-70"
            onClick={() => router.push("/projects")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
          <div className="flex gap-4">
            {project.repoUrl && (
              <a
                href={project.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium tracking-wide opacity-70 transition-opacity hover:opacity-100"
              >
                <Github className="h-4 w-4" /> Code
              </a>
            )}
            {project.demoUrl && (
              <a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-medium tracking-wide opacity-70 transition-opacity hover:opacity-100"
              >
                <ExternalLink className="h-4 w-4" /> Live Demo
              </a>
            )}
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="px-6 py-20 lg:px-12 lg:py-32">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col justify-between gap-12 md:flex-row md:items-end"
          >
            <div className="max-w-3xl">
              {project.category && (
                <span className="mb-6 inline-block text-sm uppercase tracking-widest text-muted-foreground">
                  {project.category}
                </span>
              )}
              <h1 className="mb-8 text-5xl font-medium tracking-tight md:text-7xl lg:text-8xl">
                {project.title}
              </h1>
              <p className="text-xl leading-relaxed text-muted-foreground md:text-2xl">
                {project.longDescription}
              </p>
            </div>

            <div className="flex flex-col gap-4 text-sm tracking-wide text-foreground/80 md:min-w-[200px]">
              {project.timeline && (
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-xs uppercase text-muted-foreground">
                    Timeline
                  </span>
                  <span>{project.timeline}</span>
                </div>
              )}
              {project.role && (
                <div className="flex justify-between border-b border-border/40 pb-2">
                  <span className="text-xs uppercase text-muted-foreground">
                    Role
                  </span>
                  <span>{project.role}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Image */}
      {project.coverImageUrl && (
        <section className="px-6 pb-24 lg:px-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="container mx-auto"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted/20 md:aspect-[21/9]">
              <Image
                src={project.coverImageUrl}
                alt={project.title}
                className="h-full w-full object-cover"
                width={1920}
                height={1080}
                priority
              />
            </div>

            {/* Technologies (tags) Minimalist */}
            {technologies.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm uppercase tracking-widest text-muted-foreground">
                {technologies.map((tech, index) => (
                  <span key={tech + index}>{tech}</span>
                ))}
              </div>
            )}
          </motion.div>
        </section>
      )}

      {/* Case Study */}
      <section className="bg-muted/10 px-6 py-24 lg:px-12">
        <div className="container mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 text-3xl font-medium tracking-tight md:text-5xl"
          >
            Case Study
          </motion.h2>

          <div className="grid gap-16 md:grid-cols-2">
            {/* Challenge */}
            {project.challenge && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="prose prose-lg dark:prose-invert"
              >
                <h3 className="mb-6 text-xl font-medium">The Challenge</h3>
                <p className="leading-relaxed text-muted-foreground">
                  {project.challenge}
                </p>
              </motion.div>
            )}

            {/* Solution */}
            {project.solution && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="prose prose-lg dark:prose-invert"
              >
                <h3 className="mb-6 text-xl font-medium">The Solution</h3>
                <p className="leading-relaxed text-muted-foreground">
                  {project.solution}
                </p>
              </motion.div>
            )}
          </div>

          {/* Results */}
          {project.results && project.results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-24"
            >
              <h3 className="mb-8 text-2xl font-medium tracking-tight">
                Key Results
              </h3>
              <div className="grid gap-6 md:grid-cols-2">
                {project.results.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex gap-4 border-t border-border/40 pt-6"
                  >
                    <span className="text-sm text-muted-foreground">
                      0{index + 1}
                    </span>
                    <span className="text-lg leading-relaxed">{result}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Screenshot Gallery */}
      {hasScreenshots && (
        <section className="px-6 py-24 lg:px-12">
          <div className="container mx-auto">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16 text-center text-3xl font-medium tracking-tight"
            >
              Gallery
            </motion.h2>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {screenshots.map((screenshot, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => setSelectedImage(index)}
                  className="group relative aspect-[4/3] cursor-pointer overflow-hidden bg-muted/20"
                >
                  <Image
                    src={screenshot}
                    alt={`${project.title} screenshot ${index + 1}`}
                    className="h-full w-full object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
                    fill
                  />
                  <div className="absolute inset-0 z-10 bg-background/0 transition-colors group-hover:bg-background/10" />
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {hasScreenshots && selectedImage !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4 md:p-12"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute right-6 top-6 z-50 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-8 w-8 text-foreground/50 hover:text-foreground" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="fixed left-6 top-1/2 z-50 hidden -translate-y-1/2 text-foreground/50 hover:text-foreground md:block"
            >
              <ChevronLeft className="h-10 w-10" />
            </button>

            <motion.div
              className="relative flex h-full w-full items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <motion.img
                key={selectedImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                src={screenshots[selectedImage]}
                alt={`${project.title} screenshot`}
                className="max-h-full max-w-full object-contain"
              />
            </motion.div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="fixed right-6 top-1/2 z-50 hidden -translate-y-1/2 text-foreground/50 hover:text-foreground md:block"
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {(project.technicalDetails ||
        (project.features && project.features.length > 0)) && (
        <section className="border-b border-t border-border/40 bg-muted/10 px-6 py-24 lg:px-12">
          <div className="container mx-auto max-w-6xl">
            <div className="grid gap-16 lg:grid-cols-2">
              {/* Technical Details */}
              {project.technicalDetails && (
                <div>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-8 text-2xl font-medium tracking-tight"
                  >
                    Technical Specs
                  </motion.h2>
                  <div className="flex flex-col">
                    {Object.entries(project.technicalDetails).map(
                      ([key, value], index) => (
                        <motion.div
                          key={key}
                          initial={{ opacity: 0, y: 10 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.1 }}
                          className="flex flex-col gap-2 border-b border-border/40 py-4 sm:flex-row sm:gap-8"
                        >
                          <span className="min-w-[140px] text-xs uppercase tracking-widest text-muted-foreground">
                            {key}
                          </span>
                          <span className="text-foreground">{value}</span>
                        </motion.div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {/* Features */}
              {project.features && project.features.length > 0 && (
                <div>
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="mb-8 text-2xl font-medium tracking-tight"
                  >
                    Key Features
                  </motion.h2>
                  <div className="flex flex-col gap-4">
                    {project.features.map((feature, index) => (
                      <motion.div
                        key={feature.text + index}
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-4"
                      >
                        <span className="mt-1 text-sm text-muted-foreground opacity-50">
                          0{index + 1}
                        </span>
                        <span className="text-lg">{feature.text}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-6 py-32 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="container mx-auto max-w-3xl text-center"
        >
          <h3 className="mb-6 text-4xl font-medium tracking-tight">
            Interested in similar solutions?
          </h3>
          <p className="mb-10 text-xl text-muted-foreground">
            Let&apos;s discuss how I can help bring your ideas to life.
          </p>
          <div className="flex flex-col justify-center gap-6 sm:flex-row">
            <Link href="/projects">
              <Button
                size="lg"
                variant="link"
                className="h-auto p-0 text-lg underline-offset-8"
              >
                ← View More Works
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default ProjectDetailPage;

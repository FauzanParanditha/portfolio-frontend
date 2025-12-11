"use client";

import { Button } from "@/components/ui/button";
import { useProject } from "@/hooks/use-project";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Github,
  User,
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-lg"
      >
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => router.push("/projects")}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Button>
          <div className="flex gap-2">
            {project.repoUrl && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Github className="mr-2 h-4 w-4" />
                  Code
                </a>
              </Button>
            )}
            {project.demoUrl && (
              <Button size="sm" asChild>
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Live Demo
                </a>
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-16">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <div className="container relative mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-4xl text-center"
          >
            {project.category && (
              <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                {project.category}
              </span>
            )}
            <h1 className="mb-6 bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-4xl font-bold text-transparent md:text-6xl">
              {project.title}
            </h1>
            <p className="mb-8 text-lg leading-relaxed text-muted-foreground">
              {project.longDescription}
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              {project.timeline && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{project.timeline}</span>
                </div>
              )}
              {project.role && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  <span>{project.role}</span>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Main Image */}
      {project.coverImageUrl && (
        <section className="px-6 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="container mx-auto max-w-5xl"
          >
            <div className="relative overflow-hidden rounded-2xl border border-border shadow-2xl shadow-primary/10">
              <Image
                src={project.coverImageUrl}
                alt={project.title}
                className="h-auto w-full object-cover"
                width={1200}
                height={600}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent" />
            </div>
          </motion.div>
        </section>
      )}

      {/* Technologies (tags) */}
      {technologies.length > 0 && (
        <section className="px-6 pb-16">
          <div className="container mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-wrap justify-center gap-3"
            >
              {technologies.map((tech, index) => (
                <motion.span
                  key={tech + index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {tech}
                </motion.span>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Case Study */}
      <section className="bg-card/50 px-6 py-16">
        <div className="container mx-auto max-w-5xl">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-12 text-center text-3xl font-bold"
          >
            Case Study
          </motion.h2>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Challenge */}
            {project.challenge && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="rounded-xl border border-border bg-background p-8"
              >
                <h3 className="mb-4 text-xl font-bold text-primary">
                  The Challenge
                </h3>
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
                className="rounded-xl border border-border bg-background p-8"
              >
                <h3 className="mb-4 text-xl font-bold text-primary">
                  The Solution
                </h3>
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
              className="mt-8 rounded-xl border border-border bg-background p-8"
            >
              <h3 className="mb-6 text-xl font-bold text-primary">
                Key Results
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {project.results.map((result, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3"
                  >
                    <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                    <span className="text-muted-foreground">{result}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Screenshot Gallery */}
      {hasScreenshots && (
        <section className="px-6 py-16">
          <div className="container mx-auto max-w-5xl">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center text-3xl font-bold"
            >
              Screenshots
            </motion.h2>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {screenshots.map((screenshot, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ y: -5 }}
                  onClick={() => setSelectedImage(index)}
                  className="cursor-pointer overflow-hidden rounded-xl border border-border shadow-lg transition-all hover:shadow-xl hover:shadow-primary/10"
                >
                  <Image
                    src={screenshot}
                    alt={`${project.title} screenshot ${index + 1}`}
                    className="h-48 w-full object-cover"
                    width={400}
                    height={300}
                  />
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
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"
            onClick={() => setSelectedImage(null)}
          >
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute right-6 top-6 rounded-full border border-border bg-card p-2 transition-colors hover:bg-accent"
            >
              <X className="h-6 w-6" />
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-6 rounded-full border border-border bg-card p-2 transition-colors hover:bg-accent"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <motion.img
              key={selectedImage}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={screenshots[selectedImage]}
              alt={`${project.title} screenshot`}
              className="max-h-[80vh] max-w-full rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-6 rounded-full border border-border bg-card p-2 transition-colors hover:bg-accent"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Technical Details */}
      {project.technicalDetails && (
        <section className="bg-card/50 px-6 py-16">
          <div className="container mx-auto max-w-5xl">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center text-3xl font-bold"
            >
              Technical Implementation
            </motion.h2>

            <div className="grid gap-4">
              {Object.entries(project.technicalDetails).map(
                ([key, value], index) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex flex-col gap-2 rounded-xl border border-border bg-background p-6 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <span className="min-w-[120px] font-semibold capitalize text-primary">
                      {key}:
                    </span>
                    <span className="text-muted-foreground">{value}</span>
                  </motion.div>
                ),
              )}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      {project.features && project.features.length > 0 && (
        <section className="px-6 py-16">
          <div className="container mx-auto max-w-5xl">
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center text-3xl font-bold"
            >
              Key Features
            </motion.h2>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {project.features.map((feature, index) => (
                <motion.div
                  key={feature.text + index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="rounded-xl border border-border bg-card p-6 text-center transition-colors hover:border-primary"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <span className="font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="container mx-auto max-w-3xl text-center"
        >
          <h3 className="mb-4 text-2xl font-bold">
            Interested in similar solutions?
          </h3>
          <p className="mb-8 text-muted-foreground">
            Let&apos;s discuss how I can help bring your ideas to life.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/#contact">
              <Button size="lg">Get in Touch</Button>
            </Link>
            <Link href="/projects">
              <Button size="lg" variant="outline">
                View More Projects
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </div>
  );
};

export default ProjectDetailPage;

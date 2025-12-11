"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ExternalLink, Eye, Github, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useProjects } from "@/hooks/use-projects";

const PROJECTS_PER_PAGE = 6;

const Projects = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch data from API
  const { projects, meta, isLoading, isError } = useProjects({
    page: currentPage,
    limit: PROJECTS_PER_PAGE,
    q: searchQuery.length > 0 ? searchQuery : undefined,
  });

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
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  // Category from backend tags
  const categories = useMemo(() => {
    const tags = new Set<string>();

    projects.forEach((p) => {
      p.tags.forEach((t) => tags.add(t.name));
    });

    return ["All", ...Array.from(tags)];
  }, [projects]);

  // Filter based on category
  const filteredProjects = useMemo(() => {
    if (activeCategory === "All") return projects;

    return projects.filter((p) =>
      p.tags.some((t) => t.name === activeCategory),
    );
  }, [projects, activeCategory]);

  const totalPages = meta?.total
    ? Math.ceil(meta.total / PROJECTS_PER_PAGE)
    : 1;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg"
      >
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-xl font-bold text-transparent">
            All Projects
          </h1>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="px-6 py-16">
        <div className="container mx-auto text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 bg-gradient-to-r from-primary via-blue-500 to-primary bg-clip-text text-4xl font-bold text-transparent md:text-6xl"
          >
            My Projects
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto max-w-2xl text-lg text-muted-foreground"
          >
            A comprehensive collection of my work, showcasing various
            technologies and solutions across different domains.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mx-auto mt-8 max-w-md"
          >
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search projects or technologies..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="rounded-full border-border bg-card py-6 pl-10 pr-10"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </motion.div>

          {/* Category Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-6 flex flex-wrap justify-center gap-2"
          >
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => handleCategoryChange(category)}
                className={`rounded-full transition-all ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "border-border hover:border-primary hover:text-primary"
                }`}
              >
                {category}
              </Button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="px-6 py-12">
        <div className="container mx-auto">
          {isLoading && (
            <p className="py-16 text-center text-muted-foreground">
              Loading projects...
            </p>
          )}

          {isError && (
            <p className="py-16 text-center text-red-500">
              Error loading projects.
            </p>
          )}

          {!isLoading && filteredProjects.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-16 text-center"
            >
              <p className="text-lg text-muted-foreground">
                No projects found.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  handleSearchChange("");
                  handleCategoryChange("All");
                }}
              >
                Clear Filters
              </Button>
            </motion.div>
          )}

          {/* Projects */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3"
          >
            <AnimatePresence mode="popLayout">
              {!isLoading &&
                filteredProjects.map((project) => (
                  <motion.div
                    key={project.id}
                    layout
                    variants={itemVariants}
                    initial="hidden"
                    animate="visible"
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ y: -8 }}
                    className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-lg transition-all duration-500 hover:shadow-2xl hover:shadow-primary/10"
                  >
                    {/* Category badge = first tag */}
                    {project.tags.length > 0 && (
                      <div className="absolute left-4 top-4 z-10">
                        <span className="rounded-full bg-primary/90 px-3 py-1 text-xs font-medium text-primary-foreground">
                          {project.tags[0].name}
                        </span>
                      </div>
                    )}

                    {/* Image */}
                    <div className="relative h-52 overflow-hidden">
                      <motion.img
                        src={project.coverImageUrl || "/placeholder.jpg"}
                        alt={project.title}
                        className="h-full w-full object-cover"
                        whileHover={{ scale: 1.1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />

                      <Link
                        href={`/projects/${project.slug}`}
                        className="absolute inset-0 flex items-center justify-center gap-4 bg-gradient-to-t from-background via-background/50 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-background/90 backdrop-blur-sm"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </Link>
                    </div>

                    <div className="p-6">
                      <h3 className="mb-3 text-xl font-bold transition-colors group-hover:text-primary">
                        {project.title}
                      </h3>

                      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {project.shortDesc}
                      </p>

                      {/* Features */}
                      {project.features.length > 0 && (
                        <div className="mb-4 grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                          {project.features.map((f, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span className="text-primary">●</span>
                              {f.text}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Technologies */}
                      {project.tags.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-2">
                          {project.tags.map((t) => (
                            <span
                              key={t.id}
                              className="rounded bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                            >
                              {t.name}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-3">
                        {project.repoUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-1"
                          >
                            <a href={project.repoUrl} target="_blank">
                              <ExternalLink className="mr-2 h-4 w-4" />
                              Live Demo
                            </a>
                          </Button>
                        )}
                        {project.demoUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            asChild
                            className="flex-1"
                          >
                            <a href={project.demoUrl} target="_blank">
                              <Github className="mr-2 h-4 w-4" />
                              Source
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
            </AnimatePresence>
          </motion.div>

          {/* Pagination */}
          {totalPages > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-12"
            >
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      className={currentPage === 1 ? "opacity-50" : ""}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                    (page) => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ),
                  )}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      className={currentPage === totalPages ? "opacity-50" : ""}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Footer */}
      <section className="px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="container mx-auto text-center"
        >
          <h3 className="mb-4 text-2xl font-bold">
            Interested in working together?
          </h3>
          <p className="mb-6 text-muted-foreground">
            I&apos;m always open to discussing new projects and opportunities.
          </p>
          <Link href="/#contact">
            <Button size="lg" className="bg-primary hover:bg-primary/90">
              Get in Touch
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

export default Projects;

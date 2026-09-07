"use client";

import { ProjectCardOverlay } from "@/components/ProjectCardOverlay";
import { ProjectImage } from "@/components/ProjectImage";
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
import { GithubIcon } from "@/components/icons/BrandIcons";
import { ArrowLeft, ExternalLink, Search, X } from "lucide-react";
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

  const totalPages =
    meta?.totalPages ??
    (meta?.total ? Math.ceil(meta.total / PROJECTS_PER_PAGE) : 1);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    setCurrentPage(1);
  };

  return (
    <div className="bg-background min-h-screen font-sans">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-background/80 sticky top-0 z-50 py-6 backdrop-blur-md"
      >
        <div className="container mx-auto flex items-center justify-between px-6 lg:px-12">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 transition-opacity hover:bg-transparent hover:opacity-70"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <h1 className="text-xl font-medium tracking-tight">Projects</h1>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section className="px-6 py-20 lg:px-12 lg:py-32">
        <div className="container mx-auto">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8 max-w-4xl text-5xl font-medium tracking-tight md:text-7xl lg:text-8xl"
          >
            Selected Works
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-muted-foreground max-w-2xl text-lg md:text-xl"
          >
            A collection of digital experiences and solutions, focused on clean
            design and robust engineering.
          </motion.p>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mt-16 max-w-xl"
          >
            <Search className="text-muted-foreground absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search works..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="border-border focus-visible:border-primary rounded-none border-0 border-b bg-transparent px-0 py-6 pl-10 text-lg shadow-none focus-visible:ring-0"
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange("")}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-0 -translate-y-1/2 transition-colors"
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
            className="mt-12 flex flex-wrap gap-6"
          >
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`text-sm tracking-wide transition-all hover:opacity-100 ${
                  activeCategory === category
                    ? "border-foreground border-b pb-1 font-medium opacity-100"
                    : "opacity-60"
                }`}
              >
                {category}
              </button>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="px-6 pt-8 pb-24 lg:px-12">
        <div className="container mx-auto">
          {isLoading && (
            <p className="text-muted-foreground py-16 text-center">
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
              <p className="text-muted-foreground text-lg">
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
            className="grid grid-cols-1 gap-16 md:grid-cols-2 lg:gap-24"
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
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="group flex flex-col gap-6"
                  >
                    {/* Image */}
                    <Link
                      href={`/projects/${project.slug}`}
                      className="bg-muted/20 relative block aspect-4/3 overflow-hidden"
                    >
                      {/* Dulu jatuh ke "/placeholder.jpg" yang TIDAK ADA di
                          public/, jadi gambar rusak saat cover kosong.
                          ProjectImage memakai aset statis yang benar-benar ada. */}
                      <ProjectImage
                        src={project.coverImageUrl}
                        alt={project.title}
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                        className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-105 motion-reduce:transition-none"
                      />
                      <ProjectCardOverlay />
                    </Link>

                    {/* Content below image */}
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

                          {/* Tags/Category minimal style */}
                          {project.tags.length > 0 && (
                            <p className="text-muted-foreground mt-1 text-sm">
                              {project.tags.map((t) => t.name).join(" • ")}
                            </p>
                          )}
                        </div>

                        {/* Quick links */}
                        <div className="flex gap-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          {project.repoUrl && (
                            <a
                              href={project.repoUrl}
                              target="_blank"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="View Source"
                            >
                              <GithubIcon className="h-5 w-5" />
                            </a>
                          )}
                          {project.demoUrl && (
                            <a
                              href={project.demoUrl}
                              target="_blank"
                              className="text-muted-foreground hover:text-foreground"
                              aria-label="Live Demo"
                            >
                              <ExternalLink className="h-5 w-5" />
                            </a>
                          )}
                        </div>
                      </div>

                      <p className="text-muted-foreground line-clamp-2 max-w-md text-base opacity-80">
                        {project.shortDesc}
                      </p>
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
      <section className="border-border/40 border-t px-6 py-24 lg:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="container mx-auto max-w-3xl text-center"
        >
          <h3 className="mb-6 text-4xl font-medium tracking-tight">
            Interested in working together?
          </h3>
          <p className="text-muted-foreground mb-10 text-xl">
            I&apos;m always open to discussing new projects and opportunities.
          </p>
          <Link href="/#contact">
            <Button
              size="lg"
              className="bg-foreground text-background hover:bg-foreground/90 rounded-none px-8 py-6 text-base tracking-wide"
            >
              Get in Touch
            </Button>
          </Link>
        </motion.div>
      </section>
    </div>
  );
};

export default Projects;

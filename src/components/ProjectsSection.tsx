"use client";

import { Button } from "@/components/ui/button";
import { useProjects } from "@/hooks/use-projects";
import { motion, useInView } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { useRef, useState } from "react";

import taskManagerImg from "@/assets/project-taskmanager.jpg";
import Link from "next/link";

export const ProjectsSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });
  const [hoveredProject, setHoveredProject] = useState<string | null>(null);

  const { projects, isLoading, isError } = useProjects({ featured: true });

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
    <section ref={ref} className="w-full bg-background border-b border-thin pt-32 pb-16" id="projects">
      <div className="container mx-auto px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex flex-col gap-16"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="flex justify-between items-end border-b border-thin pb-8">
            <h2 className="text-display font-bold uppercase tracking-tight leading-[0.9]">
              Selected <br/> Works
            </h2>
            <div className="hidden md:block uppercase text-xs tracking-widest text-muted-foreground font-mono">
              [ RECENT PROJECTS ]
            </div>
          </motion.div>

          {isLoading && (
            <p className="text-sm font-mono uppercase tracking-widest">Loading records...</p>
          )}

          {isError && !isLoading && (
            <p className="text-sm font-mono uppercase tracking-widest text-red-500">Failed to load records.</p>
          )}

          {!isLoading && !isError && projects.length === 0 && (
            <p className="text-sm font-mono uppercase tracking-widest">No featured works available.</p>
          )}

          {/* Projects Grid */}
          {!isLoading && !isError && projects.length > 0 && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate={isInView ? "visible" : "hidden"}
              className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-16"
            >
              {projects.map((project, index) => {
                const technologies = project.tags?.map((t) => t.name) ?? [];

                return (
                  <motion.div
                    key={project.id}
                    variants={itemVariants}
                    onHoverStart={() => setHoveredProject(project.id)}
                    onHoverEnd={() => setHoveredProject(null)}
                    className="group relative flex flex-col gap-6"
                  >
                    {/* Project Image */}
                    <Link href={`/projects/${project.slug}`} className="block overflow-hidden border border-thin aspect-[4/3] relative">
                      <motion.img
                        src={project.coverImageUrl || taskManagerImg.src}
                        alt={project.title}
                        className="h-full w-full object-cover grayscale transition-all duration-700 ease-[0.16_1_0.3_1] group-hover:scale-105 group-hover:grayscale-0"
                      />
                    </Link>

                    {/* Metadata & Details */}
                    <div className="flex flex-col gap-4 border-b border-thin pb-6">
                      <div className="flex justify-between items-start">
                        <Link href={`/projects/${project.slug}`}>
                          <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-tight transition-colors hover:opacity-70 flex items-center gap-2">
                             {project.title}
                             <ArrowUpRight className="h-5 w-5 opacity-0 -translate-x-2 translate-y-2 group-hover:opacity-100 group-hover:translate-x-0 group-hover:translate-y-0 transition-all duration-300"/>
                          </h3>
                        </Link>
                        <span className="font-mono text-xs opacity-50 uppercase tracking-widest">(0{index + 1})</span>
                      </div>
                      
                      <p className="text-sm md:text-base leading-relaxed opacity-70">
                        {project.shortDesc}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-2">
                        {technologies.slice(0, 4).map((tech) => (
                           <span key={tech} className="border border-thin px-2 py-1 text-[10px] md:text-xs uppercase tracking-widest font-mono">
                             {tech}
                           </span>
                        ))}
                        {technologies.length > 4 && (
                          <span className="border border-thin px-2 py-1 text-[10px] md:text-xs uppercase tracking-widest font-mono">
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
              <Link href="/projects">
                Index of All Works
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

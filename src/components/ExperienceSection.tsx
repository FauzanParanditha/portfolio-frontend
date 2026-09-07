"use client";

import type { Experience } from "@/types/experience";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

/**
 * Riwayat pengalaman di beranda.
 *
 * Sama seperti ProjectsSection: data datang sebagai prop dari komponen server,
 * sudah terurut, sehingga seluruh isinya terkirim di HTML pertama.
 */
export const ExperienceSection = ({
  experiences,
}: {
  experiences: Experience[];
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
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
      className="border-thin w-full border-b bg-zinc-950 pt-32 pb-32"
      id="experience"
      aria-labelledby="experience-heading"
    >
      <div className="container mx-auto px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="flex flex-col gap-16"
        >
          {/* Section Header */}
          <motion.div
            variants={itemVariants}
            className="border-thin flex items-end justify-between border-b pb-8"
          >
            <h2 id="experience-heading" className="section-title">
              Experience
            </h2>
            <div className="eyebrow hidden md:block">[ CAREER PATH ]</div>
          </motion.div>

          {/* Experience List */}
          <div className="flex w-full flex-col">
            {experiences.map((exp, index) => (
              <motion.div
                key={exp.id}
                variants={itemVariants}
                className="group border-thin hover:bg-foreground hover:text-background -mx-6 flex flex-col items-start gap-8 border-b px-6 py-12 transition-colors duration-500 md:-mx-12 md:flex-row md:px-12"
              >
                {/* Index / Meta */}
                <div className="flex flex-col gap-4 md:w-1/4">
                  <span className="stat-num text-xs opacity-50">
                    (0{index + 1})
                  </span>
                  <div className="stat-num text-sm tracking-widest uppercase">
                    {exp.startDate} — <br />
                    {exp.isCurrent ? "Present" : "Finished"}
                  </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-col gap-6 md:w-3/4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:gap-4">
                    <h3 className="text-2xl font-bold tracking-tight uppercase md:text-4xl">
                      {exp.title}
                    </h3>
                    <span className="text-lg opacity-60 md:text-xl">
                      @ {exp.company}
                    </span>
                  </div>

                  <p className="max-w-3xl text-lg leading-relaxed opacity-80 md:text-xl">
                    {exp.description}
                  </p>

                  {/* Highlights */}
                  {(exp.highlights?.length ?? 0) > 0 && (
                    <ul className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      {(exp.highlights || []).map((item, i) => (
                        <li key={i} className="flex gap-4 opacity-70">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-current"></span>
                          <span className="text-sm md:text-base">
                            {item.text}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Tags */}
                  {(exp.tags?.length ?? 0) > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(exp.tags || []).map((tag) => (
                        <span
                          key={tag.id + tag.name}
                          className="rounded-full border border-current px-3 py-1 font-mono text-xs tracking-widest uppercase"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

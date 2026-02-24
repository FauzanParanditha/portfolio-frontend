"use client";

import { useExperiences } from "@/hooks/use-experiences";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export const ExperienceSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const { experiences, isLoading, isError } = useExperiences();

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
    <section ref={ref} className="w-full bg-background border-b border-thin pt-32 pb-32" id="experience">
      <div className="container mx-auto px-6">
        <motion.div
           variants={containerVariants}
           initial="hidden"
           animate={isInView ? "visible" : "hidden"}
           className="flex flex-col gap-16"
        >
          {/* Section Header */}
          <motion.div variants={itemVariants} className="flex justify-between items-end border-b border-thin pb-8">
            <h2 className="text-display font-bold uppercase tracking-tight leading-[0.9]">
              Experience
            </h2>
            <div className="hidden md:block uppercase text-xs tracking-widest text-muted-foreground font-mono">
              [ CAREER PATH ]
            </div>
          </motion.div>

          {/* Experience List */}
          <div className="flex flex-col w-full">
            {experiences.map((exp, index) => (
              <motion.div
                key={exp.id}
                variants={itemVariants}
                className="group flex flex-col md:flex-row border-b border-thin py-12 gap-8 items-start hover:bg-foreground hover:text-background transition-colors duration-500 px-6 -mx-6 md:px-12 md:-mx-12"
              >
                {/* Index / Meta */}
                <div className="md:w-1/4 flex flex-col gap-4">
                  <span className="font-mono text-xs opacity-50">(0{index + 1})</span>
                  <div className="font-mono text-sm uppercase tracking-widest">
                    {exp.startDate} — <br />
                    {exp.isCurrent ? "Present" : "Finished"}
                  </div>
                </div>

                {/* Main Content */}
                <div className="md:w-3/4 flex flex-col gap-6">
                  <div className="flex flex-col md:flex-row md:items-baseline gap-2 md:gap-4">
                    <h3 className="text-2xl md:text-4xl font-bold uppercase tracking-tight">
                      {exp.title}
                    </h3>
                    <span className="text-lg md:text-xl opacity-60">@ {exp.company}</span>
                  </div>

                  <p className="text-lg md:text-xl opacity-80 leading-relaxed max-w-3xl">
                    {exp.description}
                  </p>

                  {/* Highlights */}
                  {(exp.highlights?.length ?? 0) > 0 && (
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {(exp.highlights || []).map((item, i) => (
                        <li key={i} className="flex gap-4 opacity-70">
                           <span className="shrink-0 mt-1.5 w-1.5 h-1.5 bg-current rounded-full"></span>
                           <span className="text-sm md:text-base">{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Tags */}
                  {(exp.tags?.length ?? 0) > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {(exp.tags || []).map((tag) => (
                        <span
                          key={tag.id + tag.name}
                          className="border border-current px-3 py-1 text-xs uppercase tracking-widest font-mono rounded-full"
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

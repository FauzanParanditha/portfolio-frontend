"use client";

import { useExperiences } from "@/hooks/use-experiences";
import { motion, useInView } from "framer-motion";
import { Building, Calendar, MapPin } from "lucide-react";
import { useRef } from "react";

export const ExperienceSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const { experiences, isLoading, isError } = useExperiences();

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.3,
        duration: 0.6,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.6,
        ease: [0.4, 0, 0.2, 1] as const,
      },
    },
  };

  return (
    <section ref={ref} className="bg-card/30 px-6 py-20" id="experience">
      <div className="container mx-auto">
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
            Experience
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="mx-auto max-w-2xl text-lg text-muted-foreground"
          >
            My professional journey in web development, building scalable
            solutions and leading development teams.
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="relative"
        >
          {/* Timeline line */}
          <div className="absolute bottom-0 left-4 top-0 w-0.5 transform bg-primary/20 md:left-1/2 md:-translate-x-1/2" />

          {experiences.map((exp, index) => (
            <motion.div
              key={exp.id}
              variants={itemVariants}
              className={`relative mb-12 ${
                index % 2 === 0
                  ? "md:pr-1/2 md:text-right"
                  : "md:pl-1/2 md:ml-auto"
              }`}
            >
              {/* Timeline dot */}
              {/* <motion.div
                whileHover={{ scale: 1.2 }}
                className={`bg-primary border-background shadow-glow absolute h-4 w-4 rounded-full border-4 ${
                  index % 2 === 0
                    ? "left-2 md:left-auto md:right-0 md:-mr-2"
                    : "left-2 md:-ml-2"
                } top-8 z-10`}
              /> */}

              <motion.div
                whileHover={{
                  scale: 1.02,
                  transition: { duration: 0.2 },
                }}
                className="ml-8 rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-glow md:ml-0"
              >
                {/* Title + Company */}
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
                  <h3 className="text-xl font-bold text-primary">
                    {exp.title}
                  </h3>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Building className="h-4 w-4" />
                    <span>{exp.company}</span>
                  </div>
                </div>

                {/* Date + Location */}
                <div className="mb-4 flex flex-col gap-4 text-sm text-muted-foreground sm:flex-row">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {exp.startDate} – {exp.isCurrent ? "Present" : "Finished"}
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{exp.location}</span>
                  </div>
                </div>

                {/* Description */}
                <ul className="mb-4 space-y-2">{exp.description}</ul>

                {/* Highlights */}
                <div className="flex flex-wrap gap-2">
                  {exp.highlights.length > 0 && (
                    <ul className="mb-4 space-y-2">
                      {exp.highlights.map((item, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-muted-foreground"
                        >
                          <span className="mt-1.5 text-xs text-primary">●</span>
                          {item.text}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {exp.tags.map((tag) => (
                    <span
                      key={tag.id + tag.name}
                      className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

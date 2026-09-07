"use client";

import { motion, useInView } from "framer-motion";
import { Binary, Code, Database, Zap } from "lucide-react";
import { useRef } from "react";

export const AboutSection = () => {
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

  const skills = [
    {
      icon: Code,
      title: "Frontend",
      description: "React, TypeScript, Next.js, Tailwind",
    },
    {
      icon: Binary,
      title: "Backend",
      description: "Node.js, Express, Golang, RESTful APIs",
    },
    {
      icon: Database,
      title: "Database",
      description: "PostgreSQL, MongoDB, MySQL",
    },
    {
      icon: Zap,
      title: "DevOps",
      description: "Docker, Git, CI/CD",
    },
  ];

  return (
    <section
      ref={ref}
      className="border-thin w-full border-b bg-zinc-950 pt-32 pb-32"
      id="about"
      aria-labelledby="about-heading"
    >
      <div className="container mx-auto px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 gap-16 md:grid-cols-12"
        >
          {/* Section Header */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col justify-between md:col-span-5"
          >
            <h2 id="about-heading" className="section-title">
              About <br />
              (Me)
            </h2>
            <div className="eyebrow mt-16 hidden md:block">
              [ PROFILE & CAPABILITIES ]
            </div>
          </motion.div>

          {/* Section Content */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col gap-16 md:col-span-7"
          >
            <p className="text-xl leading-relaxed font-medium md:text-3xl">
              With over 5 years of experience in fullstack development, I build
              web applications that stay maintainable as they grow. I work
              across the stack — Go APIs, PostgreSQL, and Next.js interfaces —
              and care about clean architecture, versioned migrations, and tests
              that make refactoring safe.
            </p>

            {/* Capabilities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {skills.map((skill, index) => (
                <motion.div
                  key={skill.title}
                  variants={itemVariants}
                  className={`border-thin hover:bg-foreground hover:text-background flex flex-col gap-6 p-8 transition-colors duration-300 ${
                    index % 2 !== 0 ? "sm:border-l-0" : ""
                  } ${index > 1 ? "border-t-0" : ""}`}
                >
                  <div className="flex items-start justify-between">
                    <span className="stat-num text-xs opacity-50">
                      (0{index + 1})
                    </span>
                    <skill.icon className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-lg font-bold tracking-wider uppercase">
                      {skill.title}
                    </h3>
                    <p className="text-sm leading-relaxed opacity-70">
                      {skill.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

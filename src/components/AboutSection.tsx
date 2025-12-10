"use client";

import { motion, useInView } from "framer-motion";
import { Code, Database, Palette, Zap } from "lucide-react";
import { useRef } from "react";

export const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

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

  const skills = [
    {
      icon: Code,
      title: "Frontend Development",
      description: "React, TypeScript, Next.js, Tailwind CSS",
      color: "accent-blue",
    },
    {
      icon: Database,
      title: "Backend Development",
      description: "Node.js, Express, PostgreSQL, MongoDB",
      color: "accent-purple",
    },
    {
      icon: Palette,
      title: "UI/UX Design",
      description: "Figma, Adobe Creative Suite, Design Systems",
      color: "accent-pink",
    },
    {
      icon: Zap,
      title: "DevOps & Tools",
      description: "Docker, AWS, Git, CI/CD, Monitoring",
      color: "accent-orange",
    },
  ];

  return (
    <section ref={ref} className="px-6 py-20" id="about">
      <div className="container mx-auto">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mb-16 text-center"
        >
          <motion.h2
            variants={itemVariants}
            className="bg-gradient-primary mb-6 bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
          >
            About Me
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-muted-foreground mx-auto max-w-3xl text-lg leading-relaxed"
          >
            With over 5 years of experience in fullstack development, I
            specialize in creating scalable web applications that deliver
            exceptional user experiences. I&apos;m passionate about clean code,
            modern design, and solving complex problems with elegant solutions.
          </motion.p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4"
        >
          {skills.map((skill, index) => (
            <motion.div
              key={skill.title}
              variants={itemVariants}
              whileHover={{
                scale: 1.05,
                transition: { duration: 0.2 },
              }}
              className="group relative"
            >
              <div className="bg-card border-border shadow-card hover:shadow-glow h-full rounded-xl border p-6 transition-all duration-300">
                <div
                  className={`inline-flex rounded-lg p-3 bg-${skill.color}/10 mb-4 group-hover:bg-${skill.color}/20 transition-colors`}
                >
                  <skill.icon className={`h-6 w-6 text-${skill.color}`} />
                </div>
                <h3 className="mb-3 text-xl font-semibold">{skill.title}</h3>
                <p className="text-muted-foreground">{skill.description}</p>
              </div>

              {/* Animated border gradient */}
              <div
                className={`absolute inset-0 rounded-xl bg-gradient-to-r from-${skill.color}/20 to-primary/20 -z-10 opacity-0 blur-sm transition-opacity duration-300 group-hover:opacity-100`}
              />
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="mt-16 text-center"
        >
          <div className="bg-card border-border shadow-card rounded-xl border p-8">
            <h3 className="mb-4 text-2xl font-bold">Tech Stack</h3>
            <div className="flex flex-wrap justify-center gap-3">
              {[
                "React",
                "TypeScript",
                "Node.js",
                "Next.js",
                "Express",
                "PostgreSQL",
                "MongoDB",
                "Tailwind CSS",
                "Docker",
                "AWS",
                "Git",
                "Figma",
              ].map((tech) => (
                <motion.span
                  key={tech}
                  whileHover={{ scale: 1.1 }}
                  className="bg-primary/10 text-primary hover:bg-primary/20 cursor-default rounded-full px-4 py-2 text-sm font-medium transition-colors"
                >
                  {tech}
                </motion.span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

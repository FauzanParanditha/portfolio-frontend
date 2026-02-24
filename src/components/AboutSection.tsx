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
    <section ref={ref} className="w-full bg-background border-b border-thin pt-32 pb-32" id="about">
      <div className="container mx-auto px-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          className="grid grid-cols-1 md:grid-cols-12 gap-16"
        >
          {/* Section Header */}
          <motion.div variants={itemVariants} className="md:col-span-5 flex flex-col justify-between">
            <h2 className="text-display font-bold uppercase tracking-tight leading-[0.9]">
              About <br />
              (Me)
            </h2>
            <div className="hidden md:block mt-16 uppercase text-xs tracking-widest text-muted-foreground font-mono">
              [ PROFILE & CAPABILITIES ]
            </div>
          </motion.div>

          {/* Section Content */}
          <motion.div variants={itemVariants} className="md:col-span-7 flex flex-col gap-16">
            <p className="text-xl md:text-3xl leading-relaxed font-medium">
              With over 5 years of experience in fullstack development, I specialize in creating scalable web applications that deliver exceptional user experiences. I am passionate about clean architecture, brutalist design, and solving complex problems with ruthless efficiency.
            </p>

            {/* Capabilities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {skills.map((skill, index) => (
                <motion.div
                  key={skill.title}
                  variants={itemVariants}
                  className={`p-8 border-thin flex flex-col gap-6 hover:bg-foreground hover:text-background transition-colors duration-300 ${
                    index % 2 !== 0 ? "sm:border-l-0" : ""
                  } ${index > 1 ? "border-t-0" : ""}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="font-mono text-xs opacity-50">(0{index + 1})</span>
                    <skill.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold uppercase tracking-wider mb-2">{skill.title}</h3>
                    <p className="text-sm opacity-70 leading-relaxed">{skill.description}</p>
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

"use client";

import { motion, useInView } from "framer-motion";
import { Building, Calendar, MapPin } from "lucide-react";
import { useRef } from "react";

export const ExperienceSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

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

  const experiences = [
    {
      company: "TechCorp Solutions",
      position: "Senior Fullstack Developer",
      duration: "2022 - Present",
      location: "San Francisco, CA",
      description: [
        "Led development of microservices architecture serving 1M+ users",
        "Mentored 5 junior developers and established best practices",
        "Reduced application load time by 40% through optimization",
        "Implemented CI/CD pipelines reducing deployment time by 60%",
      ],
      technologies: ["React", "Node.js", "PostgreSQL", "AWS", "Docker"],
    },
    {
      company: "StartupHub Inc",
      position: "Fullstack Developer",
      duration: "2020 - 2022",
      location: "Austin, TX",
      description: [
        "Built and launched 3 successful web applications from scratch",
        "Collaborated with design team to create responsive user interfaces",
        "Integrated payment systems and third-party APIs",
        "Maintained 99.9% uptime across all production applications",
      ],
      technologies: ["React", "Express", "MongoDB", "Stripe", "Heroku"],
    },
    {
      company: "WebAgency Pro",
      position: "Frontend Developer",
      duration: "2019 - 2020",
      location: "Denver, CO",
      description: [
        "Developed responsive websites for 20+ clients",
        "Converted design mockups to pixel-perfect implementations",
        "Optimized websites for SEO and performance",
        "Collaborated with backend developers on API integration",
      ],
      technologies: ["JavaScript", "HTML/CSS", "WordPress", "SASS", "jQuery"],
    },
  ];

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
            className="bg-gradient-primary mb-6 bg-clip-text text-4xl font-bold text-transparent md:text-5xl"
          >
            Experience
          </motion.h2>
          <motion.p
            variants={itemVariants}
            className="text-muted-foreground mx-auto max-w-2xl text-lg"
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
          <div className="bg-primary/20 absolute bottom-0 left-4 top-0 w-0.5 transform md:left-1/2 md:-translate-x-1/2" />

          {experiences.map((exp, index) => (
            <motion.div
              key={exp.company}
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
                className="bg-card border-border shadow-card hover:shadow-glow ml-8 rounded-xl border p-6 transition-all duration-300 md:ml-0"
              >
                <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center">
                  <h3 className="text-primary text-xl font-bold">
                    {exp.position}
                  </h3>
                  <div className="text-muted-foreground flex items-center gap-2">
                    <Building className="h-4 w-4" />
                    <span>{exp.company}</span>
                  </div>
                </div>

                <div className="text-muted-foreground mb-4 flex flex-col gap-4 text-sm sm:flex-row">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{exp.duration}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    <span>{exp.location}</span>
                  </div>
                </div>

                <ul className="mb-4 space-y-2">
                  {exp.description.map((item, i) => (
                    <li
                      key={i}
                      className="text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-primary mt-1.5 text-xs">●</span>
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2">
                  {exp.technologies.map((tech) => (
                    <span
                      key={tech}
                      className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium"
                    >
                      {tech}
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

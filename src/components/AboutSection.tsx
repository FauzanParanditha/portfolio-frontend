"use client";

import type { ExperienceTag } from "@/types/experience";
import { motion, useInView } from "framer-motion";
import {
  Binary,
  Boxes,
  Cloud,
  Code,
  Cpu,
  Database,
  LayoutGrid,
  Tag as TagIcon,
  Terminal,
  Wrench,
  Zap,
} from "lucide-react";
import { useRef } from "react";

/**
 * Ikon per tipe tag. Tipe yang belum terdaftar jatuh ke ikon generik — daftar
 * tag dikelola dari /admin/tags, jadi tipe baru bisa muncul kapan saja dan
 * tidak boleh membuat halaman ini rusak.
 */
const ICON_BY_TYPE: Record<string, typeof Code> = {
  frontend: LayoutGrid,
  backend: Binary,
  database: Database,
  devops: Zap,
  framework: Boxes,
  language: Terminal,
  tools: Wrench,
  cloud: Cloud,
  runtime: Cpu,
};

/** Urutan tampil yang diutamakan; tipe lain menyusul secara alfabetis. */
const TYPE_ORDER = [
  "language",
  "backend",
  "frontend",
  "framework",
  "database",
  "devops",
  "cloud",
  "tools",
];

function groupByType(tags: ExperienceTag[]) {
  const groups = new Map<string, string[]>();
  for (const tag of tags) {
    const key = tag.type?.trim().toLowerCase() || "lainnya";
    const list = groups.get(key) ?? [];
    list.push(tag.name);
    groups.set(key, list);
  }

  return Array.from(groups.entries())
    .map(([type, names]) => ({
      type,
      names: names.slice().sort((a, b) => a.localeCompare(b)),
      Icon: ICON_BY_TYPE[type] ?? TagIcon,
    }))
    .sort((a, b) => {
      const ia = TYPE_ORDER.indexOf(a.type);
      const ib = TYPE_ORDER.indexOf(b.type);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.type.localeCompare(b.type);
    });
}

/**
 * Grid keahlian kini disusun dari tag yang dikelola di /admin/tags, bukan lagi
 * daftar yang ditulis manual di berkas ini. Menambah keahlian tidak perlu
 * menyentuh kode maupun deploy ulang.
 */
export const AboutSection = ({ tags }: { tags: ExperienceTag[] }) => {
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

  const skills = groupByType(tags);

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
            {skills.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {skills.map((skill, index) => (
                  <motion.div
                    key={skill.type}
                    variants={itemVariants}
                    className={`border-thin hover:bg-foreground hover:text-background flex flex-col gap-6 p-8 transition-colors duration-300 ${
                      index % 2 !== 0 ? "sm:border-l-0" : ""
                    } ${index > 1 ? "border-t-0" : ""}`}
                  >
                    <div className="flex items-start justify-between">
                      <span className="stat-num text-xs opacity-50">
                        ({String(index + 1).padStart(2, "0")})
                      </span>
                      <skill.Icon className="h-6 w-6" aria-hidden="true" />
                    </div>
                    <div>
                      <h3 className="mb-2 text-lg font-bold tracking-wider uppercase">
                        {skill.type}
                      </h3>
                      <p className="text-sm leading-relaxed opacity-70">
                        {skill.names.join(", ")}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

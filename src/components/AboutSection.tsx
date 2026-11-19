import { PROFILE } from "@/content/profile";
import { groupSkills } from "@/lib/skills";
import type { ExperienceTag } from "@/types/experience";
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

/**
 * Grid keahlian kini disusun dari tag yang dikelola di /admin/tags, bukan lagi
 * daftar yang ditulis manual di berkas ini. Menambah keahlian tidak perlu
 * menyentuh kode maupun deploy ulang.
 */
export const AboutSection = ({ tags }: { tags: ExperienceTag[] }) => {
  const skills = groupSkills(tags).map((group) => ({
    ...group,
    Icon: ICON_BY_TYPE[group.type] ?? TagIcon,
  }));

  return (
    <section
      className="border-thin w-full border-b bg-zinc-950 pt-32 pb-32"
      id="about"
      aria-labelledby="about-heading"
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 gap-16 md:grid-cols-12">
          {/* Section Header */}
          <div className="reveal-on-scroll flex flex-col justify-between md:col-span-5">
            <h2 id="about-heading" className="section-title">
              About <br />
              (Me)
            </h2>
            <div className="eyebrow mt-16 hidden md:block">
              [ PROFILE & CAPABILITIES ]
            </div>
          </div>

          {/* Section Content */}
          <div className="reveal-on-scroll flex flex-col gap-16 md:col-span-7">
            <p className="text-xl leading-relaxed font-medium md:text-3xl">
              {PROFILE.about}
            </p>

            {/* Capabilities Grid */}
            {skills.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {skills.map((skill, index) => (
                  <div
                    key={skill.type}
                    className={`reveal-on-scroll border-thin hover:bg-foreground hover:text-background flex flex-col gap-6 p-8 transition-colors duration-300 ${
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
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

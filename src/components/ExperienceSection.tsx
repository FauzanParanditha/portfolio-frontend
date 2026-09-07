import type { Experience } from "@/types/experience";

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
  return (
    <section
      className="border-thin w-full border-b bg-zinc-950 pt-32 pb-32"
      id="experience"
      aria-labelledby="experience-heading"
    >
      <div className="container mx-auto px-6">
        <div className="flex flex-col gap-16">
          {/* Section Header */}
          <div className="reveal-on-scroll border-thin flex items-end justify-between border-b pb-8">
            <h2 id="experience-heading" className="section-title">
              Experience
            </h2>
            <div className="eyebrow hidden md:block">[ CAREER PATH ]</div>
          </div>

          {/* Experience List */}
          <div className="flex w-full flex-col">
            {experiences.map((exp, index) => (
              <div
                key={exp.id}
                className="reveal-on-scroll group border-thin hover:bg-foreground hover:text-background -mx-6 flex flex-col items-start gap-8 border-b px-6 py-12 transition-colors duration-500 md:-mx-12 md:flex-row md:px-12"
              >
                {/* Index / Meta — menempel selama isi entri ini bergulir,
                    sehingga periode dan nomornya tetap terbaca pada entri yang
                    panjang. Murni CSS `position: sticky`; `self-start` wajib
                    agar sticky bekerja di dalam kontainer flex. */}
                <div className="flex flex-col gap-4 md:sticky md:top-28 md:w-1/4 md:self-start">
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

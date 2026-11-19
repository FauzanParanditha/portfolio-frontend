import {
  experiencePeriod,
  type PlaygroundExperience,
} from "@/lib/playground/layout";

/**
 * Riwayat kerja, satu entri per peran. Dipakai panel dinding pengalaman di
 * /playground dan kartu pengalaman di tur.
 */
export function ExperienceList({
  experiences,
}: {
  experiences: PlaygroundExperience[];
}) {
  return (
    <ol className="flex flex-col gap-6">
      {experiences.map((experience) => (
        <li
          key={experience.id}
          className="flex flex-col gap-2 border-l border-zinc-700 pl-4"
        >
          <p className="font-mono text-xs tracking-widest text-cyan-400 uppercase">
            {experiencePeriod(experience)}
          </p>
          <h3 className="text-lg leading-snug font-medium text-white">
            {experience.title}
          </h3>
          <p className="text-sm text-zinc-400">
            {[experience.company, experience.location]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {experience.description && (
            <p className="text-sm leading-relaxed text-zinc-300">
              {experience.description}
            </p>
          )}
          {experience.highlights.length > 0 && (
            <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-relaxed text-zinc-300">
              {experience.highlights.map((highlight, index) => (
                <li key={index}>{highlight}</li>
              ))}
            </ul>
          )}
          {experience.tags.length > 0 && (
            <ul aria-label="Technologies" className="flex flex-wrap gap-2 pt-1">
              {experience.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full border border-zinc-700 px-3 py-1 text-xs text-zinc-300"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ol>
  );
}

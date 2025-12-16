import type { Experience } from "@/types/experience";

type ExperienceUpsertPayload = {
  title: string;
  company: string;
  location: string;
  startDate: string;
  endDate?: string | null;
  isCurrent: boolean;
  description: string;
  sortOrder: number;
  tagIds: string[];
  highlights: string[];
};

export function toExperienceUpsertPayload(
  exp: Experience,
  sortOrder: number,
): ExperienceUpsertPayload {
  return {
    title: exp.title,
    company: exp.company,
    location: exp.location ?? "",
    startDate: exp.startDate, // "YYYY-MM-DD"
    endDate: exp.isCurrent ? null : exp.endDate ? exp.endDate : null,
    isCurrent: exp.isCurrent,
    description: exp.description ?? "",
    sortOrder,
    tagIds: (exp.tags ?? []).map((t) => t.id).filter(Boolean),
    highlights: (exp.highlights ?? []).map((h) => h.text).filter(Boolean),
  };
}

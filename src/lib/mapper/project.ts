import type { Project, ProjectUpsertPayload } from "@/types/project";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export function toProjectUpsertPayload(
  p: Project,
  sortOrder: number,
): ProjectUpsertPayload {
  return {
    title: p.title,
    slug: p.slug?.trim() ? p.slug : slugify(p.title),

    shortDesc: p.shortDesc ?? "",
    longDescription: p.longDescription ?? "",
    coverImageUrl: p.coverImageUrl ?? "",

    category: p.category ?? "",
    timeline: p.timeline ?? "",
    role: p.role ?? "",

    challenge: p.challenge ?? "",
    solution: p.solution ?? "",

    results: (p.results ?? []).map((x) => x.trim()).filter(Boolean),
    technicalDetails: p.technicalDetails ?? {},

    demoUrl: p.demoUrl?.trim() ? p.demoUrl : null,
    repoUrl: p.repoUrl?.trim() ? p.repoUrl : null,

    // request: []string
    screenshots: (p.screenshots ?? []).map((s) => s.imageUrl).filter(Boolean),

    isFeatured: !!p.isFeatured,
    sortOrder,

    tagIds: (p.tags ?? []).map((t) => t.id).filter(Boolean),

    // request: []string, response: [{text}]
    features: (p.features ?? []).map((f) => f.text?.trim()).filter(Boolean),
  };
}

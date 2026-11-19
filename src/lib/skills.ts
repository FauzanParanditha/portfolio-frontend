import type { ExperienceTag } from "@/types/experience";

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

export interface SkillGroup {
  type: string;
  names: string[];
}

/**
 * Kelompokkan tag (dikelola di /admin/tags) per tipe untuk grid keahlian.
 * Tipe kosong masuk "lainnya"; nama di tiap kelompok diurutkan abjad.
 */
export function groupSkills(tags: ExperienceTag[]): SkillGroup[] {
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

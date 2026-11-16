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
    // URL di-trim sebelum dikirim: backend MENOLAK (422) URL berspasi di tepi
    // alih-alih memangkasnya, jadi nilai mentah dari input tidak boleh lolos.
    coverImageUrl: (p.coverImageUrl ?? "").trim(),

    category: p.category ?? "",
    timeline: p.timeline ?? "",
    role: p.role ?? "",

    challenge: p.challenge ?? "",
    solution: p.solution ?? "",

    results: (p.results ?? []).map((x) => x.trim()).filter(Boolean),
    technicalDetails: p.technicalDetails ?? {},

    // Kosong (atau hanya spasi) → null, supaya validator `omitempty` backend
    // melewatinya; selain itu kirim versi yang sudah di-trim.
    demoUrl: p.demoUrl?.trim() || null,
    repoUrl: p.repoUrl?.trim() || null,

    // request: []string. Trim + buang yang kosong: screenshot dari data lama
    // bisa saja tidak pernah melewati editor textarea (yang sudah men-trim).
    screenshots: (p.screenshots ?? [])
      .map((s) => s.imageUrl?.trim())
      .filter(Boolean),

    isFeatured: !!p.isFeatured,
    sortOrder,

    tagIds: (p.tags ?? []).map((t) => t.id).filter(Boolean),

    // request: []string, response: [{text}]
    features: (p.features ?? []).map((f) => f.text?.trim()).filter(Boolean),
  };
}

/**
 * Label form admin untuk kunci `error.details` dari validasi backend.
 *
 * Backend (go-playground/validator) memakai nama field struct Go — `DemoURL`,
 * `CoverImageURL`, `Screenshots[1]` — bukan nama JSON. Kuncinya dicocokkan
 * tanpa peduli huruf besar/kecil supaya tetap jalan bila suatu saat backend
 * beralih ke nama JSON (`demoUrl`, `coverImageUrl`).
 */
const PROJECT_FIELD_LABELS: Record<string, string> = {
  title: "Title",
  slug: "Slug",
  shortdesc: "Description",
  longdesc: "Long Description",
  longdescription: "Long Description",
  coverimageurl: "Image URL",
  category: "Category",
  timeline: "Timeline",
  role: "Role",
  challenge: "Challenge",
  solution: "Solution",
  results: "Results",
  technicaldetails: "Technical Details",
  demourl: "Live URL",
  repourl: "GitHub URL",
  screenshots: "Screenshots URLs",
  sortorder: "Sort Order",
  tagids: "Tags",
  features: "Features",
};

export function projectFieldLabel(key: string): string {
  // Item array, mis. `Screenshots[1]` → "Screenshots URLs (line 2)". Indeks
  // backend sama dengan baris non-kosong ke-N di textarea, karena baris kosong
  // dibuang baik oleh editor maupun mapper sebelum dikirim.
  const indexed = /^(\w+)\[(\d+)\]$/.exec(key);
  if (indexed) {
    const base = PROJECT_FIELD_LABELS[indexed[1].toLowerCase()];
    if (base) return `${base} (line ${Number(indexed[2]) + 1})`;
    return key;
  }

  return PROJECT_FIELD_LABELS[key.toLowerCase()] ?? key;
}

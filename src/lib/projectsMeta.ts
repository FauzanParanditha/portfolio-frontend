/**
 * Parameter URL dan metadata halaman indeks proyek (/projects).
 *
 * Fungsi murni, dipakai halaman (untuk membaca kueri dan menyusun tautan) dan
 * `generateMetadata`-nya — supaya canonical yang diumumkan selalu sama dengan
 * tautan yang dirender.
 */

export interface ProjectsQuery {
  /** Kata kunci pencarian; "" bila tidak ada. */
  q: string;
  /** Filter tag; "" bila tidak ada. */
  tag: string;
  /** Nomor halaman, mulai dari 1. */
  page: number;
}

/** Baca kueri dari `searchParams`; nilai yang tak masuk akal jatuh ke bawaan. */
export function parseProjectsQuery(params: {
  q?: string | string[];
  tag?: string | string[];
  page?: string | string[];
}): ProjectsQuery {
  // Parameter yang diulang (`?tag=a&tag=b`) datang sebagai array: pakai yang
  // pertama, sama seperti yang dilakukan URLSearchParams.get.
  const first = (value?: string | string[]) =>
    (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
  return {
    q: first(params.q),
    tag: first(params.tag),
    page: Math.max(1, Number.parseInt(first(params.page) || "1", 10) || 1),
  };
}

/** URL /projects dengan hanya parameter yang benar-benar terpakai. */
export function projectsHref(params: {
  q?: string;
  tag?: string;
  page?: number;
}): string {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.tag) qs.set("tag", params.tag);
  if (params.page && params.page > 1) qs.set("page", String(params.page));
  const s = qs.toString();
  return s ? `/projects?${s}` : "/projects";
}

export interface ProjectsMeta {
  title: string;
  description: string;
  /** Path canonical, relatif terhadap `metadataBase`. */
  canonical: string;
  /** `false` = minta mesin pencari tidak mengindeks varian ini. */
  index: boolean;
}

const DESCRIPTION =
  "Projects by Fauzan Paranditha: web applications, APIs, and tools, with the stack and role behind each one.";

/**
 * Judul, canonical, dan boleh-tidaknya diindeks untuk satu varian /projects.
 *
 * - Daftar biasa dan halaman lanjutannya: canonical ke dirinya sendiri.
 * - Filter tag yang memang ada: halaman tersendiri (isinya berbeda), dengan
 *   ejaan tag dari data — bukan dari URL — supaya `?tag=go` dan `?tag=Go`
 *   menunjuk canonical yang sama.
 * - Hasil pencarian, dan tag yang tidak dikenal: `noindex`, canonical ke
 *   daftar utama. Keduanya memantulkan teks dari URL; tanpa ini siapa pun bisa
 *   membuat halaman "sah" tak terhingga dengan menautkan `?q=…`.
 */
export function projectsMeta(
  query: ProjectsQuery,
  knownTags: readonly string[],
): ProjectsMeta {
  const base: ProjectsMeta = {
    title: "Projects",
    description: DESCRIPTION,
    canonical: "/projects",
    index: true,
  };
  if (query.q) return { ...base, index: false };

  const tag = query.tag
    ? knownTags.find((name) => name.toLowerCase() === query.tag.toLowerCase())
    : undefined;
  if (query.tag && !tag) return { ...base, index: false };

  const suffix = query.page > 1 ? ` (page ${query.page})` : "";
  return {
    ...base,
    title: `${tag ? `${tag} projects` : "Projects"}${suffix}`,
    canonical: projectsHref({ tag, page: query.page }),
  };
}

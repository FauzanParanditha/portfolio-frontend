import type {
  Experience,
  ExperienceTag,
  ApiListResponse as ExperienceListResponse,
} from "@/types/experience";
import type {
  ApiListResponse as ProjectListResponse,
  Project,
} from "@/types/portfolio";

/**
 * Pengambilan data portfolio di SISI SERVER.
 *
 * Dipakai oleh beranda supaya isi proyek & pengalaman ikut terkirim di HTML
 * pertama — bukan menunggu SWR berjalan di browser. Sengaja TIDAK memakai
 * `publicClient` (axios) karena itu modul klien; di sini `fetch` bawaan Next
 * dipakai agar caching/revalidate-nya ikut terkelola.
 *
 * Semua fungsi di sini SELALU mengembalikan array — tidak pernah melempar.
 * Alasannya: `next build` menjalankan fungsi ini saat prerender, dan backend
 * tidak selalu hidup di mesin build/CI. Kegagalan cukup dicatat ke log build,
 * halaman tetap terbit dengan bagian statisnya utuh.
 */

// Berapa lama hasil fetch boleh dipakai ulang sebelum diambil ulang (detik).
const REVALIDATE_SECONDS = 300;

function apiBase(): string | null {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    console.warn("[portfolio] NEXT_PUBLIC_API_URL belum di-set; data dilewati");
    return null;
  }
  return base.replace(/\/+$/, "");
}

async function getJson<T>(path: string): Promise<T | null> {
  const base = apiBase();
  if (!base) return null;

  try {
    const res = await fetch(`${base}${path}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.warn(`[portfolio] ${path} membalas ${res.status}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    // Backend mati / DNS gagal / timeout — bukan alasan untuk menggagalkan build.
    console.warn(
      `[portfolio] gagal mengambil ${path}:`,
      (err as Error).message,
    );
    return null;
  }
}

/** Proyek unggulan untuk section "Selected Works" di beranda. */
export async function getFeaturedProjects(limit = 6): Promise<Project[]> {
  const json = await getJson<ProjectListResponse<Project>>(
    `/projects?featured=true&page=1&limit=${limit}`,
  );
  return json?.data ?? [];
}

/** Riwayat pengalaman, sudah diurutkan sesuai `sortOrder`. */
export async function getExperiences(): Promise<Experience[]> {
  const json =
    await getJson<ExperienceListResponse<Experience>>("/experiences");
  return (json?.data ?? []).slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Seluruh tag beserta tipenya, dipakai menyusun grid keahlian di section About.
 *
 * Endpoint `/tags` bersifat publik & read-only; pengelolaannya tetap lewat
 * `/admin/tags`. Jadi menambah keahlian di situs cukup dilakukan dari panel,
 * tanpa menyentuh kode lagi.
 */
export async function getTags(): Promise<ExperienceTag[]> {
  const json = await getJson<{ data: ExperienceTag[] }>("/tags");
  return json?.data ?? [];
}

/** Satu halaman hasil daftar proyek, beserta meta paginasinya. */
export interface ProjectsPage {
  projects: Project[];
  total: number;
  totalPages: number;
  page: number;
}

/**
 * Satu halaman daftar proyek untuk `/projects`.
 *
 * Pencarian, filter tag, dan paginasi SEMUANYA dikerjakan backend. Sebelumnya
 * halaman itu mengambil satu halaman lalu menyaring tag di browser — sehingga
 * memfilter di halaman 2 dengan tag yang hanya ada di halaman 1 menghasilkan
 * kosong, dan jumlah halamannya pun salah.
 */
export async function getProjectsPage(params: {
  page?: number;
  limit?: number;
  q?: string;
  tag?: string;
}): Promise<ProjectsPage> {
  const page = Math.max(1, params.page ?? 1);
  const limit = params.limit ?? 6;

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (params.q?.trim()) query.set("q", params.q.trim());
  if (params.tag?.trim()) query.set("tag", params.tag.trim());

  const json = await getJson<ProjectListResponse<Project>>(
    `/projects?${query.toString()}`,
  );

  const total = json?.meta?.total ?? 0;
  return {
    projects: json?.data ?? [],
    total,
    totalPages: json?.meta?.totalPages ?? Math.max(1, Math.ceil(total / limit)),
    page,
  };
}

/**
 * Nama tag yang BENAR-BENAR dipakai minimal satu proyek, untuk baris chip
 * filter di `/projects`.
 *
 * Sengaja tidak memakai `/tags`: endpoint itu mengembalikan seluruh tag yang
 * dikelola di panel, termasuk yang belum dipakai proyek mana pun — chip-nya
 * akan menghasilkan nol hasil dan menyesatkan.
 *
 * Diambil dengan satu permintaan berlimit besar. Untuk sebuah portfolio, jumlah
 * proyeknya kecil sehingga ini lebih murah daripada menambah endpoint baru.
 */
export async function getUsedProjectTags(): Promise<string[]> {
  const json = await getJson<ProjectListResponse<Project>>(
    "/projects?page=1&limit=100",
  );

  const names = new Set<string>();
  for (const project of json?.data ?? []) {
    for (const tag of project.tags ?? []) {
      if (tag.name) names.add(tag.name);
    }
  }

  return Array.from(names).sort((a, b) => a.localeCompare(b));
}

/**
 * Satu proyek berdasarkan slug, atau `null` bila tidak ada.
 *
 * Dipakai BERSAMA oleh `generateMetadata` di layout dan halaman detailnya.
 * Karena keduanya memanggil URL yang sama dengan opsi yang sama, cache `fetch`
 * bawaan Next menyatukannya menjadi satu permintaan — sebelumnya layout
 * mengambil di server untuk metadata lalu halaman mengambil lagi di browser.
 */
export async function getProjectBySlug(slug: string): Promise<Project | null> {
  const clean = slug.trim();
  if (!clean) return null;

  const json = await getJson<{ data: Project }>(
    `/projects/${encodeURIComponent(clean)}`,
  );
  return json?.data ?? null;
}

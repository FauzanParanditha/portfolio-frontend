import type {
  Experience,
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

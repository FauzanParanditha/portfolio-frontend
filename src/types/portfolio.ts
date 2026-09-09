export interface ProjectTag {
  id: string;
  name: string;
  type: string;
}

export interface ProjectScreenshot {
  imageUrl: string;
  sortOrder: number;
}

export interface ProjectFeature {
  text: string;
}

export interface ProjectTechnicalDetails {
  backend: string;
  database: string;
  frontend: string;
  deployment: string;
  architecture: string;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  shortDesc: string;
  longDescription: string;
  coverImageUrl?: string;
  category?: string;
  timeline?: string;
  role?: string;
  challenge?: string;
  solution?: string;
  results: string[];
  technicalDetails: ProjectTechnicalDetails;
  demoUrl?: string | null;
  repoUrl?: string | null;
  isFeatured: boolean;
  sortOrder: number;
  tags: ProjectTag[];
  features: ProjectFeature[];
  // API publik mengembalikan OBJEK, bukan string. Tipe ini sebelumnya
  // dideklarasikan `string[]` sehingga `src={screenshot}` menghasilkan
  // "[object Object]" — tidak pernah terlihat karena belum ada proyek
  // berscreenshot. Bentuknya harus cocok dengan ProjectScreenshotResponse
  // di backend.
  screenshots: ProjectScreenshot[];
}

export interface ApiListMeta {
  featured?: boolean;
  hasMore: boolean;
  limit: number;
  page: number;
  q: string;
  total: number;
  totalPages: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: ApiListMeta;
}

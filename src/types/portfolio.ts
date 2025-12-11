export interface ProjectTag {
  id: string;
  name: string;
  type: string;
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
  screenshots: string[]; // kalau nanti di-isi URL
}

export interface ApiListMeta {
  featured?: boolean;
  hasMore: boolean;
  limit: number;
  page: number;
  q: string;
  total: number;
}

export interface ApiListResponse<T> {
  data: T[];
  meta: ApiListMeta;
}

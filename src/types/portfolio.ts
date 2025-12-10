export interface Project {
  id: string;
  title: string;
  slug: string;
  shortDesc: string;
  coverImageUrl?: string;
  liveUrl?: string | null;
  sourceUrl?: string | null;
  isFeatured: boolean;
  tags: ProjectTag[];
  features: ProjectFeature[];
}

export interface ProjectTag {
  id: string;
  name: string;
  type: string;
}

export interface ProjectFeature {
  text: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  location?: string;
  startDate: string;
  endDate?: string | null;
  description?: string;
  highlights?: string[];
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

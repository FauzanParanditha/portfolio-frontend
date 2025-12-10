export interface Project {
  id: string;
  title: string;
  slug: string;
  shortDesc: string;
  coverImageUrl: string;
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

export interface ApiListResponse<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    featured?: boolean;
    q?: string;
  };
}

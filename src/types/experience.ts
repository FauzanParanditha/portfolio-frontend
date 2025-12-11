export interface ExperienceTag {
  id: string;
  name: string;
  type: string;
}

export interface ExperienceHighlight {
  text: string;
}

export interface Experience {
  id: string;
  title: string; // position
  company: string;
  location: string;
  startDate: string;
  isCurrent: boolean;
  description: string;
  sortOrder: number;
  tags: ExperienceTag[];
  highlights: ExperienceHighlight[];
}

export interface ApiListResponse<T> {
  data: T[];
  meta?: ApiListMeta;
}

export interface ApiListMeta {
  featured?: boolean;
  hasMore: boolean;
  limit: number;
  page: number;
  q: string;
  total: number;
}
export type Tag = { id: string; name: string; type: string };

export type ProjectFeature = { text: string };
export type ProjectScreenshot = { imageUrl: string; sortOrder: number };

export type Project = {
  id: string;
  title: string;
  slug: string;

  shortDesc: string;
  longDescription: string;

  coverImageUrl: string;

  category: string;
  timeline: string;
  role: string;

  challenge: string;
  solution: string;

  results: string[];
  technicalDetails: Record<string, any>;

  demoUrl?: string | null;
  repoUrl?: string | null;

  isFeatured: boolean;
  sortOrder: number;

  tags: Tag[];
  features: ProjectFeature[];
  screenshots: ProjectScreenshot[];
};

export type ProjectUpsertPayload = {
  title: string;
  slug: string;
  shortDesc: string;
  longDescription: string;
  coverImageUrl: string;

  category: string;
  timeline: string;
  role: string;

  challenge: string;
  solution: string;

  results: string[];
  technicalDetails: Record<string, any>;

  demoUrl?: string | null;
  repoUrl?: string | null;

  screenshots: string[]; // request wants []string URL

  isFeatured: boolean;
  sortOrder: number;

  tagIds: string[];
  features: string[]; // request wants []string
};

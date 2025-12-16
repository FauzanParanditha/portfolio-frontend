export type DashboardOverview = {
  projects: { total: number; featured: number; recentCount: number };
  experiences: { total: number; current: number; recentCount: number };
  contactMessages: { total: number; unread: number; recentCount: number };
  system: { serverTime: string; recentDays: number };
};

export type ApiResponseDashboard<T> = { data: T };

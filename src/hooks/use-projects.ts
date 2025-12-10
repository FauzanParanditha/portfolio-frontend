"use client";

import publicClient from "@/lib/axios/public";
import type { ApiListResponse, Project } from "@/types/portfolio";
import useSWR from "swr";

export function useProjects(params?: {
  page?: number;
  limit?: number;
  q?: string;
  featured?: boolean;
}) {
  const query = new URLSearchParams();

  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.q) query.set("q", params.q);
  if (params?.featured !== undefined)
    query.set("featured", String(params.featured));

  const url = `/projects${query.size > 0 ? `?${query.toString()}` : ""}`;

  const { data, error, isLoading } = useSWR<ApiListResponse<Project>>(
    url,
    (url: string) => publicClient.get(url).then((res) => res.data),
  );

  return {
    projects: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    isError: !!error,
  };
}

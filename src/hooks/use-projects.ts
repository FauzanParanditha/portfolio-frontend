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
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 12;

  const query = new URLSearchParams();

  // kalau memang mau support pagination backend:
  query.set("page", String(page));
  query.set("limit", String(limit));

  if (params?.q && params.q.trim()) query.set("q", params.q.trim());
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

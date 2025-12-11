"use client";

import publicClient from "@/lib/axios/public";
import type { Project } from "@/types/portfolio";
import useSWR from "swr";

interface ApiDetailResponse<T> {
  data: T;
}

export function useProject(slug?: string) {
  const shouldFetch = !!slug;

  const { data, error, isLoading } = useSWR<ApiDetailResponse<Project>>(
    shouldFetch ? `/projects/${slug}` : null, // baseURL publicClient sudah ada /api/v1
    (url: string) => publicClient.get(url).then((res) => res.data),
  );

  return {
    project: data?.data,
    isLoading,
    isError: !!error,
  };
}

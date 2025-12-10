"use client";

import publicClient from "@/lib/axios/public";
import { ApiListResponse, Project } from "@/types/portfolio";
import useSWR from "swr";

const fetcher = (url: string) =>
  publicClient.get<ApiListResponse<Project>>(url).then((res) => res.data);

export function useProjects(opts?: { featured?: boolean }) {
  const params = new URLSearchParams();
  if (opts?.featured) params.set("featured", "true");

  const url = `/projects${params.toString() ? `?${params}` : ""}`;

  const { data, error, isLoading } = useSWR<ApiListResponse<Project>>(
    url,
    fetcher,
  );

  return {
    projects: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    isError: !!error,
  };
}

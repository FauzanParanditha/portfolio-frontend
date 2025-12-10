"use client";

import publicClient from "@/lib/axios/public";
import type { ApiListResponse, Experience } from "@/types/experience";
import useSWR from "swr";

export function useExperiences() {
  const { data, error, isLoading } = useSWR<ApiListResponse<Experience>>(
    "/experiences",
    (url: string) => publicClient.get(url).then((res) => res.data),
  );

  const sorted =
    data?.data?.slice().sort((a, b) => a.sortOrder - b.sortOrder) ?? [];

  return {
    experiences: sorted,
    isLoading,
    isError: !!error,
  };
}

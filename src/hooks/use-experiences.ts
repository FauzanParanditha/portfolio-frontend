"use client";

import { ApiListResponse, Experience } from "@/types/portfolio";
import useSWR from "swr";

export function useExperiences() {
  const { data, error, isLoading } =
    useSWR<ApiListResponse<Experience>>("/experiences");

  return {
    experiences: data?.data ?? [],
    isLoading,
    isError: error,
  };
}

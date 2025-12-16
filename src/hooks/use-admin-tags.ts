"use client";

import adminClient from "@/lib/axios/admin";
import type { ApiListResponse, ExperienceTag } from "@/types/experience";
import useSWR from "swr";

const fetcher = (url: string) => adminClient.get(url).then((r) => r.data);

export function useAdminTags(params?: {
  page?: number;
  limit?: number;
  q?: string;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.q) query.set("q", params.q);

  const url = `/admin/tags${query.size ? `?${query.toString()}` : ""}`;

  const { data, error, isLoading } = useSWR<ApiListResponse<ExperienceTag>>(
    url,
    fetcher,
  );

  return {
    tags: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    error,
  };
}

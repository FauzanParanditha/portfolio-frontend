"use client";

import adminClient from "@/lib/axios/admin";
import type { ApiListResponse } from "@/types/experience";
import type { Project, ProjectUpsertPayload } from "@/types/project";
import useSWR from "swr";

const fetcher = (url: string) => adminClient.get(url).then((r) => r.data);

export function useAdminProjects(params?: {
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

  const url = `/admin/projects${query.size ? `?${query.toString()}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<ApiListResponse<Project>>(
    url,
    fetcher,
  );

  async function createOne(payload: ProjectUpsertPayload) {
    const res = await adminClient.post("/admin/projects", payload);
    await mutate();
    return res.data;
  }

  async function updateOne(id: string, payload: ProjectUpsertPayload) {
    const res = await adminClient.put(`/admin/projects/${id}`, payload);
    await mutate();
    return res.data;
  }

  async function deleteOne(id: string) {
    await adminClient.delete(`/admin/projects/${id}`);
    await mutate();
  }

  return {
    projects: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    error,
    createOne,
    updateOne,
    deleteOne,
    refresh: mutate,
  };
}

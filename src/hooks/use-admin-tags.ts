"use client";

import adminClient from "@/lib/axios/admin";
import type { ApiListResponse, ExperienceTag } from "@/types/experience";
import useSWR from "swr";

const fetcher = (url: string) => adminClient.get(url).then((r) => r.data);

/** Body untuk create/update tag — backend mewajibkan keduanya terisi. */
export interface TagUpsertPayload {
  name: string;
  type: string;
}

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

  const { data, error, isLoading, mutate } = useSWR<
    ApiListResponse<ExperienceTag>
  >(url, fetcher);

  async function createOne(payload: TagUpsertPayload) {
    const res = await adminClient.post("/admin/tags", payload);
    await mutate();
    return res.data;
  }

  async function updateOne(id: string, payload: TagUpsertPayload) {
    const res = await adminClient.put(`/admin/tags/${id}`, payload);
    await mutate();
    return res.data;
  }

  async function deleteOne(id: string) {
    await adminClient.delete(`/admin/tags/${id}`);
    await mutate();
  }

  return {
    tags: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    error,
    createOne,
    updateOne,
    deleteOne,
    refresh: mutate,
  };
}

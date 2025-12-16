"use client";

import adminClient from "@/lib/axios/admin";
import type {
  ApiListResponse,
  Experience,
  ExperienceUpsertPayload,
} from "@/types/experience";
import useSWR from "swr";

const fetcher = (url: string) => adminClient.get(url).then((r) => r.data);

const isUuid = (id: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    id,
  );

export function useAdminExperiences(params?: {
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));

  const url = `/admin/experiences${query.size ? `?${query.toString()}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<
    ApiListResponse<Experience>
  >(url, fetcher);

  const experiences = (data?.data ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  async function createOne(payload: ExperienceUpsertPayload) {
    const res = await adminClient.post("/admin/experiences", payload);
    return res.data;
  }

  async function updateOne(id: string, payload: ExperienceUpsertPayload) {
    const res = await adminClient.put(`/admin/experiences/${id}`, payload);
    return res.data;
  }

  async function deleteOne(id: string) {
    await adminClient.delete(`/admin/experiences/${id}`);
  }

  async function refresh() {
    const latest = await mutate(undefined, { revalidate: true }); // SWR will revalidate
    return latest as ApiListResponse<Experience> | undefined;
  }

  return {
    experiences,
    meta: data?.meta,
    isLoading,
    error,

    // CRUD per card
    createOne,
    updateOne,
    deleteOne,

    refresh,
  };
}

"use client";

import adminClient from "@/lib/axios/admin";
import type { ContactMessage } from "@/types/contact";
import type { ApiListResponse } from "@/types/experience";
import useSWR from "swr";

const fetcher = (url: string) => adminClient.get(url).then((r) => r.data);

export function useAdminContactMessages(params?: {
  page?: number;
  limit?: number;
  q?: string;
  isRead?: boolean;
}) {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.q) query.set("q", params.q);
  if (params?.isRead !== undefined) query.set("isRead", String(params.isRead));

  const url = `/admin/contact-messages${query.size ? `?${query.toString()}` : ""}`;

  const { data, error, isLoading, mutate } = useSWR<
    ApiListResponse<ContactMessage>
  >(url, fetcher);

  // Tandai dibaca/belum dibaca. Backend menerima body { isRead }.
  // Catatan kontrak: validasi backend memakai `required` pada bool, sehingga
  // isRead=false bisa ditolak (422). Aksi utama UI hanya menandai dibaca.
  async function markRead(id: string, isRead: boolean = true) {
    await adminClient.patch(`/admin/contact-messages/${id}/read`, { isRead });
    await mutate();
  }

  async function deleteOne(id: string) {
    await adminClient.delete(`/admin/contact-messages/${id}`);
    await mutate();
  }

  return {
    messages: data?.data ?? [],
    meta: data?.meta,
    isLoading,
    error,
    markRead,
    deleteOne,
    refresh: mutate,
  };
}

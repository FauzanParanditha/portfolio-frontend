"use client";

import adminClient from "@/lib/axios/admin"; // kalau belum ada, lihat catatan di bawah
import { ApiResponseDashboard, DashboardOverview } from "@/types/dashboard";
import useSWR from "swr";

const fetcher = (url: string) => adminClient.get(url).then((r) => r.data);

export function useDashboardOverview() {
  const { data, error, isLoading, mutate } = useSWR<
    ApiResponseDashboard<DashboardOverview>
  >("/admin/dashboard/overview", fetcher);

  return {
    overview: data?.data,
    isLoading,
    error,
    mutate,
  };
}

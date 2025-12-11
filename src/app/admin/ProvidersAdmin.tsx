"use client";

import AdminGuard from "@/components/AdminGuard";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import adminClient from "@/lib/axios/admin";
import { SWRConfig } from "swr";

export default function ProvidersAdmin({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => adminClient.get(url).then((res) => res.data),
        revalidateOnFocus: true,
      }}
    >
      <Toaster />
      <Sonner />
      <AdminGuard>{children}</AdminGuard>
    </SWRConfig>
  );
}

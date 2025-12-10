import AdminGuard from "@/components/AdminGuard";
import adminClient from "@/lib/axios/admin";
import React from "react";
import { SWRConfig } from "swr";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SWRConfig
      value={{
        fetcher: (url: string) => adminClient.get(url).then((res) => res.data),
        revalidateOnFocus: true,
      }}
    >
      <AdminGuard>{children}</AdminGuard>
    </SWRConfig>
  );
}

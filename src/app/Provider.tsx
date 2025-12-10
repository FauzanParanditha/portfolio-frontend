"use client";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { swrFetcherPublic } from "@/lib/fetcher/swrFetcherPublic";
import { SWRConfig } from "swr";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: swrFetcherPublic,
        dedupingInterval: 2000,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        refreshInterval: 0,
        onError: (err) => {
          console.error("[SWR Error]", err.message);
        },
      }}
    >
      <Toaster />
      <Sonner />
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </SWRConfig>
  );
}

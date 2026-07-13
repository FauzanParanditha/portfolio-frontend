"use client";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { swrFetcherPublic } from "@/lib/fetcher/swrFetcherPublic";
import { MotionConfig } from "framer-motion";
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
      {/* Hormati preferensi sistem "reduce motion": animasi framer-motion
          (y/scale/opacity) otomatis diredam saat user memintanya. */}
      <MotionConfig reducedMotion="user">
        <Toaster />
        <Sonner />
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </MotionConfig>
    </SWRConfig>
  );
}

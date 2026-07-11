"use client";

import { useAdminAuth } from "@/context/AdminAuthContext";
import { sanitizeInternalPath } from "@/lib/sanitizeInternalPath";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Setelah user terautentikasi, arahkan keluar dari halaman guest (mis. login).
 *
 * Prioritas tujuan:
 * 1. Argumen `redirectPath` eksplisit bila diberikan pemanggil.
 * 2. Nilai `?redirect` dari URL (di-set oleh proxy saat gate admin), asalkan
 *    lolos guard anti open-redirect (`sanitizeInternalPath`).
 * 3. Fallback `/admin`.
 */
export const useGuestRedirect = (redirectPath?: string) => {
  const { isAuthenticated } = useAdminAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isAuthenticated) return;

    // Argumen eksplisit menang; jika tidak ada, konsumsi `?redirect` yang
    // sudah disaring agar tidak bisa lompat ke domain luar.
    const target =
      redirectPath ?? sanitizeInternalPath(searchParams.get("redirect"));

    router.replace(target);
  }, [isAuthenticated, redirectPath, router, searchParams]);
};

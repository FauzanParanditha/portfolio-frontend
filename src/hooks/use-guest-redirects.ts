"use client";

import { useAdminAuth } from "@/context/AdminAuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const useGuestRedirect = (redirectPath = "/admin") => {
  const { isAuthenticated } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(redirectPath);
    }
  }, [isAuthenticated, redirectPath, router]);
};

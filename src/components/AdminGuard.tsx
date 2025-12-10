"use client";

import { useAdminAuth } from "@/context/AdminAuthContext";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import FullScreenLoader from "./FullScreenLoader";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/admin/login");
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return <FullScreenLoader />;
  }

  if (!isAuthenticated) {
    return null; // sudah di-redirect
  }

  return <>{children}</>;
}

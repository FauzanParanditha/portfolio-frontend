"use client";

import { Sidebar } from "@/components/admin/Sidebar";
import { Topbar } from "@/components/admin/TopBar";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAdminAuth();
  const router = useRouter();
  const role = user?.role;

  useEffect(() => {
    if (!user) router.push("/auth/login");
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen min-w-fit bg-gray-100 text-gray-900">
      <div className="grid grid-cols-1 gap-3 p-2 md:grid-cols-[280px,1fr] md:p-3">
        {/* Sidebar permanen hanya di desktop */}
        <aside className="/60 hidden rounded-xl border bg-white/80 p-3 backdrop-blur md:sticky md:top-3 md:block md:h-[calc(100vh-24px)] md:rounded-2xl">
          <Sidebar role={role} />
        </aside>

        {/* Kolom kanan */}
        <div className="flex min-h-[calc(100vh-16px)] flex-col gap-2 md:min-h-[calc(100vh-24px)] md:gap-3">
          <header className="/60 rounded-xl border bg-white/80 px-3 py-2 backdrop-blur md:rounded-2xl">
            <Topbar role={role} />
          </header>

          <main className="/60 flex-1 overflow-auto rounded-2xl border bg-white/80 p-3 md:rounded-3xl md:p-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

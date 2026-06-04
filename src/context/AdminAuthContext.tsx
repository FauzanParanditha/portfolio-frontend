"use client";

import adminClient from "@/lib/axios/admin";
import publicClient from "@/lib/axios/public";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

export type Role = "admin";
interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  // tambah field lain kalau backend kirim, misal role, avatar, dll
}

interface AdminAuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(
  undefined,
);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore sesi saat load: cookie HttpOnly `access_token` dikirim otomatis
  // oleh browser (withCredentials). /me sukses → terautentikasi; 401 → tidak.
  useEffect(() => {
    adminClient
      .get("/me")
      .then((res) => {
        // envelope seragam: { data: { id, name, email, role } }
        setUser(res.data.data);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      // Backend men-set cookie HttpOnly `access_token` via Set-Cookie.
      // Body memang berisi { data: { token, ... } } tapi SENGAJA diabaikan —
      // token tidak disimpan/dipakai JS. Status auth ditentukan oleh /me.
      await publicClient.post(
        "/auth/login",
        { email, password },
        { withCredentials: true },
      );

      const me = await adminClient.get("/me");
      setUser(me.data.data);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      // Cookie HttpOnly hanya bisa dihapus server-side; minta backend clear.
      await adminClient.post("/auth/logout");
    } catch {
      // best-effort — tetap bersihkan state & redirect
    } finally {
      setUser(null);
      if (typeof window !== "undefined") {
        window.location.href = "/auth/login";
      }
    }
  }

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}

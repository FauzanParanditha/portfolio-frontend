"use client";

import adminClient from "@/lib/axios/admin";
import publicClient from "@/lib/axios/public";
import { jwtConfig } from "@/utils/var";
import { deleteCookie, getCookie, setCookie } from "cookies-next";
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
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(
  undefined,
);

const ACCESS_TOKEN_NAME = jwtConfig.admin.accessTokenName;

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Cek sesi saat pertama kali load (kalau ada cookie token)
  useEffect(() => {
    const token = getCookie(ACCESS_TOKEN_NAME);
    if (!token) {
      setLoading(false);
      return;
    }

    adminClient
      .get("/me")
      .then((res) => {
        // asumsi backend balikin { data: { id, name, email, ... } }
        setUser(res.data);
      })
      .catch(() => {
        deleteCookie(ACCESS_TOKEN_NAME);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      const res = await publicClient.post("/auth/login", {
        email,
        password,
      });
      // asumsi backend: { data: { token, user } }
      const token = res.data?.token;
      if (!token) throw new Error("Token not found in response");

      setCookie(ACCESS_TOKEN_NAME, token, {
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
      });

      const me = await adminClient.get("/me");
      setUser(me.data);
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    deleteCookie(ACCESS_TOKEN_NAME);
    setUser(null);
    if (typeof window !== "undefined") {
      window.location.href = "/"; // redirect ke halaman public
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

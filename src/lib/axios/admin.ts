import { toast } from "@/hooks/use-toast";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";

type ApiErrorResponse = { message?: string };

// Auth admin memakai HttpOnly cookie `access_token` yang di-set backend.
// JS TIDAK membaca/menulis token — browser mengirim cookie otomatis lewat
// `withCredentials: true`. Tidak ada Authorization header manual.
const adminClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 30000,
});

const refreshAxios = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
  timeout: 15000,
});

let refreshingPromise: Promise<boolean> | null = null;

// Rotasi cookie: cookie dikirim otomatis (withCredentials), backend membalas
// Set-Cookie baru. Tidak perlu melampirkan token via JS.
async function refreshSession(): Promise<boolean> {
  try {
    await refreshAxios.post("/auth/refresh");
    return true;
  } catch {
    return false;
  }
}

// Best-effort: minta backend menghapus cookie (HttpOnly, tak bisa dihapus JS).
async function logoutSession(): Promise<void> {
  try {
    await refreshAxios.post("/auth/logout");
  } catch {
    // diabaikan — kita tetap arahkan ke login
  }
}

adminClient.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError<ApiErrorResponse>) => {
    if (typeof window === "undefined") return Promise.reject(error);

    const original = error.config as AxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;

    if (status === 401 && original && !original._retry) {
      original._retry = true;

      if (!refreshingPromise) {
        refreshingPromise = refreshSession().finally(() => {
          refreshingPromise = null;
        });
      }

      const refreshed = await refreshingPromise;
      if (refreshed) {
        // cookie sudah dirotasi backend; cukup ulangi request asli.
        return adminClient(original);
      }

      await logoutSession();
      toast({
        title: "Sesi admin berakhir.",
        description: "Silakan login ulang.",
        variant: "warning",
      });
      window.location.href = "/auth/login";
      return Promise.reject(error);
    }

    const msg = error.response?.data?.message ?? "Server Error";
    if (status && status !== 401) {
      toast({ title: `Error ${status}`, description: msg, variant: "warning" });
    }

    return Promise.reject(error);
  },
);

export default adminClient;

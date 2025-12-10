import { toast } from "@/hooks/use-toast";
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from "axios";
import { deleteCookie, getCookie, setCookie } from "cookies-next";

type RefreshResponse = { data?: { token?: string }; message?: string };
type ApiErrorResponse = { message?: string };

const ACCESS_TOKEN_NAME = "portfolio_admin_at";

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

function setAccessTokenCookie(token: string) {
  setCookie(ACCESS_TOKEN_NAME, token, {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

function attachToken(config: AxiosRequestConfig) {
  const token = getCookie(ACCESS_TOKEN_NAME) as string | undefined;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as Record<string, string>).Authorization =
      `Bearer ${token}`;
  }
}

adminClient.interceptors.request.use((config) => {
  if (typeof window === "undefined") return config;
  attachToken(config);
  return config;
});

let refreshingPromise: Promise<string | null> | null = null;

async function refreshToken(): Promise<string | null> {
  try {
    const res = await refreshAxios.post<RefreshResponse>("/v1/auth/refresh");
    const newToken = res.data.data?.token ?? null;
    if (newToken) setAccessTokenCookie(newToken);
    return newToken;
  } catch {
    return null;
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
        refreshingPromise = refreshToken().finally(() => {
          refreshingPromise = null;
        });
      }

      const newToken = await refreshingPromise;
      if (newToken) {
        attachToken(original);
        return adminClient(original);
      }

      deleteCookie(ACCESS_TOKEN_NAME);
      toast({ title: "Sesi admin berakhir. Silakan login ulang." });
      window.location.href = "/admin/login";
      return Promise.reject(error);
    }

    const msg = error.response?.data?.message ?? "Server Error";
    if (status && status !== 401) {
      toast({ title: msg });
    }

    return Promise.reject(error);
  },
);

export default adminClient;

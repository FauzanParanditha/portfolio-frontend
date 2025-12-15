import { toast } from "@/hooks/use-toast";
import axios, { AxiosError, AxiosResponse } from "axios";

type ApiErrorResponse = { message?: string };

const publicClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL, // SESUAIKAN dengan backend portfolio
  timeout: 20000,
});

publicClient.interceptors.request.use((config) => {
  // tidak perlu token apa-apa
  return config;
});

publicClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiErrorResponse>) => {
    if (typeof window === "undefined") {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const msg =
      error.response?.data?.message ||
      (status === 404
        ? "Data tidak ditemukan"
        : status === 500
          ? "Terjadi kesalahan pada server"
          : "Terjadi kesalahan saat menghubungi server");

    toast({
      title: `Error ${status || ""}`,
      description: msg,
      variant: "warning",
    });

    return Promise.reject(error);
  },
);

export default publicClient;

"use client";

import AnimatedCard from "@/components/AnimatedCard";
import PasswordInput from "@/components/PasswordInput";
import { toast } from "@/hooks/use-toast";
import publicClient from "@/lib/axios/public";
import { handleAxiosError } from "@/lib/handleAxiosError";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

// Harus sama dengan aturan backend (`validate:"min=8,max=72"`); batas 72 berasal
// dari panjang maksimum input bcrypt.
const MIN_PASSWORD = 8;
const MAX_PASSWORD = 72;

export default function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
      toast({
        title: "Password tidak memenuhi syarat",
        description: `Panjang password ${MIN_PASSWORD}–${MAX_PASSWORD} karakter.`,
        variant: "warning",
      });
      return;
    }

    // Konfirmasi dicek di klien saja — backend tidak menerimanya, gunanya hanya
    // mencegah salah ketik mengunci akun sendiri.
    if (password !== confirm) {
      toast({
        title: "Konfirmasi tidak cocok",
        description: "Ulangi password yang sama persis.",
        variant: "warning",
      });
      return;
    }

    setLoading(true);
    try {
      await publicClient.post("/auth/reset-password", { token, password });
      setDone(true);
      toast({
        title: "Password diperbarui",
        description: "Silakan login dengan password baru.",
        variant: "success",
      });
      router.replace("/auth/login");
    } catch (err) {
      handleAxiosError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-linear-to-br from-blue-100 to-purple-100 px-4">
      <AnimatedCard className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-cyan-600">Reset Password</h1>
          <p className="text-sm text-gray-600">
            Buat password baru untuk akunmu.
          </p>
        </div>

        {!token ? (
          <div
            role="alert"
            className="space-y-3 rounded-md bg-amber-50 p-4 text-sm text-gray-700"
          >
            <p>
              Tautan tidak lengkap: token reset tidak ditemukan pada alamat ini.
            </p>
            <p className="text-xs text-gray-500">
              Buka tautan langsung dari email, atau minta tautan baru.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-block text-cyan-600 hover:underline"
            >
              Minta tautan baru
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <PasswordInput
              label="Password baru"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              className="bg-white text-black"
            />
            <PasswordInput
              label="Ulangi password baru"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
              className="bg-white text-black"
            />

            <p className="text-xs text-gray-500">
              Minimal {MIN_PASSWORD} karakter.
            </p>

            <button
              type="submit"
              disabled={loading || done}
              className="w-full rounded-md bg-cyan-600 py-2 text-white transition hover:bg-cyan-700 disabled:opacity-60"
            >
              {loading ? "Menyimpan..." : "Simpan password baru"}
            </button>
          </form>
        )}

        <div className="text-center text-sm">
          <Link href="/auth/login" className="text-cyan-600 hover:underline">
            Kembali ke login
          </Link>
        </div>
      </AnimatedCard>
    </div>
  );
}

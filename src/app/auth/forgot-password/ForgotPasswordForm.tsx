"use client";

import AnimatedCard from "@/components/AnimatedCard";
import FormInput from "@/components/FormInput";
import publicClient from "@/lib/axios/public";
import { handleAxiosError } from "@/lib/handleAxiosError";
import Link from "next/link";
import { useState } from "react";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  // Backend sengaja membalas pesan yang sama untuk email terdaftar maupun tidak
  // (anti user-enumeration), jadi UI juga hanya menampilkan satu konfirmasi.
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await publicClient.post("/auth/forgot-password", { email });
      setSent(true);
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
          <h1 className="text-2xl font-bold text-cyan-600">Lupa Password</h1>
          <p className="text-sm text-gray-600">
            Masukkan email akunmu. Kami akan mengirim tautan untuk membuat
            password baru.
          </p>
        </div>

        {sent ? (
          <div
            role="status"
            className="space-y-4 rounded-md bg-cyan-50 p-4 text-sm text-gray-700"
          >
            <p>
              Jika email tersebut terdaftar, tautan reset password sudah
              dikirim. Silakan cek kotak masuk (dan folder spam).
            </p>
            <p className="text-xs text-gray-500">
              Tautan hanya berlaku sementara dan bisa dipakai satu kali.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput
              name="email"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="bg-white text-black"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-cyan-600 py-2 text-white transition hover:bg-cyan-700 disabled:opacity-60"
            >
              {loading ? "Mengirim..." : "Kirim tautan reset"}
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

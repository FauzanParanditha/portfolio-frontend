"use client";

import AnimatedCard from "@/components/AnimatedCard";
import { TextGenerateEffectLoop } from "@/components/beauty/TextGenerateEffect";
import FormInput from "@/components/FormInput";
import FullScreenLoader from "@/components/FullScreenLoader";
import PasswordInput from "@/components/PasswordInput";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useGuestRedirect } from "@/hooks/use-guest-redirects";
import { toast } from "@/hooks/use-toast";
import { handleAxiosError } from "@/lib/handleAxiosError";
import { loginSchema } from "@/schema/loginSchema";
import { useState } from "react";

export const metadata = {
  title: "Login | Page",
};

export default function LoginFormPage() {
  useGuestRedirect();

  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        toast({
          title: `${String(issue.path?.[0] ?? "form")}: ${issue.message}`,
        });
      });
      setLoading(false);
      return;
    }

    try {
      const res = await login(email, password);
      toast({
        title: "Login berhasil!",
        description: "Selamat Datang Kembali",
        variant: "success",
      });
      // (opsional) redirect di sini kalau perlu
    } catch (err) {
      handleAxiosError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 to-purple-100 px-4">
      {/* Hapus <title> karena sudah ada metadata */}

      <AnimatedCard className="w-full max-w-md space-y-6">
        <div className="flex justify-center">
          <TextGenerateEffectLoop
            words="Login"
            as="h1"
            className="text-balance"
            colorClass="text-cyan-600 "
            cycleDuration={2.6}
            staggerDelay={0.06}
            weights={{ fadeIn: 0.25, hold: 0.5, fadeOut: 0.25 }}
            repeatGap={0.25}
          />
        </div>

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
          <PasswordInput
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="bg-white text-black"
          />

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-md bg-cyan-600 py-2 text-white transition hover:bg-cyan-700 disabled:opacity-60"
          >
            {loading ? <FullScreenLoader /> : "Login"}
          </button>
        </form>

        <div className="flex justify-between text-center text-sm">
          <a
            href="/auth/forgot-password"
            className="text-cyan-600 hover:underline"
          >
            Forgot Password?
          </a>
        </div>
      </AnimatedCard>
    </div>
  );
}

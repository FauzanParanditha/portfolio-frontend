"use client";

import { useAdminAuth } from "@/context/AdminAuthContext";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await login(email, password);
    router.replace("/admin"); // ke dashboard
  }

  return (
    <main className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-xl border p-6"
      >
        <h1 className="text-xl font-semibold">Admin Login</h1>

        <div className="space-y-2">
          <label className="text-sm">Email</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm">Password</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-black py-2 text-sm text-white"
        >
          Login
        </button>
      </form>
    </main>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/listings");
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page-shell flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
      <div className="surface-card w-full max-w-md overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-6 sm:p-8">
        <div className="mb-6 text-center">
          <span className="eyebrow">Ivy Homes</span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Welcome back</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to continue to your dashboard.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              placeholder="name@ivy.homes"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="input-shell w-full"
              required
            />
            <p className="text-xs text-slate-500">Valid demo emails: demo1@ivy.homes, demo2@ivy.homes, demo3@ivy.homes</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="input-shell w-full"
              required
            />
          </div>

          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="nav-button nav-button--primary w-full justify-center rounded-xl py-3 text-base disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>
      </div>
    </div>
  );
}

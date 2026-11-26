"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, CircleAlert } from "lucide-react";
import PasswordInput from "@/components/ui/PasswordInput";
import { authClient } from "@/lib/auth-client";
import { isAdminRole } from "@/lib/roles";
import { btn, cx, input } from "@/lib/ui";

function friendly(status?: number, message?: string) {
  if (status === 401 || status === 400) return "Email atau kata sandi salah.";
  if (status === 403) return message || "Akun ini tidak bisa digunakan untuk masuk.";
  if (status === 429) return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
  return "Gagal masuk. Periksa koneksi lalu coba lagi.";
}

export default function LoginForm({ next }: { next: string | null }) {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError("");
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const { data, error } = await authClient.signIn.email({
        email: String(form.get("email")).trim(),
        password: String(form.get("password")),
        rememberMe: form.get("remember") === "on",
      });
      if (error) {
        setError(friendly(error.status, error.message));
        setLoading(false);
        return;
      }
      const role = (data?.user as { role?: string } | undefined)?.role;
      window.location.assign(next ?? (isAdminRole(role) ? "/admin" : "/akun"));
    } catch {
      setError("Tidak bisa terhubung ke server.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 grid gap-4">
      <label className="grid gap-1.5 text-sm font-semibold">
        Email
        <input name="email" type="email" required autoComplete="email" inputMode="email" className={input} />
      </label>
      <div className="grid gap-1.5">
        <span className="flex items-baseline justify-between gap-3 text-sm font-semibold">
          <label htmlFor="login-password">Kata sandi</label>
          <Link href="/lupa-sandi" className="text-[13px] font-medium text-brand hover:underline">
            Lupa kata sandi?
          </Link>
        </span>
        <PasswordInput id="login-password" name="password" required autoComplete="current-password" />
      </div>
      <label className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-muted">
        <input type="checkbox" name="remember" defaultChecked className="h-[18px] w-[18px] accent-[#ff7a1a]" />
        Ingat saya di perangkat ini
      </label>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
          <CircleAlert size={18} className="mt-px flex-none" />
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className={cx(btn.primary, "mt-1 min-h-12")}>
        {loading && <LoaderCircle size={18} className="animate-spin" />}
        {loading ? "Memeriksa..." : "Masuk"}
      </button>
    </form>
  );
}

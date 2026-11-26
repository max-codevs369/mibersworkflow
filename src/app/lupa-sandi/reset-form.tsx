"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CircleAlert, CircleCheck, LoaderCircle, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import PasswordInput from "@/components/ui/PasswordInput";
import { btn, cx, input } from "@/lib/ui";

type Step = "email" | "otp" | "password" | "done";
type ApiError = { status?: number; code?: string; message?: string } | null;

const LEN = 6;

function mask(email: string) {
  const [u, d] = email.split("@");
  if (!d) return email;
  const shown = u.length <= 2 ? u[0] : u.slice(0, 2);
  return `${shown}${"•".repeat(Math.max(1, Math.min(6, u.length - shown.length)))}@${d}`;
}

function otpError(e: ApiError) {
  const code = e?.code ?? "";
  if (e?.status === 429) return e.message || "Terlalu banyak percobaan. Tunggu sebentar.";
  if (code.includes("TOO_MANY") || e?.status === 403) return "Kode salah terlalu sering. Minta kode baru, ya.";
  if (code.includes("EXPIRED")) return "Kodenya sudah kedaluwarsa. Minta kode baru.";
  return "Kodenya tidak cocok. Cek lagi email kamu.";
}

export default function ResetForm() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "otp") otpRef.current?.focus();
  }, [step]);

  async function requestCode(target: string) {
    setError("");
    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.requestPasswordReset({ email: target });
      if (error) {
        setError(error.status === 429 ? error.message || "Tunggu sebentar sebelum meminta kode lagi." : "Gagal mengirim kode. Coba lagi.");
        return false;
      }
      setCooldown(60);
      return true;
    } catch {
      setError("Tidak bisa terhubung ke server.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  async function onEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const value = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
    if (!value) return;
    setEmail(value);
    if (await requestCode(value)) {
      setOtp("");
      setStep("otp");
    }
  }

  async function onOtp(e?: React.FormEvent) {
    e?.preventDefault();
    if (loading || otp.length !== LEN) return;
    setError("");
    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.checkVerificationOtp({ email, type: "forget-password", otp });
      if (error) {
        setError(otpError(error));
        setOtp("");
        otpRef.current?.focus();
        return;
      }
      setStep("password");
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    if (password.length < 8) return setError("Kata sandi minimal 8 karakter.");
    if (password.length > 128) return setError("Kata sandi terlalu panjang.");
    if (password !== confirm) return setError("Konfirmasi kata sandi belum sama.");
    setError("");
    setLoading(true);
    try {
      const { error } = await authClient.emailOtp.resetPassword({ email, otp, password });
      if (error) {
        if (error.status === 400 && /password/i.test(error.message ?? "")) setError("Kata sandi belum memenuhi syarat.");
        else {
          setError(otpError(error) + " Kamu perlu mengulang dari awal.");
          setStep("otp");
          setOtp("");
        }
        return;
      }
      setStep("done");
    } catch {
      setError("Tidak bisa terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  const alert = error && (
    <p role="alert" className="flex items-start gap-2 rounded-lg bg-danger/10 px-3.5 py-2.5 text-sm font-medium text-danger">
      <CircleAlert size={18} className="mt-px flex-none" />
      {error}
    </p>
  );

  if (step === "done") {
    return (
      <div className="mt-8 grid gap-5">
        <p className="flex items-start gap-3 rounded-xl border border-ok/30 bg-ok/10 p-4 text-[15px] leading-relaxed">
          <CircleCheck size={22} className="mt-0.5 flex-none text-ok" />
          <span>
            Kata sandi berhasil diganti. Semua perangkat yang tadinya masuk sudah dikeluarkan, jadi silakan masuk lagi dengan kata
            sandi baru.
          </span>
        </p>
        <Link href="/login" className={cx(btn.primary, "min-h-12")}>
          Masuk sekarang
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <ol className="mb-6 flex items-center gap-2 text-xs font-medium text-faint" aria-label="Langkah">
        {(["email", "otp", "password"] as const).map((s, i) => {
          const idx = ["email", "otp", "password"].indexOf(step);
          return (
            <li key={s} className="flex flex-1 items-center gap-2">
              <span
                className={cx(
                  "flex h-6 w-6 flex-none items-center justify-center rounded-full border text-[11px]",
                  i < idx ? "border-brand bg-brand text-ink" : i === idx ? "border-brand text-brand" : "border-line-strong"
                )}
              >
                {i + 1}
              </span>
              <span className={cx("hidden sm:inline", i === idx && "text-fg")}>{["Email", "Kode", "Sandi baru"][i]}</span>
              {i < 2 && <span className="h-px flex-1 bg-line" />}
            </li>
          );
        })}
      </ol>

      {step === "email" && (
        <form onSubmit={onEmail} className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-semibold">
            Email akun
            <input name="email" type="email" required maxLength={254} autoComplete="email" inputMode="email" defaultValue={email} className={input} />
          </label>
          {alert}
          <button type="submit" disabled={loading} className={cx(btn.primary, "min-h-12")}>
            {loading && <LoaderCircle size={18} className="animate-spin" />}
            {loading ? "Mengirim kode..." : "Kirim kode"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={onOtp} className="grid gap-4">
          <p className="flex items-start gap-2.5 text-[15px] leading-relaxed text-muted">
            <MailCheck size={20} className="mt-0.5 flex-none text-brand" />
            <span>
              Kalau <span className="font-semibold text-fg">{mask(email)}</span> terdaftar, kode 6 angka sudah dikirim ke sana. Cek juga folder spam.
            </span>
          </p>
          <label className="relative block" onClick={() => otpRef.current?.focus()}>
            <span className="sr-only">Kode OTP</span>
            <input
              ref={otpRef}
              value={otp}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, "").slice(0, LEN);
                setOtp(v);
                if (error) setError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && onOtp()}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={LEN}
              className="absolute inset-0 h-full w-full cursor-text opacity-0"
            />
            <span aria-hidden className="grid grid-cols-6 gap-2">
              {Array.from({ length: LEN }, (_, i) => {
                const active = i === Math.min(otp.length, LEN - 1);
                return (
                  <span
                    key={i}
                    className={cx(
                      "flex h-14 items-center justify-center rounded-lg border bg-surface text-2xl font-bold tabular-nums transition",
                      error ? "border-danger/60" : active ? "border-brand ring-2 ring-brand/25" : otp[i] ? "border-line-strong" : "border-line"
                    )}
                  >
                    {otp[i] ?? ""}
                  </span>
                );
              })}
            </span>
          </label>
          {alert}
          <button type="submit" disabled={loading || otp.length !== LEN} className={cx(btn.primary, "min-h-12")}>
            {loading && <LoaderCircle size={18} className="animate-spin" />}
            {loading ? "Memeriksa..." : "Lanjut"}
          </button>
          <div className="flex items-center justify-between gap-3 text-sm">
            <button
              type="button"
              onClick={() => {
                setError("");
                setStep("email");
              }}
              className="inline-flex items-center gap-1.5 text-muted hover:text-fg"
            >
              <ArrowLeft size={15} /> Ganti email
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || loading}
              onClick={async () => {
                if (await requestCode(email)) setOtp("");
              }}
              className="font-semibold text-brand disabled:font-normal disabled:text-faint"
            >
              {cooldown > 0 ? `Kirim ulang dalam ${cooldown} dtk` : "Kirim ulang kode"}
            </button>
          </div>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={onPassword} className="grid gap-4">
          <label className="grid gap-1.5 text-sm font-semibold">
            Kata sandi baru
            <PasswordInput name="password" required minLength={8} maxLength={128} autoComplete="new-password" autoFocus />
            <span className="text-xs font-normal text-faint">Minimal 8 karakter. Campur huruf dan angka biar lebih aman.</span>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">
            Ulangi kata sandi baru
            <PasswordInput name="confirm" required minLength={8} maxLength={128} autoComplete="new-password" />
          </label>
          {alert}
          <button type="submit" disabled={loading} className={cx(btn.primary, "min-h-12")}>
            {loading && <LoaderCircle size={18} className="animate-spin" />}
            {loading ? "Menyimpan..." : "Simpan kata sandi"}
          </button>
        </form>
      )}
    </div>
  );
}

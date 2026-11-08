"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { Magnetic } from "@/components/Magnetic";
import { LogoMark } from "@/components/LogoMark";
import { useI18n } from "@/components/LocaleProvider";
import { Suspense } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { t } = useI18n();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(t("admin.loginFail"));
      setLoading(false);
      return;
    }
    router.push(params.get("next") || "/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-line bg-bg-elev p-6 shadow-[var(--shadow)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <LogoMark className="h-9 w-9" />
              <p className="text-sm tracking-[0.12em] text-accent">Dr. Sevara</p>
            </div>
            <h1 className="mt-2 text-3xl font-semibold">{t("admin.loginTitle")}</h1>
          </div>
          <LanguageSwitch />
        </div>
        <label className="mt-6 block text-sm">
          {t("admin.password")}
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            autoFocus
            required
            className="mt-1 w-full rounded-xl border border-line bg-bg px-3 py-2"
          />
        </label>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}
        <Magnetic className="mt-5 block w-full">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand py-3 text-sm font-medium text-white dark:text-ink"
          >
            {loading ? t("admin.entering") : t("admin.enter")}
          </button>
        </Magnetic>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

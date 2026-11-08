"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LanguageSwitch } from "../LanguageSwitch";
import { Magnetic } from "../Magnetic";
import { LogoMark } from "../LogoMark";
import { useI18n } from "../LocaleProvider";

export function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const path = pathname || "";
  if (path === "/admin/login") {
    return children;
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[16rem_1fr]">
      <aside className="border-b border-line bg-bg-elev md:border-r md:border-b-0">
        <div className="flex items-center justify-between px-5 py-4">
          <Magnetic strength={8}>
            <Link href="/" className="inline-flex items-center gap-2 rounded-xl text-xl font-semibold">
              <LogoMark className="h-9 w-9" />
              Dr. Sevara
            </Link>
          </Magnetic>
        </div>
        <div className="px-5 pb-4">
          <LanguageSwitch />
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-4 md:flex-col">
          <Magnetic className="block" strength={10}>
            <Link
              href="/admin/calendar"
              className={`block rounded-xl px-4 py-2 text-sm ${
                path.startsWith("/admin/calendar") || path === "/admin"
                  ? "bg-brand text-white dark:text-ink"
                  : "border border-line text-muted hover:text-ink"
              }`}
            >
              {t("admin.calendar")}
            </Link>
          </Magnetic>
        </nav>
        <div className="hidden px-5 pb-6 md:block">
          <Magnetic strength={8}>
            <button type="button" onClick={logout} className="rounded-xl px-2 py-1 text-sm text-muted hover:text-ink">
              {t("admin.logout")}
            </button>
          </Magnetic>
        </div>
      </aside>
      <div className="px-4 py-6 md:px-8">{children}</div>
    </div>
  );
}

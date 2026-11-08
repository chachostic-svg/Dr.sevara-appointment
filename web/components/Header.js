"use client";

import Link from "next/link";
import { useState } from "react";
import { telHref } from "@/lib/phone";
import { LIGHT_BTN_CLASS } from "@/lib/ui";
import { LanguageSwitch } from "./LanguageSwitch";
import { Magnetic } from "./Magnetic";
import { LogoMark } from "./LogoMark";
import { useI18n } from "./LocaleProvider";

export function Header({ phone = "" }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  function close() {
    setOpen(false);
  }

  const tel = telHref(phone);
  const links = [
    { href: "#about", label: t("nav.about") },
    { href: "#booking", label: t("nav.booking") },
    { href: "#reviews", label: t("nav.reviews") },
  ];

  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 px-4">
      <div className="pointer-events-auto mx-auto flex h-[72px] max-w-6xl items-center justify-between rounded-xl border border-white/20 bg-navy/80 px-3 text-white shadow-[0_12px_40px_rgba(11,42,68,0.32)] backdrop-blur-[18px] sm:px-4">
        <Link href="/" className="flex items-center gap-2.5 whitespace-nowrap text-[15px] font-semibold tracking-tight sm:text-base" onClick={close}>
          <LogoMark className="h-11 w-11" />
          Dr. Sevara
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] font-semibold lg:flex">
          {links.map((link) => (
            <Magnetic key={link.href} strength={10}>
              <a href={link.href} className="inline-block rounded-xl px-1 py-1 text-white/90 hover:text-sky">
                {link.label}
              </a>
            </Magnetic>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitch className="hidden lg:flex" tone="dark" />
          {phone && (
            <a href={tel} className="hidden items-center text-sm font-medium text-sky xl:inline-flex">
              {phone}
            </a>
          )}
          <Magnetic className="hidden sm:inline-block">
            <a href="#booking" className={`${LIGHT_BTN_CLASS} px-4 py-2.5`}>
              {t("nav.book")}
            </a>
          </Magnetic>
          <Magnetic className="lg:hidden" strength={10}>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/40 bg-transparent text-white"
              aria-label={open ? t("nav.closeMenu") : t("nav.openMenu")}
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <span className="sr-only">{t("nav.menu")}</span>
              {open ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 5h16M4 12h16M4 19h16" />
                </svg>
              )}
            </button>
          </Magnetic>
        </div>
      </div>

      {open && (
        <div className="pointer-events-auto mx-auto mt-3 max-w-6xl overflow-hidden rounded-xl border border-white/25 bg-navy/92 p-5 text-white shadow-[0_12px_40px_rgba(11,42,68,0.32)] backdrop-blur-[18px] lg:hidden">
          <nav className="flex flex-col gap-1 text-base font-semibold">
            {links.map((link, index) => (
              <a key={link.href} href={link.href} className="flex items-center gap-3 rounded-xl py-3" onClick={close}>
                <span className="w-6 text-xs font-medium text-sky">{String(index + 1).padStart(2, "0")}</span>
                {link.label}
              </a>
            ))}
            {phone && (
              <a href={tel} className="py-3 text-sky" onClick={close}>
                {phone}
              </a>
            )}
            <div className="mt-2 border-t border-white/15 pt-4">
              <LanguageSwitch tone="dark" />
            </div>
            <a href="#booking" className={`${LIGHT_BTN_CLASS} mt-3 w-full py-3`} onClick={close}>
              {t("nav.book")}
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}

"use client";

import { LOCALES } from "@/lib/i18n";
import { useI18n } from "./LocaleProvider";
import { Magnetic } from "./Magnetic";

export function LanguageSwitch({ className = "", tone = "light" }) {
  const { locale, setLocale } = useI18n();
  const dark = tone === "dark";

  return (
    <div className={`flex items-center gap-1 ${className}`.trim()}>
      {LOCALES.map((code) => (
        <Magnetic key={code} strength={8}>
          <button
            type="button"
            onClick={() => setLocale(code)}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium uppercase ${
              locale === code
                ? dark
                  ? "border-white bg-white text-navy"
                  : "border-navy bg-navy text-white dark:border-brand dark:bg-brand dark:text-navy"
                : dark
                  ? "border-white/40 bg-transparent text-white"
                  : "border-line bg-bg-elev text-muted"
            }`}
            aria-pressed={locale === code}
          >
            {code}
          </button>
        </Magnetic>
      ))}
    </div>
  );
}

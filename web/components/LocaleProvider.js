"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { DEFAULT_LOCALE, INTL_LOCALE, STORAGE_KEY, isLocale, normalizeLocale, translate } from "@/lib/i18n";

const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  intlLocale: INTL_LOCALE[DEFAULT_LOCALE],
  setLocale: () => {},
  t: (path, vars) => translate(DEFAULT_LOCALE, path, vars),
});

function persistLocale(next) {
  window.localStorage.setItem(STORAGE_KEY, next);
  document.cookie = `${STORAGE_KEY}=${next}; path=/; max-age=31536000; SameSite=Lax`;
}

export function LocaleProvider({ children, initialLocale = DEFAULT_LOCALE }) {
  const pathname = usePathname();
  const [locale, setLocaleState] = useState(() => normalizeLocale(initialLocale));

  useEffect(() => {
    const hasCookie = document.cookie.split(";").some((part) => part.trim().startsWith(`${STORAGE_KEY}=`));
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!hasCookie && isLocale(saved)) {
      setLocaleState(saved);
      persistLocale(saved);
      return;
    }
    persistLocale(locale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    const admin = (pathname || "").startsWith("/admin");
    const title = translate(locale, admin ? "admin.metaTitle" : "meta.title");
    const description = translate(locale, "meta.description");
    document.title = title;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", description);
  }, [locale, pathname]);

  const value = useMemo(() => {
    function setLocale(next) {
      if (!isLocale(next)) return;
      setLocaleState(next);
      persistLocale(next);
    }
    return {
      locale,
      intlLocale: INTL_LOCALE[locale],
      setLocale,
      t: (path, vars) => translate(locale, path, vars),
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  return useContext(LocaleContext);
}

"use client";

import { useEffect } from "react";
import { LocaleProvider } from "@/components/LocaleProvider";

export function Providers({ children, initialLocale }) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    try {
      window.localStorage.removeItem("theme");
    } catch {
      /* ignore */
    }
  }, []);

  return <LocaleProvider initialLocale={initialLocale}>{children}</LocaleProvider>;
}

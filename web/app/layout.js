import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
import Script from "next/script";
import { Providers } from "./providers";
import { STORAGE_KEY, normalizeLocale } from "@/lib/i18n";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "latin-ext", "cyrillic"],
});

export const metadata = {
  title: "Dr. Sevara — Хамидова Севара Миржалиловна, врач-невролог",
  description:
    "Запись к врачу-неврологу Хамидовой Севаре Миржалиловне. Взрослая и детская неврология. Medion Family Hospital и CityMed Clinic, 09:00–13:00.",
  icons: { icon: "/logo.jpg" },
};

export default async function RootLayout({ children }) {
  const jar = await cookies();
  const locale = normalizeLocale(jar.get(STORAGE_KEY)?.value);

  return (
    <html lang={locale} suppressHydrationWarning data-scroll-behavior="smooth" className={`${manrope.variable} h-full`}>
      <body className="min-h-full bg-bg text-ink antialiased">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
        <Script id="telegram-webapp-ready" strategy="beforeInteractive">
          {`try{var w=window.Telegram&&window.Telegram.WebApp;if(w){w.ready();w.expand();}}catch(e){}`}
        </Script>
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}

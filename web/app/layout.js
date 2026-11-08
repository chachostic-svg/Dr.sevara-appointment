import { Manrope } from "next/font/google";
import { cookies } from "next/headers";
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
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}

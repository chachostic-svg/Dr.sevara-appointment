import Script from "next/script";

export const metadata = {
  title: "Запись — Dr. Sevara",
  description: "Календарь записи к врачу-неврологу Хамидовой Севаре Миржалиловне.",
  robots: { index: false, follow: false },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function MiniLayout({ children }) {
  return (
    <>
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      {children}
    </>
  );
}

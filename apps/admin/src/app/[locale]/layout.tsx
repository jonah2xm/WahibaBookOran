import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Bodoni_Moda, Hanken_Grotesk, Noto_Kufi_Arabic } from "next/font/google";
import { routing, dirFor } from "@/i18n/routing";
import "../globals.css";

const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  variable: "--font-bodoni",
  display: "swap",
});
const hanken = Hanken_Grotesk({
  subsets: ["latin"],
  variable: "--font-hanken",
  display: "swap",
});
const kufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-kufi",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BookOran31 — Administration",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html
      lang={locale}
      dir={dirFor(locale)}
      className={`${bodoni.variable} ${hanken.variable} ${kufi.variable}`}
      /* the script below sets data-theme before React hydrates, so the
         server HTML and the client DOM differ on this element by design */
      suppressHydrationWarning
    >
      <head>
        {/* Applies the saved theme before first paint. Without it the admin
            flashes the light palette on every navigation for anyone who
            chose dark in A10. Kept in sync with THEME_KEY in ThemeToggle. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('bookoran31.admin.theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { Fraunces, Plus_Jakarta_Sans, Tajawal } from "next/font/google";
import { routing, dirFor } from "@/i18n/routing";
import { TabBar } from "@/components/TabBar";
import { CartProvider } from "@/components/CartProvider";
import { OfflineBanner } from "@/components/OfflineBanner";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

const tajawal = Tajawal({
  subsets: ["arabic"],
  weight: ["400", "500", "700"],
  variable: "--font-tajawal",
  display: "swap",
});

export const metadata: Metadata = {
  // Without metadataBase, every relative URL in a page's metadata resolves
  // against localhost and the shop advertises itself as unreachable.
  metadataBase: new URL(SITE_URL),
  // The pattern is what makes a page's own title show up as
  // "L'Étranger — Albert Camus · BookOran31" rather than replacing the brand.
  title: {
    default: "BookOran31",
    template: "%s · BookOran31",
  },
  description: "Des livres choisis, livrés partout en Algérie.",
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
      className={`${fraunces.variable} ${jakarta.variable} ${tajawal.variable}`}
    >
      <body>
        <NextIntlClientProvider>
          <CartProvider>
            {/* Phone-first: the board's frame is 390px. On wider screens the
                shop stays phone-width on the canvas backdrop rather than
                stretching into a layout nobody designed. */}
            <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col bg-paper shadow-lg">
              <OfflineBanner />
              <div className="flex-1">{children}</div>
              <TabBar />
            </div>
          </CartProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

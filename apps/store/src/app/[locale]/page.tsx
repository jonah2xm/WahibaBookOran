import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleToggle } from "@/components/LocaleToggle";
import { BookCard } from "@/components/BookCard";
import {
  IconPhone,
  IconReturn,
  IconSearch,
  IconTruck,
  IconWallet,
  IconChevron,
} from "@/components/icons";
import { getHomeRails, getShopSettings } from "@/lib/catalogue";
import { formatDzd } from "@/lib/format";

/** S1 — Accueil: hero · nouveautés · meilleures ventes. The board's category
 *  rail was removed — browsing happens on /livres now. */
export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [{ newArrivals, bestSellers }, settings] = await Promise.all([
    getHomeRails(),
    getShopSettings(),
  ]);

  const t = await getTranslations("home");
  const tb = await getTranslations("brand");
  const tt = await getTranslations("trust");
  const tbk = await getTranslations("books");

  return (
    <main className="flex flex-col">
      {/* top bar */}
      <header className="flex h-14 items-center justify-between px-4">
        <span className="font-display text-title lat">{tb("name")}</span>
        <div className="flex items-center gap-1">
          <Link
            href="/livres"
            aria-label={tbk("title")}
            className="grid h-11 w-11 place-items-center text-ink"
          >
            <IconSearch />
          </Link>
          <LocaleToggle />
        </div>
      </header>

      {/* hero band */}
      <section className="mx-4 flex flex-col gap-3 rounded-card bg-sand p-4">
        <p className="font-display text-display leading-tight text-ink">
          {t("tagline")}
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-surface px-3 py-1.5 text-caption text-ink-muted">
            {t("freeShipping", { amount: formatDzd(settings.freeShippingThresholdDzd) })}
          </span>
          <span className="rounded-full bg-surface px-3 py-1.5 text-caption text-ink-muted">
            {t("cod")}
          </span>
        </div>
      </section>

      {/* nouveautés — horizontal rail */}
      <section className="mt-7">
        <div className="flex items-baseline justify-between px-4">
          <h2 className="font-display text-title">{t("new")}</h2>
          <Link
            href="/livres"
            className="flex items-center gap-1 text-caption text-rose"
          >
            {t("seeAll")}
            <IconChevron />
          </Link>
        </div>
        <div className="rail mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
          {newArrivals.map((b) => (
            <BookCard key={b.slug} book={b} width={124} />
          ))}
        </div>
      </section>

      {/* meilleures ventes — 2 col grid, gap 12, gutter 16 */}
      <section className="mt-7">
        <h2 className="px-4 font-display text-title">{t("bestSellers")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 px-4">
          {bestSellers.map((b) => (
            <BookCard key={b.slug} book={b} />
          ))}
        </div>
      </section>

      {/* reassurance row */}
      <section className="mt-8 flex flex-col gap-3 bg-sand px-4 py-5">
        <ul className="flex flex-col gap-3">
          {[
            { Icon: IconWallet, label: tt("cod") },
            { Icon: IconTruck, label: tt("coverage") },
            { Icon: IconReturn, label: tt("returns") },
          ].map(({ Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-body">
              <Icon className="h-5 w-5 text-rose" />
              {label}
            </li>
          ))}
        </ul>
        <a
          href={`tel:${tb("phone").replace(/\s/g, "")}`}
          className="mt-1 flex items-center gap-3 text-body text-ink"
        >
          <IconPhone className="h-5 w-5 text-rose" />
          <span className="lat">{tb("phone")}</span>
          <span className="text-ink-muted">— {tb("city")}</span>
        </a>
      </section>
    </main>
  );
}

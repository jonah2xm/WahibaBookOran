import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleToggle } from "@/components/LocaleToggle";
import { BookCard } from "@/components/BookCard";
import { IconSearch, IconChevron } from "@/components/icons";
import { getHomeRails, getShopSettings } from "@/lib/catalogue";
import { formatDzd } from "@/lib/format";

/**
 * Re-render at most once a minute.
 *
 * Without this Next prerenders the page at build time and Vercel serves that
 * snapshot forever: adding a book in the admin changes nothing on the shop
 * until the next deploy. The catalogue and the conditions are both editable,
 * so neither can be frozen at build time.
 *
 * 60s rather than fully dynamic: a bookshop's catalogue changes a few times a
 * week, and a static page is much faster on a mobile connection.
 */
export const revalidate = 60;

/** Only rendered when the back-office has a public address; the board draws
 *  the link, but a link to nowhere is worse than no link. */
const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL;

/** S1 — Accueil: hero · nouveautés · note · meilleures ventes · pied. */
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

  const chip =
    "rounded-pill border border-paper/30 px-3.5 py-2 text-caption font-medium text-paper";

  return (
    <main className="flex flex-col">
      {/* Hero — the deep green block carries the masthead rather than sitting
          under it, so the shop opens on colour (board S1). */}
      <section className="relative overflow-hidden bg-deep pb-14">
        <div className="ornament pointer-events-none absolute inset-0 opacity-[0.11]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[170px] bg-gradient-to-b from-transparent to-[rgba(17,28,25,0.6)]" />

        <header className="relative flex items-center justify-between px-5 pt-5">
          <span className="lat flex items-baseline gap-1.5 font-display text-[23px] tracking-[-0.01em] text-paper">
            BookOran
            <em className="not-italic font-normal italic text-gold">31</em>
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/livres"
              aria-label={tbk("title")}
              className="grid h-11 w-11 place-items-center rounded-full border border-paper/30 text-paper"
            >
              <IconSearch className="h-[17px] w-[17px]" />
            </Link>
            <LocaleToggle onDark />
          </div>
        </header>

        <div className="relative px-5 pt-9">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-px w-[22px] bg-gold" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">
              {t("kicker")}
            </span>
          </div>
          <h1 className="font-display text-[42px] font-medium leading-[1.04] tracking-[-0.02em] text-paper text-pretty">
            {t.rich("taglineRich", {
              em: (c) => (
                <em className="font-normal italic text-gold">{c}</em>
              ),
            })}
          </h1>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className={chip}>
              {t("freeShipping", {
                amount: formatDzd(settings.freeShippingThresholdDzd),
              })}
            </span>
            <span className={chip}>{t("cod")}</span>
          </div>
        </div>
      </section>

      {/* Nouveautés — the 2px rule under a section head is the board's
          strongest structural signal; it replaces the old card edges. */}
      <section className="pt-7">
        <div className="mx-5 flex items-baseline justify-between border-b-2 border-ink pb-1.5">
          <h2 className="font-display text-display">{t("new")}</h2>
          <Link
            href="/livres"
            className="flex items-center gap-1 text-caption font-semibold text-rose"
          >
            {t("seeAll")}
            <IconChevron />
          </Link>
        </div>
        <div className="rail mt-5 flex gap-4 overflow-x-auto px-5 pb-6">
          {newArrivals.map((b) => (
            <BookCard key={b.slug} book={b} width={140} addable />
          ))}
        </div>
      </section>

      {/* the libraire's note */}
      <aside className="relative mx-5 mb-7 overflow-hidden bg-sand px-5 py-5">
        <span className="rule-tricolour absolute inset-x-0 top-0 h-1" />
        <p className="font-display text-[19px] italic leading-[1.35] text-pretty">
          {t("quote")}
        </p>
        <p className="mt-3 text-[10.5px] uppercase tracking-[0.16em] text-ink-muted">
          {t("signature")}
        </p>
      </aside>

      {/* Meilleures ventes — a ranked list, not a grid. The number is the
          row's position: the catalogue has no ranking field. */}
      <section className="px-5 pb-6">
        <div className="mb-1 border-b-2 border-ink pb-1.5">
          <h2 className="font-display text-display">{t("bestSellers")}</h2>
        </div>
        {bestSellers.map((b, i) => (
          <BookCard
            key={b.slug}
            book={b}
            variant="list"
            rank={i + 1}
            addable
          />
        ))}
      </section>

      {/* pied — the second green block closes the page the hero opened */}
      <section className="relative overflow-hidden bg-deep px-5 pb-9 pt-7">
        <div className="ornament-plain pointer-events-none absolute inset-0 opacity-[0.09]" />
        <dl className="relative grid grid-cols-2 gap-x-4 gap-y-5">
          {[
            [tt("payLabel"), tt("payValue")],
            [tt("shipLabel"), tt("shipValue")],
            [tt("returnLabel"), tt("returnValue")],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-[9px] uppercase tracking-[0.18em] text-paper/50">
                {label}
              </dt>
              <dd className="mt-1 text-body text-paper">{value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-[9px] uppercase tracking-[0.18em] text-paper/50">
              {tt("phoneLabel")}
            </dt>
            <dd className="mt-0.5">
              <a
                href={`tel:${tb("phone").replace(/\s/g, "")}`}
                className="lat font-display text-[17px] text-gold"
              >
                {tb("phone")}
              </a>
            </dd>
          </div>
        </dl>

        {ADMIN_URL ? (
          <a
            href={ADMIN_URL}
            className="relative mt-6 flex items-center justify-between border-t border-paper/15 pt-4"
          >
            <span className="text-[11px] uppercase tracking-[0.18em] text-paper/60">
              {t("adminSpace")}
            </span>
            <IconChevron className="h-3.5 w-3.5 text-paper/60" />
          </a>
        ) : null}
      </section>
    </main>
  );
}

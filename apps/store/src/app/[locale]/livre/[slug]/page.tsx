import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Cover } from "@/components/Cover";
import { BookCard } from "@/components/BookCard";
import { BookActions } from "@/components/BookActions";
import { LocaleToggle } from "@/components/LocaleToggle";
import { IconChevron, IconTruck } from "@/components/icons";
import { getBook, getSameAuthor } from "@/lib/catalogue";
import { ESTIMATED_DELIVERY_DZD } from "@/lib/geo";
import { pick, stockState } from "@/lib/types";
import { formatDzd } from "@/lib/format";

// No generateStaticParams: the catalogue is editable in the admin, so the
// set of book pages changes without a rebuild. These render on demand.

/** S4 — Fiche livre, barre d'action collante. */
export default async function BookPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const book = await getBook(slug);
  if (!book) notFound();

  const t = await getTranslations("book");
  const tb = await getTranslations("brand");
  const state = stockState(book);
  const others = await getSameAuthor(book);

  // floor, not round: 1 350 / 1 700 is 20.6% off and the board says −20%.
  // Rounding up would advertise a bigger discount than the customer gets.
  const discount = book.compareAtPriceDzd
    ? Math.floor((1 - book.priceDzd / book.compareAtPriceDzd) * 100)
    : null;

  return (
    // pb clears the fixed action bar
    <main className="flex flex-col pb-24">
      <header className="flex h-14 items-center justify-between px-2">
        <Link
          href="/"
          aria-label="Retour"
          className="grid h-11 w-11 place-items-center text-ink"
        >
          <span className="rotate-180 rtl:rotate-0">
            <IconChevron className="h-5 w-5" />
          </span>
        </Link>
        <LocaleToggle />
      </header>

      {/* cover on a sand band */}
      <div className="flex justify-center bg-sand px-4 py-6">
        <div className="w-[176px] shadow-md">
          <Cover book={book} locale={locale} />
        </div>
      </div>

      <div className="flex flex-col gap-2 px-4 pt-5">
        <h1 className="font-display text-display leading-tight">
          {pick(book.title, locale)}
        </h1>
        <p className="text-body text-ink-muted">
          {pick(book.author, locale)}
          {book.publisher ? ` · ${book.publisher}` : null}
        </p>

        <div className="mt-1 flex items-center gap-3">
          <span className="lat font-display text-display">
            {formatDzd(book.priceDzd)}
          </span>
          {book.compareAtPriceDzd && discount !== null ? (
            <>
              <span className="lat text-body text-ink-faint line-through">
                {formatDzd(book.compareAtPriceDzd)}
              </span>
              <span className="rounded-full bg-rose-50 px-2.5 py-1 text-micro font-semibold text-rose">
                {t("discount", { percent: discount })}
              </span>
            </>
          ) : null}
        </div>

        <p
          className={`mt-1 text-caption ${
            state.kind === "out"
              ? "text-ink-muted"
              : state.kind === "low"
                ? "text-warning"
                : "text-success"
          }`}
        >
          {state.kind === "out"
            ? t("outOfStock")
            : state.kind === "low"
              ? t("lowStock", { count: state.count })
              : t("inStockShipped")}
        </p>
      </div>

      <BookActions book={book} />

      {/* collapsible summary */}
      {book.summary ? (
        <details className="group mx-4 border-t border-sand-deep py-4" open>
          <summary className="flex cursor-pointer list-none items-center justify-between text-body font-semibold">
            {t("summary")}
            <span className="rotate-90 text-ink-muted transition-transform group-open:-rotate-90">
              <IconChevron />
            </span>
          </summary>
          <p className="pt-2 text-body text-ink-muted">
            {pick(book.summary, locale)}
          </p>
        </details>
      ) : null}

      {/* spec table */}
      <dl className="mx-4 border-t border-sand-deep py-2">
        {[
          [t("specs.publisher"), book.publisher],
          [t("specs.pages"), book.pageCount ? String(book.pageCount) : null],
          [
            t("specs.language"),
            book.bookLanguage ? t(`lang.${book.bookLanguage}`) : null,
          ],
          [t("specs.isbn"), book.isbn],
          [t("specs.weight"), `${book.weightGrams} g`],
        ]
          .filter(([, v]) => v)
          .map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between border-b border-sand-deep/60 py-2.5 last:border-0"
            >
              <dt className="text-caption text-ink-muted">{label}</dt>
              <dd className="lat text-caption text-ink">{value}</dd>
            </div>
          ))}
      </dl>

      {/* delivery estimate */}
      <section className="mx-4 mb-6 flex gap-3 rounded-card bg-sand p-4">
        <IconTruck className="h-5 w-5 shrink-0 text-rose" />
        <div className="flex flex-col gap-1">
          <span className="text-body font-semibold">
            {t("delivery.title", { city: tb("city") })}
          </span>
          <span className="text-caption text-ink-muted">
            {t("delivery.rates", {
              home: formatDzd(ESTIMATED_DELIVERY_DZD.home),
              desk: formatDzd(ESTIMATED_DELIVERY_DZD.desk),
            })}
          </span>
          <span className="text-caption text-ink-faint">
            {t("delivery.note")}
          </span>
        </div>
      </section>

      {others.length > 0 ? (
        <section className="mb-8">
          <h2 className="px-4 font-display text-title">{t("sameAuthor")}</h2>
          <div className="rail mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
            {others.map((b) => (
              <BookCard key={b.slug} book={b} width={124} />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

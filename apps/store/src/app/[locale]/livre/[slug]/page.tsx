import type { Metadata } from "next";
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
import { absolute, localeAlternates } from "@/lib/site";

// No generateStaticParams: the catalogue is editable in the admin, so the
// set of book pages changes without a rebuild. These render on demand.

/**
 * A book's own title and summary, in the visitor's language.
 *
 * Without this every page in the shop shares one title, so a search result
 * for a book reads "BookOran31" and a shared link says nothing about what is
 * being shared. The summary is the shop's own copy, so there is nothing to
 * invent here.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const book = await getBook(slug);
  if (!book) return {};

  const bookTitle = pick(book.title, locale);
  const author = pick(book.author, locale);
  const title = `${bookTitle} — ${author}`;

  // Most of the catalogue has no summary yet, and a book page with no
  // description at all is a wasted search result. The fallback says only what
  // the record already knows — it never invents anything about the book.
  const t = await getTranslations({ locale, namespace: "book" });
  const description = book.summary?.fr
    ? pick(book.summary, locale).slice(0, 200)
    : t("metaDescription", { title: bookTitle, author });

  const path = `/livre/${book.slug}`;

  return {
    title,
    description,
    alternates: {
      canonical: absolute(`/${locale}${path}`),
      languages: localeAlternates(path),
    },
    openGraph: {
      title,
      description,
      type: "website",
      locale,
      url: absolute(`/${locale}${path}`),
    },
  };
}

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
      <header className="relative overflow-hidden bg-deep pb-[34px]">
        <div className="ornament-plain pointer-events-none absolute inset-0 opacity-10" />
        <div className="relative flex items-center justify-between px-[22px] pt-5">
          <Link
            href="/"
            aria-label="Retour"
            className="grid h-11 w-11 place-items-center rounded-full border border-paper/30 text-paper"
          >
            <span className="rotate-180 rtl:rotate-0">
              <IconChevron className="h-4 w-4" />
            </span>
          </Link>
          <LocaleToggle onDark />
        </div>
        {/* The book floats on the green rather than sitting in a band: the
            board lifts it with a deeper shadow than any shelf copy. */}
        <div className="relative flex justify-center pt-6">
          <div className="w-[168px] [&_.book]:shadow-[0_30px_46px_-16px_rgba(10,20,17,0.75)]">
            <Cover book={book} locale={locale} />
          </div>
        </div>
      </header>

      <div className="flex flex-col px-[22px] pt-6">
        {book.publisher ? (
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#a98f6b]">
            {book.publisher}
          </p>
        ) : null}
        <h1 className="font-display text-[33px] font-semibold leading-[1.04] tracking-[-0.022em] text-pretty">
          {pick(book.title, locale)}
        </h1>
        <p className="mt-1.5 text-[14.5px] text-ink-muted">
          {pick(book.author, locale)}
        </p>

        <div className="mt-4 flex flex-wrap items-baseline gap-3.5 border-b-2 border-ink pb-4">
          <span className="lat font-display text-[30px] font-bold tracking-[-0.02em]">
            {formatDzd(book.priceDzd)}
          </span>
          {book.compareAtPriceDzd && discount !== null ? (
            <>
              <span className="lat text-body text-ink-faint line-through">
                {formatDzd(book.compareAtPriceDzd)}
              </span>
              <span className="rounded-pill bg-rose-50 px-2.5 py-1 text-micro font-semibold text-rose">
                {t("discount", { percent: discount })}
              </span>
            </>
          ) : null}
        <p
          className={`text-caption font-medium ${
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
      </div>

      <BookActions book={book} />

      {/* collapsible summary */}
      {book.summary ? (
        <section className="mx-[22px] border-b border-sand-deep pb-4 pt-[18px]">
          <h2 className="mb-2 font-display text-[20px]">{t("summary")}</h2>
          <p className="text-[14.5px] leading-[1.55] text-body text-pretty">
            {pick(book.summary, locale)}
          </p>
        </section>
      ) : null}

      {/* spec table */}
      <dl className="mx-[22px]">
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
              className="flex items-center justify-between gap-3 border-b border-sand-deep py-[13px]"
            >
              <dt className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">
                {label}
              </dt>
              <dd className="lat text-body font-medium text-ink">{value}</dd>
            </div>
          ))}
      </dl>

      {/* delivery estimate */}
      <section className="relative mx-[22px] mb-[26px] mt-[22px] overflow-hidden bg-sand p-[18px]">
        <span className="rule-tricolour absolute inset-x-0 top-0 h-[3px]" />
        <div className="flex flex-col gap-1">
          <span className="mb-1 flex items-center gap-2.5 font-display text-[17px]">
            <IconTruck className="h-4 w-4 shrink-0 text-rose" />
            {t("delivery.title", { city: tb("city") })}
          </span>
          <span className="text-[13.5px] text-body">
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
          <div className="mx-[22px] border-b-2 border-ink pb-1.5">
            <h2 className="font-display text-display">{t("sameAuthor")}</h2>
          </div>
          <div className="rail mt-5 flex gap-4 overflow-x-auto px-[22px] pb-2">
            {others.map((b) => (
              <BookCard key={b.slug} book={b} width={140} addable />
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}

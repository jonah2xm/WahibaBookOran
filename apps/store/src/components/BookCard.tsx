import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pick, stockState, type Book } from "@/lib/types";
import { Cover } from "./Cover";
import { Price } from "./Price";

/**
 * Board §02 "Carte livre — grille & liste".
 * Grid variant: cover 2:3, title in Fraunces, author muted, price.
 * Out-of-stock dims the cover and shows the label over it.
 */
export function BookCard({
  book,
  variant = "grid",
  width,
}: {
  book: Book;
  variant?: "grid" | "list";
  /** fixed width for the horizontal rails on S1 */
  width?: number;
}) {
  const locale = useLocale();
  const t = useTranslations("book");
  const state = stockState(book);
  const out = state.kind === "out";

  if (variant === "list") {
    return (
      <Link
        href={`/livre/${book.slug}`}
        className="flex gap-3 rounded-card bg-surface p-3 shadow-sm"
      >
        <div className="w-[64px] shrink-0">
          <Cover book={book} locale={locale} className={out ? "opacity-60" : ""} />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="font-display line-clamp-2 text-body font-semibold">
            {pick(book.title, locale)}
          </span>
          <span className="text-caption text-ink-muted">
            {pick(book.author, locale)}
          </span>
          <Price centimes={book.priceDzd} compareAt={book.compareAtPriceDzd} />
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/livre/${book.slug}`}
      className={`flex flex-col gap-2 ${width ? "shrink-0" : ""}`}
      style={width ? { width } : undefined}
    >
      <div className="relative">
        <Cover book={book} locale={locale} className={out ? "opacity-55" : ""} />
        {out ? (
          <span className="absolute inset-x-2 bottom-2 rounded-full bg-surface/95 px-2 py-1 text-center text-micro uppercase tracking-[0.06em] text-ink-muted">
            {t("outOfStock")}
          </span>
        ) : state.kind === "low" ? (
          <span className="absolute inset-x-2 bottom-2 rounded-full bg-surface/95 px-2 py-1 text-center text-micro uppercase tracking-[0.06em] text-warning">
            {t("lowStock", { count: state.count })}
          </span>
        ) : null}
      </div>
      <span className="font-display line-clamp-2 text-body font-semibold leading-snug">
        {pick(book.title, locale)}
      </span>
      <span className="-mt-1 line-clamp-1 text-caption text-ink-muted">
        {pick(book.author, locale)}
      </span>
      <Price centimes={book.priceDzd} compareAt={book.compareAtPriceDzd} />
    </Link>
  );
}

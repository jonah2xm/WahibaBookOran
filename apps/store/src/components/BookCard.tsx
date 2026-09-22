import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pick, stockState, type Book } from "@/lib/types";
import { AddToCartButton } from "./AddToCartButton";
import { Cover } from "./Cover";
import { Price } from "./Price";

/**
 * Board §02. Two shapes:
 *
 * - `grid` — the book above a hairline, its title, author, price and the
 *   add button below it. Used in the rails and the two-column grids.
 * - `list` — the numbered bestseller row: rank, thumbnail, title, price.
 *
 * The board puts the add button in the info block rather than on the cover,
 * so the artwork is never covered.
 */
export function BookCard({
  book,
  variant = "grid",
  width,
  addable = false,
  rank,
}: {
  book: Book;
  variant?: "grid" | "list";
  /** fixed width for the horizontal rails on S1 */
  width?: number;
  addable?: boolean;
  /** 1-based position, rendered as "01". The catalogue has no ranking
   *  field — this is the row's place in the list, nothing more. */
  rank?: number;
}) {
  const locale = useLocale();
  const t = useTranslations("book");
  const state = stockState(book);
  const out = state.kind === "out";
  const showAdd = addable && !out;

  if (variant === "list") {
    return (
      <article className="relative flex items-center gap-3.5 border-b border-sand-deep py-4">
        {rank !== undefined ? (
          <span className="lat w-6 shrink-0 font-display text-[20px] text-gold">
            {String(rank).padStart(2, "0")}
          </span>
        ) : null}
        <div className="w-11 shrink-0">
          <Cover book={book} locale={locale} small className={out ? "opacity-60" : ""} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col">
          <Link
            href={`/livre/${book.slug}`}
            className="font-display line-clamp-2 text-[18px] leading-[1.1] tracking-[-0.012em] after:absolute after:inset-0 after:content-['']"
          >
            {pick(book.title, locale)}
          </Link>
          <span className="mt-0.5 line-clamp-1 text-caption text-ink-muted">
            {pick(book.author, locale)}
          </span>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Price centimes={book.priceDzd} compareAt={book.compareAtPriceDzd} />
          {showAdd ? <AddToCartButton book={book} outline /> : null}
        </div>
      </article>
    );
  }

  return (
    <article
      className={`relative flex flex-col ${width ? "shrink-0" : ""}`}
      style={width ? { width } : undefined}
    >
      <div className="relative">
        <Cover book={book} locale={locale} className={out ? "opacity-55" : ""} />
        {out ? (
          <span className="absolute inset-x-2 bottom-2 z-10 rounded-pill bg-paper/95 px-2 py-1 text-center text-micro uppercase tracking-[0.06em] text-ink-muted">
            {t("outOfStock")}
          </span>
        ) : state.kind === "low" ? (
          <span className="absolute inset-x-2 bottom-2 z-10 rounded-pill bg-paper/95 px-2 py-1 text-center text-micro uppercase tracking-[0.06em] text-warning">
            {t("lowStock", { count: state.count })}
          </span>
        ) : null}
      </div>

      {/* The hairline under the cover is the board's device for tying the
          book to its caption — it replaces the old card's edge. */}
      <div className="mt-3 flex items-start justify-between gap-2 border-t border-ink pt-2.5">
        <div className="min-w-0">
          <Link
            href={`/livre/${book.slug}`}
            className="font-display line-clamp-2 text-[16px] leading-[1.12] tracking-[-0.01em] after:absolute after:inset-0 after:content-['']"
          >
            {pick(book.title, locale)}
          </Link>
          <span className="mt-0.5 line-clamp-1 text-[11.5px] text-ink-muted">
            {pick(book.author, locale)}
          </span>
          <div className="mt-1.5">
            <Price centimes={book.priceDzd} compareAt={book.compareAtPriceDzd} />
          </div>
        </div>
        {showAdd ? <AddToCartButton book={book} /> : null}
      </div>
    </article>
  );
}

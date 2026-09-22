import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { pick, stockState, type Book } from "@/lib/types";
import { AddToCartButton } from "./AddToCartButton";
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
  addable = false,
}: {
  book: Book;
  variant?: "grid" | "list";
  /** fixed width for the horizontal rails on S1 */
  width?: number;
  /** show the round "+" on the cover — two-column grids only, never the rails */
  addable?: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("book");
  const state = stockState(book);
  const out = state.kind === "out";

  const showAdd = addable && !out;

  if (variant === "list") {
    return (
      /* Same stretched link as the grid, for the same reason: the "+" has to
         be a sibling of the <a>, not a child of it. */
      <article className="relative flex items-center gap-3 rounded-card bg-surface p-3 shadow-sm">
        <div className="w-[64px] shrink-0">
          <Cover book={book} locale={locale} className={out ? "opacity-60" : ""} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <Link
            href={`/livre/${book.slug}`}
            className="font-display line-clamp-2 text-body font-semibold after:absolute after:inset-0 after:content-['']"
          >
            {pick(book.title, locale)}
          </Link>
          <span className="line-clamp-1 text-caption text-ink-muted">
            {pick(book.author, locale)}
          </span>
          <Price centimes={book.priceDzd} compareAt={book.compareAtPriceDzd} />
        </div>
        {/* At the end of the row, not on the cover: a 44px button over a
            64px thumbnail would bury it. */}
        {showAdd ? (
          <AddToCartButton book={book} className="relative" />
        ) : null}
      </article>
    );
  }

  return (
    /* The link is stretched over the card with a pseudo-element instead of
       wrapping it, so the "+" can be a real <button> beside it rather than
       nested inside an <a>. */
    <article
      className={`relative flex flex-col gap-2 ${width ? "shrink-0" : ""}`}
      style={width ? { width } : undefined}
    >
      <div className="relative">
        <Cover book={book} locale={locale} className={out ? "opacity-55" : ""} />
        {out ? (
          <span className="absolute inset-x-2 bottom-2 rounded-full bg-surface/95 px-2 py-1 text-center text-micro uppercase tracking-[0.06em] text-ink-muted">
            {t("outOfStock")}
          </span>
        ) : state.kind === "low" ? (
          <span
            /* The chip moves to the top when the "+" is there rather than
               sharing the bottom row: beside a 44px button a 124px rail card
               leaves it 60px, and "Plus que 3 exemplaires" would stack four
               lines deep. */
            className={`absolute inset-x-2 rounded-full bg-surface/95 px-2 py-1 text-center text-micro uppercase tracking-[0.06em] text-warning ${
              showAdd ? "top-2" : "bottom-2"
            }`}
          >
            {t("lowStock", { count: state.count })}
          </span>
        ) : null}
        {showAdd ? <AddToCartButton book={book} /> : null}
      </div>
      <Link
        href={`/livre/${book.slug}`}
        className="font-display line-clamp-2 text-body font-semibold leading-snug after:absolute after:inset-0 after:content-['']"
      >
        {pick(book.title, locale)}
      </Link>
      <span className="-mt-1 line-clamp-1 text-caption text-ink-muted">
        {pick(book.author, locale)}
      </span>
      <Price centimes={book.priceDzd} compareAt={book.compareAtPriceDzd} />
    </article>
  );
}

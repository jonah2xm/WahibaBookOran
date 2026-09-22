"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/CartProvider";
import { Cover } from "@/components/Cover";
import { QuantityStepper } from "@/components/QuantityStepper";
import { IconBag, IconChevron, IconTrash } from "@/components/icons";
import { pick, stockState } from "@/lib/types";
import { formatDzd } from "@/lib/format";

/** S5 — Panier, with the out-of-stock line that blocks checkout. */
export default function CartPage() {
  const locale = useLocale();
  const t = useTranslations("cart");
  const tb = useTranslations("book");
  const tn = useTranslations("nav");
  const {
    ready,
    lines,
    count,
    subtotal,
    hasBlockingLine,
    freeShippingThresholdDzd,
    setQuantity,
    remove,
  } = useCart();

  const missing = freeShippingThresholdDzd - subtotal;
  const freeShipPct =
    freeShippingThresholdDzd > 0
      ? Math.min(100, (subtotal / freeShippingThresholdDzd) * 100)
      : 100;

  const header = (
    <header className="flex items-center gap-3.5 border-b border-ink px-[22px] pb-3.5 pt-5">
      <Link
        href="/"
        aria-label={tn("back")}
        className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-ink text-ink hover:bg-sand"
      >
        <span className="rotate-180 rtl:rotate-0">
          <IconChevron className="h-[15px] w-[15px]" />
        </span>
      </Link>
      <h1 className="font-display text-[27px] font-semibold tracking-[-0.02em]">
        {t("title")}
      </h1>
      {count > 0 ? (
        <span className="lat text-[11px] uppercase tracking-[0.16em] text-ink-muted">
          · {count}
        </span>
      ) : null}
    </header>
  );

  // Before localStorage is read there is no truthful answer, so show the
  // skeleton rather than flashing the empty state at every visitor.
  if (!ready) {
    return (
      <main className="flex flex-col">
        {header}
        <div className="flex flex-col px-[22px]">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-4 border-b border-sand-deep py-[18px]">
              <div className="shimmer h-[84px] w-14 rounded-cover" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <div className="h-3 w-3/4 rounded-full bg-sand" />
                <div className="h-3 w-1/3 rounded-full bg-sand" />
              </div>
            </div>
          ))}
        </div>
      </main>
    );
  }

  // S5·b — empty cart
  if (lines.length === 0) {
    return (
      <main className="flex flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 py-16 text-center">
          <IconBag className="h-10 w-10 text-ink-faint" />
          <h2 className="font-display text-title">{t("empty.title")}</h2>
          <p className="text-body text-ink-muted">{t("empty.body")}</p>
          <Link
            href="/"
            className="mt-2 grid w-full place-items-center rounded-pill bg-rose px-5 py-4 text-[15px] font-semibold text-paper shadow-md"
          >
            {t("empty.primary")}
          </Link>
          <Link
            href="/livres"
            className="grid w-full place-items-center rounded-pill border border-ink px-5 py-4 text-[15px] font-semibold text-ink"
          >
            {t("empty.secondary")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col pb-28">
      {header}

      <ul className="flex flex-col px-[22px]">
        {lines.map((line) => {
          const out = stockState(line.book).kind === "out";
          const title = pick(line.book.title, locale);
          return (
            <li
              key={line.slug}
              className="flex flex-col gap-2 border-b border-sand-deep py-[18px]"
            >
              <div className="flex gap-[15px]">
                <Link href={`/livre/${line.slug}`} className="w-14 shrink-0">
                  <Cover
                    book={line.book}
                    locale={locale}
                    small
                    className={out ? "opacity-55" : ""}
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <Link
                    href={`/livre/${line.slug}`}
                    className="font-display line-clamp-2 text-[18px] leading-[1.1] tracking-[-0.012em]"
                  >
                    {title}
                  </Link>
                  {out ? (
                    <span className="text-caption font-medium text-danger">
                      {tb("outOfStock")}
                    </span>
                  ) : (
                    <span className="lat text-[13px] font-semibold">
                      {formatDzd(line.book.priceDzd)}
                    </span>
                  )}

                  <div className="flex items-center justify-between">
                    {out ? (
                      <button
                        type="button"
                        onClick={() => remove(line.slug)}
                        className="rounded-pill border border-danger px-4 py-2.5 text-caption font-semibold text-danger"
                      >
                        {t("remove")}
                      </button>
                    ) : (
                      <QuantityStepper
                        value={line.quantity}
                        onChange={(q) => setQuantity(line.slug, q)}
                        max={line.book.stockOnHand}
                      />
                    )}
                    {!out ? (
                      <button
                        type="button"
                        onClick={() => remove(line.slug)}
                        aria-label={t("removeItem", { title })}
                        className="grid h-11 w-11 place-items-center text-ink-muted hover:opacity-60"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {out ? (
                <p className="text-caption text-ink-muted">
                  {t("blockedByStock")}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>

      {/* summary */}
      <section className="flex flex-col px-[22px] pt-[22px]">
        <div className="flex items-baseline justify-between pb-3">
          <span className="text-[15px]">{t("subtotal")}</span>
          <span className="lat font-display text-[20px] font-semibold">
            {formatDzd(subtotal)}
          </span>
        </div>
        <div className="flex items-baseline justify-between border-b border-sand-deep pb-[18px]">
          <span className="text-[15px]">{t("delivery")}</span>
          <span className="text-[13px] text-ink-muted">
            {t("deliveryNextStep")}
          </span>
        </div>

        <div className="relative mt-5 overflow-hidden bg-sand px-[18px] py-4">
          <span className="rule-tricolour absolute inset-x-0 top-0 h-[3px]" />
          <p className="text-[13.5px] text-ink">
            {missing > 0
              ? t.rich("freeShipHint", {
                  amount: formatDzd(missing),
                  strong: (c) => <strong className="lat">{c}</strong>,
                })
              : t("freeShipReached")}
          </p>
          {/* The board turns the threshold into a distance you can see.
              Capped at 100 so an order past the threshold reads as done. */}
          <div
            className="mt-3 h-1 overflow-hidden bg-[rgba(26,21,18,0.12)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(freeShipPct)}
          >
            <div
              className="h-full bg-rose transition-[width] duration-400"
              style={{ width: `${freeShipPct}%` }}
            />
          </div>
        </div>
      </section>

      {/* fixed action bar — mirrors S4 */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-t border-ink bg-paper px-5 pb-5 pt-3.5">
        <div className="flex items-center gap-3.5 pb-[env(safe-area-inset-bottom)]">
          <div className="flex shrink-0 flex-col">
            <span className="text-[9px] uppercase tracking-[0.2em] text-ink-muted">
              {t("subtotal")}
            </span>
            <span className="lat mt-px font-display text-[22px] font-semibold tracking-[-0.01em]">
              {formatDzd(subtotal)}
            </span>
          </div>
          <Link
            href="/commande"
            aria-disabled={hasBlockingLine}
            onClick={(e) => hasBlockingLine && e.preventDefault()}
            className={`ms-auto grid flex-1 place-items-center rounded-pill px-5 py-4 text-[15px] font-semibold ${
              hasBlockingLine
                ? "pointer-events-none bg-sand-deep text-ink-faint"
                : "bg-rose text-paper shadow-md hover:bg-rose-hover"
            }`}
          >
            {t("checkout")}
          </Link>
        </div>
      </div>
    </main>
  );
}

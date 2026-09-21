"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useCart } from "@/components/CartProvider";
import { Cover } from "@/components/Cover";
import { QuantityStepper } from "@/components/QuantityStepper";
import { IconBag, IconChevron, IconInfo, IconTrash } from "@/components/icons";
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

  const header = (
    <header className="flex h-14 items-center gap-1 px-2">
      <Link
        href="/"
        aria-label={tn("back")}
        className="grid h-11 w-11 place-items-center text-ink"
      >
        <span className="rotate-180 rtl:rotate-0">
          <IconChevron className="h-5 w-5" />
        </span>
      </Link>
      <h1 className="font-display text-title">
        {t("title")}
        {count > 0 ? (
          <span className="lat ms-2 text-body text-ink-muted">· {count}</span>
        ) : null}
      </h1>
    </header>
  );

  // Before localStorage is read there is no truthful answer, so show the
  // skeleton rather than flashing the empty state at every visitor.
  if (!ready) {
    return (
      <main className="flex flex-col">
        {header}
        <div className="flex flex-col gap-3 px-4">
          {[0, 1].map((i) => (
            <div key={i} className="flex gap-3 rounded-card bg-surface p-3">
              <div className="shimmer h-[96px] w-[64px] rounded-cover" />
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
            className="mt-2 grid h-11 w-full place-items-center rounded-full bg-rose px-5 text-body font-semibold text-white"
          >
            {t("empty.primary")}
          </Link>
          <Link
            href="/livres"
            className="grid h-11 w-full place-items-center rounded-full border border-sand-deep bg-surface px-5 text-body font-semibold text-ink"
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

      <ul className="flex flex-col gap-3 px-4">
        {lines.map((line) => {
          const out = stockState(line.book).kind === "out";
          const title = pick(line.book.title, locale);
          return (
            <li
              key={line.slug}
              className={`flex flex-col gap-3 rounded-card bg-surface p-3 shadow-sm ${
                out ? "border border-danger/30" : ""
              }`}
            >
              <div className="flex gap-3">
                <Link href={`/livre/${line.slug}`} className="w-[64px] shrink-0">
                  <Cover
                    book={line.book}
                    locale={locale}
                    className={out ? "opacity-55" : ""}
                  />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Link
                    href={`/livre/${line.slug}`}
                    className="font-display line-clamp-2 text-body font-semibold"
                  >
                    {title}
                  </Link>
                  {out ? (
                    <span className="text-caption font-medium text-danger">
                      {tb("outOfStock")}
                    </span>
                  ) : (
                    <span className="lat text-body font-semibold">
                      {formatDzd(line.book.priceDzd)}
                    </span>
                  )}

                  <div className="mt-1 flex items-center justify-between">
                    {out ? (
                      <button
                        type="button"
                        onClick={() => remove(line.slug)}
                        className="h-11 rounded-full border border-danger/40 px-4 text-caption font-semibold text-danger"
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
                        className="grid h-11 w-11 place-items-center text-ink-faint"
                      >
                        <IconTrash className="h-5 w-5" />
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
      <section className="mx-4 mt-5 flex flex-col gap-2 rounded-card bg-surface p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-body text-ink-muted">{t("subtotal")}</span>
          <span className="lat text-body-lg font-semibold">
            {formatDzd(subtotal)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-body text-ink-muted">{t("delivery")}</span>
          <span className="text-caption text-ink-faint">
            {t("deliveryNextStep")}
          </span>
        </div>
        <div className="mt-1 flex items-start gap-2 rounded-input bg-rose-50 p-3">
          <IconInfo className="h-4 w-4 shrink-0 text-rose" />
          <span className="text-caption text-ink">
            {missing > 0
              ? t("freeShipHint", { amount: formatDzd(missing) })
              : t("freeShipReached")}
          </span>
        </div>
      </section>

      {/* fixed action bar — mirrors S4 */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-t border-sand-deep bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3 pb-[env(safe-area-inset-bottom)]">
          <div className="flex flex-col">
            <span className="text-micro uppercase tracking-[0.06em] text-ink-muted">
              {t("subtotal")}
            </span>
            <span className="lat font-display text-title">
              {formatDzd(subtotal)}
            </span>
          </div>
          <Link
            href="/commande"
            aria-disabled={hasBlockingLine}
            onClick={(e) => hasBlockingLine && e.preventDefault()}
            className={`ms-auto grid h-11 flex-1 place-items-center rounded-full px-5 text-body font-semibold ${
              hasBlockingLine
                ? "pointer-events-none bg-sand-deep text-ink-faint"
                : "bg-rose text-white hover:bg-rose-hover"
            }`}
          >
            {t("checkout")}
          </Link>
        </div>
      </div>
    </main>
  );
}

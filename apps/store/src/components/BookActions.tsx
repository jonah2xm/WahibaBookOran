"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { stockState, pick, type Book } from "@/lib/types";
import { QuantityStepper } from "./QuantityStepper";
import { useCart } from "./CartProvider";
import { useToast } from "./ToastProvider";
import { formatDzd, isolate } from "@/lib/format";

/**
 * S4 quantity + sticky action bar. The bar carries the running total, which
 * is the heaviest type on the screen (brief §10).
 */
export function BookActions({ book }: { book: Book }) {
  const t = useTranslations("book");
  const tc = useTranslations("cart");
  const locale = useLocale();
  const { add, lines } = useCart();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const out = stockState(book).kind === "out";

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  /**
   * What the customer can still add, not what the shop holds.
   *
   * Adding used to send them to the cart, so a second helping was a fresh
   * visit that re-read the cart. Now that the page stays put, repeated taps
   * would walk straight past the stock without this.
   */
  const inCart = lines.find((l) => l.slug === book.slug)?.quantity ?? 0;
  const remaining = Math.max(0, book.stockOnHand - inCart);
  const atCap = !out && remaining === 0;

  // Whatever is left may be smaller than what the stepper is showing from
  // before the last add, so the quantity is clamped on the way out too.
  const effective = Math.min(quantity, remaining);

  useEffect(() => {
    if (quantity > remaining && remaining > 0) setQuantity(remaining);
  }, [quantity, remaining]);

  function addToCart() {
    if (out || atCap) return;
    add(book.slug, effective);
    setJustAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 1400);
    // The tab bar is hidden on S4, so its badge cannot acknowledge this —
    // the toast is the only proof the basket changed.
    toast({
      message: tc("added", { title: isolate(pick(book.title, locale)) }),
      action: { label: tc("viewCart"), href: "/panier" },
    });
  }

  return (
    <>
      <div className="mx-[22px] flex items-center justify-between border-b border-sand-deep py-[18px]">
        <span className="text-[15px] font-medium">{t("quantity")}</span>
        <QuantityStepper
          value={effective || 1}
          onChange={setQuantity}
          max={Math.max(1, remaining)}
        />
      </div>

      {/* Fixed, not sticky: the bar's place in the document is mid-page, and
          sticky-bottom from there is unreliable across browsers. Pinned to
          the phone frame instead, matching the 480px shell in the layout. */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-t border-ink bg-paper px-5 pb-5 pt-3.5">
        <div className="flex items-center gap-3.5 pb-[env(safe-area-inset-bottom)]">
          <div className="flex shrink-0 flex-col">
            <span className="text-[9px] uppercase tracking-[0.2em] text-ink-muted">
              {t("total")}
            </span>
            <span className="lat mt-px font-display text-[22px] font-semibold tracking-[-0.01em]">
              {formatDzd(book.priceDzd * (effective || 0))}
            </span>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={out || atCap}
            className={`ms-auto flex-1 rounded-pill px-5 py-4 text-[15px] font-semibold text-paper shadow-md transition-colors disabled:bg-sand-deep disabled:text-ink-faint disabled:shadow-none ${
              justAdded ? "bg-success" : "bg-rose hover:bg-rose-hover"
            }`}
          >
            {out
              ? t("outOfStock")
              : atCap
                ? t("allInCart")
                : justAdded
                  ? t("addedToCart")
                  : t("addToCart")}
          </button>
        </div>
      </div>
    </>
  );
}

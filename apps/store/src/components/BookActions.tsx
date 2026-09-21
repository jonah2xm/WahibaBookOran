"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { stockState, type Book } from "@/lib/types";
import { QuantityStepper } from "./QuantityStepper";
import { useCart } from "./CartProvider";
import { formatDzd } from "@/lib/format";

/**
 * S4 quantity + sticky action bar. The bar carries the running total, which
 * is the heaviest type on the screen (brief §10).
 */
export function BookActions({ book }: { book: Book }) {
  const t = useTranslations("book");
  const router = useRouter();
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const out = stockState(book).kind === "out";

  function addToCart() {
    add(book.slug, quantity);
    // navigating to the cart gives the customer immediate proof it landed
    router.push("/panier");
  }

  return (
    <>
      <div className="flex items-center justify-between px-4 py-4">
        <span className="text-body font-semibold">{t("quantity")}</span>
        <QuantityStepper
          value={quantity}
          onChange={setQuantity}
          max={Math.max(1, book.stockOnHand)}
        />
      </div>

      {/* Fixed, not sticky: the bar's place in the document is mid-page, and
          sticky-bottom from there is unreliable across browsers. Pinned to
          the phone frame instead, matching the 480px shell in the layout. */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-t border-sand-deep bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3 pb-[env(safe-area-inset-bottom)]">
          <div className="flex shrink-0 flex-col">
            <span className="text-micro uppercase tracking-[0.06em] text-ink-muted">
              {t("total")}
            </span>
            <span className="lat font-display text-title">
              {formatDzd(book.priceDzd * quantity)}
            </span>
          </div>
          <button
            type="button"
            onClick={addToCart}
            disabled={out}
            className="ms-auto h-11 flex-1 rounded-full bg-rose px-5 text-body font-semibold text-white transition-colors hover:bg-rose-hover disabled:bg-sand-deep disabled:text-ink-faint"
          >
            {out ? t("outOfStock") : t("addToCart")}
          </button>
        </div>
      </div>
    </>
  );
}

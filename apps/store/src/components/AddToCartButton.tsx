"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { isolate } from "@/lib/format";
import { pick, stockState, type Book } from "@/lib/types";
import { useCart } from "./CartProvider";
import { useToast } from "./ToastProvider";

/**
 * The round "+" on a book card.
 *
 * It is a sibling of the card's link, not a child: a <button> inside an <a>
 * is invalid HTML, so BookCard stretches its link with a pseudo-element and
 * this button sits above it on z-20.
 *
 * `className` carries the placement, which differs per variant — over the
 * cover's corner in the grid, at the end of the row in the list — so the
 * button itself only owns its size and colours.
 */
export function AddToCartButton({
  book,
  className = "absolute bottom-2 end-2",
}: {
  book: Book;
  className?: string;
}) {
  const t = useTranslations("book");
  const tc = useTranslations("cart");
  const locale = useLocale();
  const { add, lines } = useCart();
  const toast = useToast();
  const [justAdded, setJustAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const inCart = lines.find((l) => l.slug === book.slug)?.quantity ?? 0;
  // Never let the card push the basket past what the shop actually holds —
  // the cart screen enforces the same cap through QuantityStepper.
  const atCap = inCart >= book.stockOnHand;
  const out = stockState(book).kind === "out";
  const disabled = out || atCap;

  function onAdd() {
    if (disabled) return;
    add(book.slug, 1);
    setJustAdded(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustAdded(false), 1100);
    toast({
      message: tc("added", { title: isolate(pick(book.title, locale)) }),
      action: { label: tc("viewCart"), href: "/panier" },
    });
  }

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      // the accessible name carries the title: "+" alone is meaningless in a
      // grid where every card has one
      aria-label={
        atCap && !out
          ? tc("maxStock", { title: isolate(pick(book.title, locale)) })
          : t("addTitleToCart", { title: isolate(pick(book.title, locale)) })
      }
      className={`${className} z-20 grid h-11 w-11 shrink-0 place-items-center rounded-full shadow-md transition-colors ${
        justAdded
          ? "pop bg-success text-white"
          : "bg-rose text-white hover:bg-rose-hover"
      } disabled:bg-surface/90 disabled:text-ink-faint disabled:shadow-sm`}
    >
      {justAdded ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="m5 12.5 4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}

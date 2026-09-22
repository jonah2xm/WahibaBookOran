"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { isolate } from "@/lib/format";
import { pick, stockState, type Book } from "@/lib/types";
import { useCart } from "./CartProvider";
import { useToast } from "./ToastProvider";

/**
 * The round "+" in a book card's info block.
 *
 * It is a sibling of the card's link, not a child: a <button> inside an <a>
 * is invalid HTML, so BookCard stretches its link with a pseudo-element and
 * this button sits above it on z-20.
 *
 * The board draws it at 26px. That is well under the 44px target the brief
 * requires, so the disc stays 26px and the hit area is grown around it with
 * a transparent ::before — the drawing is the board's, the tap target is
 * not negotiable.
 */
export function AddToCartButton({
  book,
  outline = false,
}: {
  book: Book;
  /** the bestseller row's variant: hairline ring instead of a filled disc */
  outline?: boolean;
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
      className={`tap relative z-20 grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full text-[16px] leading-none transition-colors ${
        justAdded
          ? "pop border border-success bg-success text-paper"
          : outline
            ? "border border-ink text-ink hover:bg-ink hover:text-paper"
            : "border border-ink bg-ink text-paper hover:border-rose hover:bg-rose"
      } disabled:border-sand-deep disabled:bg-transparent disabled:text-ink-faint`}
    >
      {justAdded ? (
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="m5 12.5 4.5 4.5L19 7.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
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

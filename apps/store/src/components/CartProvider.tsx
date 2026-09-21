"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { stockState, type Book } from "@/lib/types";

const STORAGE_KEY = "bookoran31.cart";

export type CartLine = { slug: string; quantity: number };
export type ResolvedLine = CartLine & { book: Book; lineTotal: number };

type CartValue = {
  /** false until localStorage AND the catalogue have arrived */
  ready: boolean;
  /** centimes; the shop's current free-delivery threshold */
  freeShippingThresholdDzd: number;
  lines: ResolvedLine[];
  count: number;
  subtotal: number;
  /** an out-of-stock line blocks checkout (board S5) */
  hasBlockingLine: boolean;
  add: (slug: string, quantity?: number) => void;
  setQuantity: (slug: string, quantity: number) => void;
  remove: (slug: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartValue | null>(null);

function read(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l) => typeof l?.slug === "string" && Number.isFinite(l?.quantity),
    );
  } catch {
    // private mode, blocked storage, corrupted value — an empty cart is fine
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [storageRead, setStorageRead] = useState(false);
  const [books, setBooks] = useState<Book[] | null>(null);
  const [threshold, setThreshold] = useState(0);

  useEffect(() => {
    setLines(read());
    setStorageRead(true);
  }, []);

  /**
   * The cart holds slugs; the prices and stock come from the catalogue.
   *
   * Fetched rather than bundled: a price or a stock level that changed after
   * the page was built must not keep showing the old number in someone's
   * cart. A failure leaves `books` null and `ready` false, so the cart shows
   * its loading state instead of silently rendering as empty.
   */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/catalogue")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("catalogue"))))
      .then((data) => {
        if (cancelled) return;
        setBooks(data.books as Book[]);
        setThreshold(data.settings?.freeShippingThresholdDzd ?? 0);
      })
      .catch(() => {
        if (!cancelled) setBooks(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = storageRead && books !== null;

  useEffect(() => {
    // Keyed on storageRead, not ready: the cart must still persist when the
    // catalogue fetch fails, or a refresh would throw away the basket.
    if (!storageRead) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage unavailable — the cart still works for this session */
    }
  }, [lines, storageRead]);

  const add = useCallback((slug: string, quantity = 1) => {
    setLines((prev) => {
      const found = prev.find((l) => l.slug === slug);
      if (found) {
        return prev.map((l) =>
          l.slug === slug ? { ...l, quantity: l.quantity + quantity } : l,
        );
      }
      return [...prev, { slug, quantity }];
    });
  }, []);

  const setQuantity = useCallback((slug: string, quantity: number) => {
    setLines((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.slug !== slug)
        : prev.map((l) => (l.slug === slug ? { ...l, quantity } : l)),
    );
  }, []);

  const remove = useCallback((slug: string) => {
    setLines((prev) => prev.filter((l) => l.slug !== slug));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartValue>(() => {
    const resolved: ResolvedLine[] = lines.flatMap((l) => {
      const book = books?.find((b) => b.slug === l.slug);
      // A slug the catalogue no longer has was withdrawn or renamed. It is
      // dropped from the view rather than rendered as a blank row; the stored
      // line survives in case it comes back.
      if (!book) return [];
      return [{ ...l, book, lineTotal: book.priceDzd * l.quantity }];
    });

    return {
      ready,
      freeShippingThresholdDzd: threshold,
      lines: resolved,
      count: resolved.reduce((n, l) => n + l.quantity, 0),
      // an out-of-stock line is excluded from the subtotal: the customer
      // cannot buy it, so charging for it in the summary would be a lie
      subtotal: resolved
        .filter((l) => stockState(l.book).kind !== "out")
        .reduce((n, l) => n + l.lineTotal, 0),
      hasBlockingLine: resolved.some(
        (l) => stockState(l.book).kind === "out",
      ),
      add,
      setQuantity,
      remove,
      clear,
    };
  }, [lines, ready, books, threshold, add, setQuantity, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}

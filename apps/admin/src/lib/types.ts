/** Bilingual string. `ar` is optional: the storefront falls back to `fr`
 *  so the shop can launch in French and gain Arabic content later. */
export type Bilingual = { fr: string; ar?: string };

export function pick(value: Bilingual, locale: string): string {
  return locale === "ar" && value.ar ? value.ar : value.fr;
}

export type Category = {
  slug: string;
  name: Bilingual;
  sortOrder: number;
};

export type Book = {
  slug: string;
  title: Bilingual;
  author: Bilingual;
  summary?: Bilingual;
  categorySlugs: string[];
  /** integer centimes of DZD — never a float */
  priceDzd: number;
  compareAtPriceDzd?: number | null;
  coverUrl?: string | null;
  /** cover placeholder tint index (0-4) while real covers are missing */
  coverTint?: number;
  stockOnHand: number;
  lowStockThreshold: number;
  weightGrams: number;
  isbn?: string;
  publisher?: string;
  pageCount?: number;
  bookLanguage?: "fr" | "ar";
  isNew?: boolean;
  isBestSeller?: boolean;
};

export type StockState =
  | { kind: "in" }
  | { kind: "low"; count: number }
  | { kind: "out" };

export function stockState(book: Book): StockState {
  if (book.stockOnHand <= 0) return { kind: "out" };
  if (book.stockOnHand <= book.lowStockThreshold)
    return { kind: "low", count: book.stockOnHand };
  return { kind: "in" };
}

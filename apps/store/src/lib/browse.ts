/** Shared shape for the /livres listing state, which lives in the URL. */

export type SortKey =
  | "newest"
  | "alphaAsc"
  | "alphaDesc"
  | "priceAsc"
  | "priceDesc";

export const SORT_KEYS: SortKey[] = [
  "newest",
  "alphaAsc",
  "alphaDesc",
  "priceAsc",
  "priceDesc",
];

export type Filters = {
  sort: SortKey;
  /** a single category slug, or null for all */
  category: string | null;
  /** centimes, null = unbounded */
  min: number | null;
  max: number | null;
};

export const defaultFilters: Filters = {
  sort: "newest",
  category: null,
  min: null,
  max: null,
};

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { BookCard } from "./BookCard";
import { PriceSheet } from "./PriceSheet";
import { SelectSheet } from "./SelectSheet";
import { IconChevron, IconSearch } from "./icons";
import {
  SORT_KEYS,
  defaultFilters,
  type Filters,
  type SortKey,
} from "@/lib/browse";
import { pick, type Book, type Category } from "@/lib/types";
import { formatDzd } from "@/lib/format";

/** Accent- and harakat-insensitive, so "bejaia" finds "Béjaïa". */
function normalise(s: string) {
  return s
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/[̀-ًͯ-ْ]/g, "");
}

/**
 * "Tous les livres" — the single listing screen.
 *
 * Categories and sorting are visible controls; only the price range lives in
 * a sheet. Filter state is held in the URL, so a filtered view is shareable
 * and the back button steps through it.
 */
export function BooksBrowser({
  books,
  categories,
}: {
  books: Book[];
  categories: Category[];
}) {
  const locale = useLocale();
  const t = useTranslations("books");
  const tf = useTranslations("filters");
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [priceOpen, setPriceOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const activeChipRef = useRef<HTMLButtonElement>(null);

  const query = params.get("q") ?? "";
  const filters: Filters = useMemo(() => {
    const sortParam = params.get("tri");
    const sort: SortKey = SORT_KEYS.includes(sortParam as SortKey)
      ? (sortParam as SortKey)
      : defaultFilters.sort;
    const cat = params.get("categorie");
    const num = (key: string) => {
      const raw = params.get(key);
      const n = raw === null ? NaN : Number(raw);
      return Number.isFinite(n) ? n : null;
    };
    return {
      sort,
      category: categories.some((c) => c.slug === cat) ? cat : null,
      min: num("min"),
      max: num("max"),
    };
  }, [params]);

  /** Writes state to the URL. `replace` keeps typing out of the history. */
  const push = useCallback(
    (next: { query?: string; filters?: Filters }, mode: "push" | "replace") => {
      const q = next.query ?? query;
      const f = next.filters ?? filters;
      const sp = new URLSearchParams();
      if (q.trim()) sp.set("q", q.trim());
      if (f.sort !== defaultFilters.sort) sp.set("tri", f.sort);
      if (f.category) sp.set("categorie", f.category);
      if (f.min !== null) sp.set("min", String(f.min));
      if (f.max !== null) sp.set("max", String(f.max));
      const qs = sp.toString();
      router[mode](qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [query, filters, pathname, router],
  );

  const bounds = useMemo(() => {
    const prices = books.map((b) => b.priceDzd);
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, []);

  const results = useMemo(() => {
    const q = normalise(query.trim());
    const collator = new Intl.Collator(locale, { sensitivity: "base" });

    const filtered = books.filter((b) => {
      if (filters.min !== null && b.priceDzd < filters.min) return false;
      if (filters.max !== null && b.priceDzd > filters.max) return false;
      if (filters.category && !b.categorySlugs.includes(filters.category)) {
        return false;
      }
      if (q) {
        const haystack = [
          b.title.fr,
          b.title.ar ?? "",
          b.author.fr,
          b.author.ar ?? "",
          b.publisher ?? "",
        ]
          .map(normalise)
          .join(" ");
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    // Sort on the title the customer actually sees, with that locale's
    // collator — an Arabic title ordered by a French collator is nonsense.
    switch (filters.sort) {
      case "priceAsc":
        return [...filtered].sort((a, b) => a.priceDzd - b.priceDzd);
      case "priceDesc":
        return [...filtered].sort((a, b) => b.priceDzd - a.priceDzd);
      case "alphaAsc":
        return [...filtered].sort((a, b) =>
          collator.compare(pick(a.title, locale), pick(b.title, locale)),
        );
      case "alphaDesc":
        return [...filtered].sort((a, b) =>
          collator.compare(pick(b.title, locale), pick(a.title, locale)),
        );
      default:
        return filtered;
    }
  }, [query, filters, locale]);

  useEffect(() => {
    // `nearest` block so this never scrolls the page vertically
    activeChipRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
    });
  }, [filters.category]);

  const priceSet = filters.min !== null || filters.max !== null;
  const priceLabel = priceSet
    ? t("priceRange", {
        min: formatDzd(filters.min ?? bounds.min),
        max: formatDzd(filters.max ?? bounds.max),
      })
    : t("priceAny");

  return (
    <>
      <header className="flex flex-col bg-paper pt-5">
        <div className="flex items-baseline justify-between px-[22px]">
          <h1 className="font-display text-[32px] font-semibold tracking-[-0.02em]">
            {t("title")}
          </h1>
          <span className="text-[11px] uppercase tracking-[0.14em] text-ink-muted">
            {t("count", { count: results.length })}
          </span>
        </div>

        {/* An underline, not a pill: the board sets search on the same
            hairline grammar as the rest of the page. */}
        <div className="mx-[22px] mt-4 flex items-center gap-2.5 border-b border-ink pb-2.5">
          <IconSearch className="h-4 w-4 shrink-0 text-ink-muted" />
          <input
            value={query}
            onChange={(e) => push({ query: e.target.value }, "replace")}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ink-muted"
          />
          {query ? (
            <button
              type="button"
              onClick={() => push({ query: "" }, "replace")}
              aria-label={tf("reset")}
              className="grid h-8 w-8 shrink-0 place-items-center text-ink-faint"
            >
              ×
            </button>
          ) : null}
        </div>

        {/* sort + price — labelled values on a rule, not buttons */}
        <div className="flex items-center gap-4 px-[22px] pt-3.5">
          <button
            type="button"
            onClick={() => setSortOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={sortOpen}
            className="flex min-h-11 items-center gap-1.5"
          >
            <span className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              {t("sortLabel")}
            </span>
            <span className="text-[13.5px] font-semibold">
              {tf(filters.sort)}
            </span>
            <span className="rotate-90 text-ink">
              <IconChevron className="h-[11px] w-[11px]" />
            </span>
          </button>

          <span className="h-4 w-px shrink-0 bg-sand-deep" />

          <button
            type="button"
            onClick={() => setPriceOpen(true)}
            aria-haspopup="dialog"
            className="flex min-h-11 items-center gap-1.5"
          >
            <span className="text-[10px] uppercase tracking-[0.16em] text-ink-muted">
              {tf("price")}
            </span>
            <span
              className={`text-[13.5px] font-semibold ${priceSet ? "lat text-rose" : ""}`}
            >
              {priceLabel}
            </span>
          </button>

          {/* a sibling, not nested inside the button above: interactive
              elements cannot contain other interactive elements */}
          {priceSet ? (
            <button
              type="button"
              aria-label={tf("reset")}
              onClick={() =>
                push({ filters: { ...filters, min: null, max: null } }, "push")
              }
              className="-ms-2.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full bg-sand text-[12px] text-ink-muted"
            >
              ×
            </button>
          ) : null}
        </div>

        {/* category rail — one at a time, "Tous" clears it */}
        <div className="rail flex gap-2 overflow-x-auto px-[22px] pb-[18px] pt-4">
          <button
            type="button"
            aria-pressed={filters.category === null}
            onClick={() => push({ filters: { ...filters, category: null } }, "push")}
            className={`shrink-0 rounded-pill border border-ink px-[15px] py-2 text-caption font-semibold ${
              filters.category === null
                ? "bg-ink text-paper"
                : "text-ink"
            }`}
          >
            {t("all")}
          </button>
          {categories.map((c) => {
            const active = filters.category === c.slug;
            return (
              <button
                key={c.slug}
                type="button"
                // landing on /livres?categorie=x must show which chip is on,
                // even when it sits off the end of the rail
                ref={active ? activeChipRef : undefined}
                aria-pressed={active}
                onClick={() =>
                  push({ filters: { ...filters, category: c.slug } }, "push")
                }
                className={`shrink-0 rounded-pill border border-ink px-[15px] py-2 text-caption font-semibold ${
                  active ? "bg-ink text-paper" : "text-ink"
                }`}
              >
                {pick(c.name, locale)}
              </button>
            );
          })}
        </div>
      </header>

      {results.length > 0 ? (
        <div className="mx-[22px] grid grid-cols-2 gap-x-4 gap-y-[26px] border-t-2 border-ink pb-8 pt-[22px]">
          {results.map((b) => (
            <BookCard key={b.slug} book={b} addable />
          ))}
        </div>
      ) : (
        <section className="flex flex-col items-center gap-3 px-8 py-16 text-center">
          <IconSearch className="h-10 w-10 text-ink-faint" />
          <h2 className="font-display text-title">{t("noResultsTitle")}</h2>
          <p className="text-body text-ink-muted">{t("noResultsBody")}</p>
          <button
            type="button"
            onClick={() => push({ query: "", filters: defaultFilters }, "push")}
            className="mt-2 h-11 rounded-full bg-rose px-6 text-body font-semibold text-paper"
          >
            {t("clearAll")}
          </button>
        </section>
      )}

      <SelectSheet
        open={sortOpen}
        title={t("sortLabel")}
        value={filters.sort}
        options={SORT_KEYS.map((s) => ({ value: s, label: tf(s) }))}
        onPick={(sort) => push({ filters: { ...filters, sort } }, "push")}
        onClose={() => setSortOpen(false)}
      />

      <PriceSheet
        open={priceOpen}
        onClose={() => setPriceOpen(false)}
        value={filters}
        onChange={(f) => push({ filters: f }, "replace")}
        bounds={bounds}
        resultCount={results.length}
      />
    </>
  );
}

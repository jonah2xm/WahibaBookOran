"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { BookCard } from "./BookCard";
import { PriceSheet } from "./PriceSheet";
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
      <header className="sticky top-0 z-10 flex flex-col gap-3 border-b border-sand-deep bg-paper/95 pb-3 pt-3 backdrop-blur">
        <div className="flex items-baseline justify-between px-4">
          <h1 className="font-display text-title">{t("title")}</h1>
          <span className="text-caption text-ink-muted">
            {t("count", { count: results.length })}
          </span>
        </div>

        <div className="mx-4 flex h-11 items-center gap-2 rounded-full border border-sand-deep bg-surface px-4">
          <IconSearch className="h-5 w-5 text-ink-faint" />
          <input
            value={query}
            onChange={(e) => push({ query: e.target.value }, "replace")}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchPlaceholder")}
            className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ink-faint"
          />
          {query ? (
            <button
              type="button"
              onClick={() => push({ query: "" }, "replace")}
              aria-label={tf("reset")}
              className="grid h-8 w-8 place-items-center text-ink-faint"
            >
              ×
            </button>
          ) : null}
        </div>

        {/* sort + price */}
        <div className="flex items-center gap-2 px-4">
          <span className="relative flex flex-1 items-center">
            <select
              value={filters.sort}
              aria-label={t("sortLabel")}
              onChange={(e) =>
                push(
                  { filters: { ...filters, sort: e.target.value as SortKey } },
                  "push",
                )
              }
              className="h-10 w-full appearance-none rounded-full border border-sand-deep bg-surface ps-4 pe-9 text-caption font-medium text-ink outline-none"
            >
              {SORT_KEYS.map((s) => (
                <option key={s} value={s}>
                  {tf(s)}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute end-3 rotate-90 text-ink-muted">
              <IconChevron className="h-3.5 w-3.5" />
            </span>
          </span>

          <button
            type="button"
            onClick={() => setPriceOpen(true)}
            className={`flex h-10 shrink-0 items-center rounded-full border px-4 text-caption font-medium ${
              priceSet
                ? "border-rose bg-rose-50 text-rose"
                : "border-sand-deep bg-surface text-ink"
            }`}
          >
            <span className={priceSet ? "lat" : undefined}>{priceLabel}</span>
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
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-sand-deep bg-surface text-ink-muted"
            >
              ×
            </button>
          ) : null}
        </div>

        {/* category rail — one at a time, "Tous" clears it */}
        <div className="rail flex gap-2 overflow-x-auto px-4">
          <button
            type="button"
            aria-pressed={filters.category === null}
            onClick={() => push({ filters: { ...filters, category: null } }, "push")}
            className={`h-10 shrink-0 rounded-full border px-4 text-caption font-medium ${
              filters.category === null
                ? "border-rose bg-rose text-white"
                : "border-sand-deep bg-surface text-ink"
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
                className={`h-10 shrink-0 rounded-full border px-4 text-caption font-medium ${
                  active
                    ? "border-rose bg-rose text-white"
                    : "border-sand-deep bg-surface text-ink"
                }`}
              >
                {pick(c.name, locale)}
              </button>
            );
          })}
        </div>
      </header>

      {results.length > 0 ? (
        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-5 px-4 pb-6">
          {results.map((b) => (
            <BookCard key={b.slug} book={b} />
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
            className="mt-2 h-11 rounded-full bg-rose px-6 text-body font-semibold text-white"
          >
            {t("clearAll")}
          </button>
        </section>
      )}

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

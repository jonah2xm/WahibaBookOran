"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loading, LoadFailed } from "@/components/Async";
import { IconChevron } from "@/components/icons";
import { api, messageFor } from "@/lib/client";
import { pick, stockState, type Book } from "@/lib/types";

type Filter = "all" | "low" | "out";

/** A5 — Stock: l'état des quantités, livre par livre. */
export default function StockPage() {
  const locale = useLocale();
  const t = useTranslations("stock");
  const tc = useTranslations("common");
  const [books, setBooks] = useState<Book[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get<{ items: Book[] }>("/api/books");
      setBooks(data.items);
    } catch (e) {
      setBooks(null);
      setError(messageFor(e, tc("loadFailed")));
    }
  }, [tc]);

  useEffect(() => {
    void load();
  }, [load]);

  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return (books ?? [])
      .filter((b) => {
        const s = stockState(b);
        if (filter === "low" && s.kind !== "low") return false;
        if (filter === "out" && s.kind !== "out") return false;
        if (!q) return true;
        return [b.title.fr, b.title.ar ?? "", b.author.fr]
          .join(" ")
          .toLocaleLowerCase()
          .includes(q);
      })
      // Problems first. This is the opposite of the storefront, where the
      // customer picked the order — here the whole point of the screen is
      // what needs restocking, so the screen decides.
      .sort((a, b) => a.stockOnHand - b.stockOnHand);
  }, [books, query, filter]);

  const lowCount = (books ?? []).filter((b) => stockState(b).kind === "low").length;
  const outCount = (books ?? []).filter((b) => stockState(b).kind === "out").length;

  const chips: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: t("all") },
    { key: "low", label: t("low"), count: lowCount },
    { key: "out", label: t("out"), count: outCount },
  ];

  return (
    <main className="flex flex-col pb-8">
      <header className="flex flex-col gap-3 px-4 pb-3 pt-4">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-title">{t("title")}</h1>
          {books ? (
            <span className="lat text-body text-ink-muted">{books.length}</span>
          ) : null}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="field-underline"
        />

        <div className="rail flex gap-2 overflow-x-auto">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={filter === c.key}
              onClick={() => setFilter(c.key)}
              className={`h-10 shrink-0 rounded-pill border px-4 text-caption font-medium ${
                filter === c.key
                  ? "border-rose bg-rose text-paper"
                  : "border-sand-deep bg-surface text-ink"
              }`}
            >
              {c.label}
              {c.count ? <span className="lat"> · {c.count}</span> : null}
            </button>
          ))}
        </div>
      </header>

      {error ? <LoadFailed message={error} onRetry={load} /> : null}
      {!books && !error ? <Loading rows={6} /> : null}

      <ul className="flex flex-col gap-2 px-4">
        {shown.map((b) => {
          const state = stockState(b);
          return (
            <li key={b.slug}>
              <Link
                href={`/stock/${b.slug}`}
                className="flex items-center gap-3 border border-sand-deep p-3"
              >
                <span
                  className={`lat grid h-12 w-12 shrink-0 place-items-center rounded-card font-display text-body-lg font-semibold ${
                    state.kind === "out"
                      ? "bg-danger/12 text-danger"
                      : state.kind === "low"
                        ? "bg-warning/12 text-warning"
                        : "bg-success/12 text-success"
                  }`}
                >
                  {b.stockOnHand}
                </span>

                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-display line-clamp-1 text-body font-semibold">
                    {pick(b.title, locale)}
                  </span>
                  <span className="line-clamp-1 text-caption text-ink-muted">
                    {state.kind === "out"
                      ? t("soldOut")
                      : t("threshold", { n: b.lowStockThreshold })}
                  </span>
                </span>

                <IconChevron className="h-4 w-4 shrink-0 text-ink-faint" />
              </Link>
            </li>
          );
        })}
      </ul>

      {books && shown.length === 0 ? (
        <p className="px-8 py-14 text-center text-body text-ink-muted">
          {t("none")}
        </p>
      ) : null}
    </main>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loading, LoadFailed } from "@/components/Async";
import { IconChevron } from "@/components/icons";
import { api, messageFor } from "@/lib/client";
import { pick, stockState, type Book, type Category } from "@/lib/types";
import { formatDzd } from "@/lib/format";

type Chip = { key: string; label: string };
type Payload = { items: Book[]; categories: Category[] };

/** A3 — Livres: liste de cartes + FAB. */
export default function AdminBooksPage() {
  const locale = useLocale();
  const t = useTranslations("books");
  const tc = useTranslations("common");

  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [chip, setChip] = useState("all");
  const [showAddHint, setShowAddHint] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      setData(await api.get<Payload>("/api/books"));
    } catch (e) {
      setData(null);
      setError(messageFor(e, tc("loadFailed")));
    }
  }, [tc]);

  useEffect(() => {
    void load();
  }, [load]);

  const books = data?.items ?? [];
  const categories = data?.categories ?? [];

  const chips: Chip[] = [
    { key: "all", label: t("all") },
    ...categories.slice(0, 2).map((c) => ({
      key: c.slug,
      label: pick(c.name, locale),
    })),
    { key: "low", label: t("lowStock") },
  ];

  const shown = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return books.filter((b) => {
      if (chip === "low") {
        if (stockState(b).kind === "in") return false;
      } else if (chip !== "all" && !b.categorySlugs.includes(chip)) {
        return false;
      }
      if (!q) return true;
      return [b.title.fr, b.title.ar ?? "", b.author.fr, b.isbn ?? ""]
        .join(" ")
        .toLocaleLowerCase()
        .includes(q);
    });
  }, [books, query, chip]);

  return (
    <main className="flex flex-col pb-24">
      <header className="flex flex-col gap-3 px-4 pb-3 pt-4">
        <div className="flex items-baseline gap-2">
          <h1 className="font-display text-title">{t("title")}</h1>
          {data ? (
            <span className="lat text-body text-ink-muted">{books.length}</span>
          ) : null}
        </div>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("searchPlaceholder")}
          aria-label={t("searchPlaceholder")}
          className="h-11 w-full rounded-input border border-sand-deep bg-surface px-4 text-body outline-none placeholder:text-ink-faint focus:border-rose"
        />

        <div className="rail flex gap-2 overflow-x-auto">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              aria-pressed={chip === c.key}
              onClick={() => setChip(c.key)}
              className={`h-10 shrink-0 rounded-full border px-4 text-caption font-medium ${
                chip === c.key
                  ? "border-rose bg-rose text-white"
                  : "border-sand-deep bg-surface text-ink"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </header>

      {error ? <LoadFailed message={error} onRetry={load} /> : null}
      {!data && !error ? <Loading rows={5} /> : null}

      {data ? (
        <ul className="flex flex-col gap-2 px-4">
          {shown.map((b) => {
            const state = stockState(b);
            return (
              <li key={b.slug}>
                <Link
                  href={`/livres/${b.slug}`}
                  className="flex items-center gap-3 rounded-card bg-surface p-3 shadow-sm"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-display line-clamp-1 text-body font-semibold">
                      {pick(b.title, locale)}
                    </span>
                    <span className="line-clamp-1 text-caption text-ink-muted">
                      {pick(b.author, locale)} ·{" "}
                      <span className="lat">{formatDzd(b.priceDzd)}</span>
                    </span>
                  </span>

                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-micro uppercase tracking-[0.06em] ${
                      state.kind === "out"
                        ? "bg-ink/8 text-ink-muted"
                        : state.kind === "low"
                          ? "bg-warning/12 text-warning"
                          : "bg-success/12 text-success"
                    }`}
                  >
                    {state.kind === "out"
                      ? `${t("soldOut")} · ${t("hidden")}`
                      : t("stock", { n: b.stockOnHand })}
                  </span>
                  <IconChevron className="h-4 w-4 shrink-0 text-ink-faint" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {data && shown.length === 0 ? (
        <p className="px-8 py-14 text-center text-body text-ink-muted">
          {t("none")}
        </p>
      ) : null}

      {/* FAB. POST /api/books exists, but a create form is its own screen —
          until it is built this says so rather than opening nothing. */}
      {showAddHint ? (
        <p
          role="status"
          className="fixed inset-x-4 bottom-36 z-20 mx-auto max-w-[560px] rounded-card bg-ink p-3 text-center text-caption text-paper shadow-lg"
        >
          {t("addHint")}
        </p>
      ) : null}
      <button
        type="button"
        aria-label={t("add")}
        onClick={() => {
          setShowAddHint(true);
          window.setTimeout(() => setShowAddHint(false), 3000);
        }}
        className="fixed bottom-20 end-4 z-20 grid h-14 w-14 place-items-center rounded-full bg-rose text-white shadow-lg"
      >
        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden>
          <path
            d="M12 5v14M5 12h14"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </main>
  );
}

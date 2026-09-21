"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loading, LoadFailed } from "@/components/Async";
import { IconAlert, IconChevron } from "@/components/icons";
import { api, messageFor } from "@/lib/client";
import { pick, type Book, type Category } from "@/lib/types";
import { formatDzd } from "@/lib/format";

type Draft = {
  titleFr: string;
  titleAr: string;
  authorFr: string;
  authorAr: string;
  summaryFr: string;
  summaryAr: string;
  categorySlugs: string[];
  priceDzd: number;
  weightGrams: number;
  lowStockThreshold: number;
};

function toDraft(b: Book): Draft {
  return {
    titleFr: b.title.fr,
    titleAr: b.title.ar ?? "",
    authorFr: b.author.fr,
    authorAr: b.author.ar ?? "",
    summaryFr: b.summary?.fr ?? "",
    summaryAr: b.summary?.ar ?? "",
    categorySlugs: [...b.categorySlugs],
    priceDzd: b.priceDzd,
    weightGrams: b.weightGrams,
    lowStockThreshold: b.lowStockThreshold,
  };
}

/** A4 — Éditeur de livre: onglets FR/AR, barre de sauvegarde. */
export default function BookEditorPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const locale = useLocale();
  const t = useTranslations("editor");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [book, setBook] = useState<Book | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [tab, setTab] = useState<"fr" | "ar">("fr");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [missing, setMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      // The category list comes with the catalogue, so the classification
      // chips are the real ones rather than a copy that can drift.
      const [b, list] = await Promise.all([
        api.get<Book>(`/api/books/${slug}`),
        api.get<{ categories: Category[] }>("/api/books"),
      ]);
      setBook(b);
      setCategories(list.categories);
      setDraft(toDraft(b));
    } catch (e) {
      setBook(null);
      setLoadError(messageFor(e, tc("loadFailed")));
    }
  }, [slug, tc]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!book || !draft) return false;
    return JSON.stringify(draft) !== JSON.stringify(toDraft(book));
  }, [book, draft]);

  if (loadError) {
    return (
      <main className="py-10">
        <LoadFailed message={loadError} onRetry={load} />
      </main>
    );
  }

  if (!book || !draft) {
    return (
      <main className="py-6">
        <Loading rows={6} />
      </main>
    );
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  async function save() {
    if (!draft) return;
    // Weight drives the Yalidine tariff; a book without it cannot be quoted,
    // so this is a hard block, not a warning (PROJECT_PLAN §4). The server
    // refuses it too — this is the same rule, said sooner.
    if (!draft.weightGrams || draft.weightGrams <= 0) {
      setMissing(true);
      return;
    }
    setMissing(false);
    setSaveError(null);
    setSaving(true);

    try {
      // stockOnHand is absent on purpose: stock changes through a movement,
      // never through this form. See the Stock screen.
      const updated = await api.patch<Book>(`/api/books/${slug}`, {
        title: { fr: draft.titleFr, ar: draft.titleAr || undefined },
        author: { fr: draft.authorFr, ar: draft.authorAr || undefined },
        summary: { fr: draft.summaryFr, ar: draft.summaryAr || undefined },
        categorySlugs: draft.categorySlugs,
        priceDzd: draft.priceDzd,
        weightGrams: draft.weightGrams,
        lowStockThreshold: draft.lowStockThreshold,
      });
      setBook(updated);
      setDraft(toDraft(updated));
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3500);
    } catch (e) {
      setSaveError(messageFor(e, tc("saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  const field =
    "h-11 w-full rounded-input border border-sand-deep bg-surface px-4 text-body outline-none placeholder:text-ink-faint focus:border-rose";
  const label = "text-micro uppercase tracking-[0.06em] text-ink-muted";
  const isFr = tab === "fr";

  return (
    <main className="flex flex-col gap-5 pb-32">
      <header className="flex items-center gap-1 px-2 pt-2">
        <Link
          href="/livres"
          aria-label={tn("back")}
          className="grid h-11 w-11 place-items-center text-ink"
        >
          <span className="rotate-180 rtl:rotate-0">
            <IconChevron className="h-5 w-5" />
          </span>
        </Link>
        <h1 className="font-display text-title">{t("title")}</h1>
      </header>

      {/* cover */}
      <section className="flex gap-3 px-4">
        <div className="w-[88px] shrink-0 overflow-hidden rounded-cover bg-sand">
          <div className="flex aspect-[2/3] items-end p-2">
            <span className="font-display line-clamp-3 text-micro text-ink-muted">
              {pick(book.title, locale)}
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-2">
          <p className="text-caption text-ink-muted">{t("coverHint")}</p>
          <button
            type="button"
            className="h-11 w-fit rounded-full border border-sand-deep bg-surface px-4 text-caption font-semibold"
          >
            {t("replace")}
          </button>
        </div>
      </section>

      {/* FR / AR tabs */}
      <section className="flex flex-col gap-3 px-4">
        <div
          role="tablist"
          className="flex gap-1 rounded-full border border-sand-deep bg-surface p-1"
        >
          {(["fr", "ar"] as const).map((k) => (
            <button
              key={k}
              role="tab"
              type="button"
              aria-selected={tab === k}
              onClick={() => setTab(k)}
              className={`h-9 flex-1 rounded-full text-caption font-semibold ${
                tab === k ? "bg-rose text-white" : "text-ink-muted"
              }`}
            >
              {k === "fr" ? t("french") : t("arabic")}
            </button>
          ))}
        </div>

        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("bookTitle")}</span>
          <input
            dir={isFr ? "ltr" : "rtl"}
            className={field}
            value={isFr ? draft.titleFr : draft.titleAr}
            onChange={(e) =>
              set(isFr ? "titleFr" : "titleAr", e.target.value)
            }
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("author")}</span>
          <input
            dir={isFr ? "ltr" : "rtl"}
            className={field}
            value={isFr ? draft.authorFr : draft.authorAr}
            onChange={(e) =>
              set(isFr ? "authorFr" : "authorAr", e.target.value)
            }
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("summary")}</span>
          <textarea
            dir={isFr ? "ltr" : "rtl"}
            rows={4}
            className="w-full rounded-input border border-sand-deep bg-surface p-3 text-body outline-none focus:border-rose"
            value={isFr ? draft.summaryFr : draft.summaryAr}
            onChange={(e) =>
              set(isFr ? "summaryFr" : "summaryAr", e.target.value)
            }
          />
        </label>
      </section>

      {/* classification */}
      <section className="flex flex-col gap-2 px-4">
        <span className={label}>{t("classification")}</span>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => {
            const active = draft.categorySlugs.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  set(
                    "categorySlugs",
                    active
                      ? draft.categorySlugs.filter((s) => s !== c.slug)
                      : [...draft.categorySlugs, c.slug],
                  )
                }
                className={`h-10 rounded-full border px-4 text-caption font-medium ${
                  active
                    ? "border-rose bg-rose-50 text-rose"
                    : "border-sand-deep bg-surface text-ink"
                }`}
              >
                {pick(c.name, locale)}
              </button>
            );
          })}
        </div>
      </section>

      {/* numbers */}
      <section className="flex flex-col gap-3 px-4">
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("price")}</span>
          <span className="relative flex items-center">
            <input
              type="number"
              min={0}
              step={50}
              className={`${field} lat pe-14`}
              value={Math.round(draft.priceDzd / 100)}
              onChange={(e) => set("priceDzd", Number(e.target.value) * 100)}
            />
            <span className="absolute end-4 text-caption text-ink-muted">
              DA
            </span>
          </span>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("weight")}</span>
          <span className="relative flex items-center">
            <input
              type="number"
              min={1}
              className={`${field} lat pe-14 ${
                missing ? "border-danger" : ""
              }`}
              value={draft.weightGrams || ""}
              onChange={(e) => set("weightGrams", Number(e.target.value))}
            />
            <span className="absolute end-4 text-caption text-ink-muted">
              {t("weightUnit")}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-caption text-ink-muted">
            <IconAlert className="h-4 w-4 text-rose" />
            {t("weightHint")}
          </span>
          {missing ? (
            <span role="alert" className="text-caption text-danger">
              {t("weightMissing")}
            </span>
          ) : null}
        </label>

        <div className="flex gap-3">
          {/* Stock is shown, not edited. Every count has a movement behind it
              explaining where it came from, so it changes on the Stock screen
              and nowhere else — a field here would accept a number the server
              refuses. */}
          <div className="flex flex-1 flex-col gap-1.5">
            <span className={label}>{t("stock")}</span>
            <Link
              href={`/stock/${book.slug}`}
              className="flex h-11 items-center justify-between rounded-input border border-sand-deep bg-sand px-4 text-body"
            >
              <span className="lat">{book.stockOnHand}</span>
              <IconChevron className="h-4 w-4 text-ink-faint" />
            </Link>
            <span className="text-caption text-ink-muted">
              {t("stockElsewhere")}
            </span>
          </div>
          <label className="flex flex-1 flex-col gap-1.5">
            <span className={label}>{t("threshold")}</span>
            <input
              type="number"
              min={0}
              className={`${field} lat`}
              value={draft.lowStockThreshold}
              onChange={(e) =>
                set("lowStockThreshold", Number(e.target.value))
              }
            />
          </label>
        </div>
      </section>

      {saved ? (
        <p
          role="status"
          className="mx-4 rounded-card bg-success/12 p-3 text-caption text-success"
        >
          {tc("saved")}
        </p>
      ) : null}
      {saveError ? (
        <p
          role="alert"
          className="mx-4 rounded-card bg-danger/8 p-3 text-caption text-danger"
        >
          {saveError}
        </p>
      ) : null}

      {/* save bar */}
      <div className="fixed inset-x-0 bottom-[56px] z-20 mx-auto w-full max-w-[640px] border-t border-sand-deep bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex-1 text-caption text-ink-muted">
            {dirty ? t("dirty") : formatDzd(draft.priceDzd)}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={!dirty || saving}
            className="h-11 rounded-full bg-rose px-6 text-body font-semibold text-white hover:bg-rose-hover disabled:bg-sand-deep disabled:text-ink-faint"
          >
            {saving ? tc("loading") : t("save")}
          </button>
        </div>
      </div>
    </main>
  );
}

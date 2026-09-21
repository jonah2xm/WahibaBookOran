"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { LoadFailed } from "@/components/Async";
import { IconAlert, IconChevron } from "@/components/icons";
import { api, messageFor } from "@/lib/client";
import { pick, type Book, type Category } from "@/lib/types";

/**
 * A3b — Nouveau livre.
 *
 * Deliberately shorter than the editor: this asks for what a book cannot
 * exist without, and everything optional (Arabic title, summary, ISBN,
 * publisher) is left to the editor afterwards. A long form is how a catalogue
 * stops being entered.
 *
 * `nouveau` is a static segment, so Next matches it before `[slug]` — no
 * collision with the editor route.
 */

/**
 * The slug is the public URL of the book, so it is derived and then shown
 * rather than hidden: "l-etranger" is a decision about the shop's addresses,
 * not an implementation detail. Accents are folded because the API only
 * accepts [a-z0-9-].
 */
function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function NewBookPage() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations("newBook");
  const te = useTranslations("editor");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");

  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [categorySlugs, setCategorySlugs] = useState<string[]>([]);
  const [priceDa, setPriceDa] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [openingStock, setOpeningStock] = useState("");

  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const list = await api.get<{ categories: Category[] }>("/api/books");
      setCategories(list.categories);
    } catch (e) {
      setCategories(null);
      setLoadError(messageFor(e, tc("loadFailed")));
    }
  }, [tc]);

  useEffect(() => {
    void load();
  }, [load]);

  // Follows the title until the owner edits it by hand, then stops: a slug
  // that keeps rewriting itself under you is worse than one you must fix.
  const effectiveSlug = slugTouched ? slug : slugify(title);

  const problems = useMemo(() => {
    const p: Record<string, string> = {};
    if (!title.trim()) p.title = t("requiredTitle");
    if (!author.trim()) p.author = t("requiredAuthor");
    if (!effectiveSlug) p.slug = t("requiredSlug");
    if (!Number(priceDa)) p.price = t("requiredPrice");
    // Same hard rule as the editor: Yalidine bills by weight, so a book
    // without one cannot be quoted at all.
    if (!Number(weightGrams)) p.weight = te("weightMissing");
    return p;
  }, [title, author, effectiveSlug, priceDa, weightGrams, t, te]);

  const field =
    "h-11 w-full rounded-input border border-sand-deep bg-surface px-4 text-body outline-none placeholder:text-ink-faint focus:border-rose";
  const label = "text-micro uppercase tracking-[0.06em] text-ink-muted";
  const bad = "border-danger";

  async function create() {
    setSubmitted(true);
    if (Object.keys(problems).length > 0) return;

    setSaveError(null);
    setSaving(true);

    try {
      const book = await api.post<Book>("/api/books", {
        slug: effectiveSlug,
        title: { fr: title.trim() },
        author: { fr: author.trim() },
        categorySlugs,
        priceDzd: Number(priceDa) * 100,
        weightGrams: Number(weightGrams),
      });

      // Opening stock is a second request on purpose. Stock only ever moves
      // through the ledger, so the copies on the shelf are a `purchase_in`
      // movement like any other — not a number written onto the book. This
      // mirrors what the seed does for its own catalogue.
      const opening = Number(openingStock);
      if (opening > 0) {
        try {
          await api.post(`/api/stock/${book.slug}/movements`, {
            type: "purchase_in",
            quantity: opening,
            reason: t("openingReason"),
          });
        } catch (e) {
          // The book exists; only the stock did not record. Say so instead of
          // failing the whole thing and leaving a book the owner thinks was
          // never created.
          router.replace(`/stock/${book.slug}`);
          setSaveError(messageFor(e, tc("saveFailed")));
          return;
        }
      }

      router.replace(`/livres/${book.slug}`);
    } catch (e) {
      setSaveError(messageFor(e, tc("saveFailed")));
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <main className="py-10">
        <LoadFailed message={loadError} onRetry={load} />
      </main>
    );
  }

  const err = (key: string) => (submitted ? problems[key] : undefined);

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

      <p className="px-4 text-caption text-ink-muted">{t("intro")}</p>

      <section className="flex flex-col gap-3 px-4">
        <label className="flex flex-col gap-1.5">
          <span className={label}>{te("bookTitle")}</span>
          <input
            className={`${field} ${err("title") ? bad : ""}`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          {err("title") ? (
            <span role="alert" className="text-caption text-danger">
              {err("title")}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>{te("author")}</span>
          <input
            className={`${field} ${err("author") ? bad : ""}`}
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
          {err("author") ? (
            <span role="alert" className="text-caption text-danger">
              {err("author")}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("slug")}</span>
          <input
            dir="ltr"
            className={`${field} lat ${err("slug") ? bad : ""}`}
            value={effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(slugify(e.target.value));
            }}
          />
          <span className="text-caption text-ink-muted">{t("slugHint")}</span>
          {err("slug") ? (
            <span role="alert" className="text-caption text-danger">
              {err("slug")}
            </span>
          ) : null}
        </label>
      </section>

      <section className="flex flex-col gap-2 px-4">
        <span className={label}>{te("classification")}</span>
        <div className="flex flex-wrap gap-2">
          {(categories ?? []).map((c) => {
            const active = categorySlugs.includes(c.slug);
            return (
              <button
                key={c.slug}
                type="button"
                aria-pressed={active}
                onClick={() =>
                  setCategorySlugs((prev) =>
                    active
                      ? prev.filter((s) => s !== c.slug)
                      : [...prev, c.slug],
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

      <section className="flex flex-col gap-3 px-4">
        <label className="flex flex-col gap-1.5">
          <span className={label}>{te("price")}</span>
          <span className="relative flex items-center">
            <input
              type="number"
              min={0}
              step={50}
              inputMode="numeric"
              className={`${field} lat pe-14 ${err("price") ? bad : ""}`}
              value={priceDa}
              onChange={(e) => setPriceDa(e.target.value)}
            />
            <span className="absolute end-4 text-caption text-ink-muted">
              DA
            </span>
          </span>
          {err("price") ? (
            <span role="alert" className="text-caption text-danger">
              {err("price")}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>{te("weight")}</span>
          <span className="relative flex items-center">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              className={`${field} lat pe-14 ${err("weight") ? bad : ""}`}
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
            />
            <span className="absolute end-4 text-caption text-ink-muted">
              {te("weightUnit")}
            </span>
          </span>
          <span className="flex items-center gap-1.5 text-caption text-ink-muted">
            <IconAlert className="h-4 w-4 text-rose" />
            {te("weightHint")}
          </span>
          {err("weight") ? (
            <span role="alert" className="text-caption text-danger">
              {err("weight")}
            </span>
          ) : null}
        </label>

        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("openingStock")}</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            className={`${field} lat`}
            value={openingStock}
            onChange={(e) => setOpeningStock(e.target.value)}
          />
          <span className="text-caption text-ink-muted">
            {t("openingStockHint")}
          </span>
        </label>
      </section>

      {saveError ? (
        <p
          role="alert"
          className="mx-4 rounded-card bg-danger/8 p-3 text-caption text-danger"
        >
          {saveError}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-[56px] z-20 mx-auto w-full max-w-[640px] border-t border-sand-deep bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex-1 text-caption text-ink-muted">
            {t("afterHint")}
          </span>
          <button
            type="button"
            onClick={create}
            disabled={saving}
            className="h-11 rounded-full bg-rose px-6 text-body font-semibold text-white hover:bg-rose-hover disabled:bg-sand-deep disabled:text-ink-faint"
          >
            {saving ? tc("loading") : t("create")}
          </button>
        </div>
      </div>
    </main>
  );
}

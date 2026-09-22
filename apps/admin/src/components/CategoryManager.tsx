"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { api, messageFor } from "@/lib/client";
import type { Category } from "@/lib/types";

/**
 * Categories, inside Réglages.
 *
 * Each row edits in place rather than opening a screen: there are five of
 * them and the whole job is usually renaming one.
 *
 * The slug is shown but never editable. Books reference a category by id, so
 * renaming the slug would not break them — but the storefront links to
 * /livres?categorie=<slug>, and every link already shared would die. Deleting
 * and recreating makes that consequence visible instead of hiding it behind
 * a text field.
 */

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

type Draft = { fr: string; ar: string };

export function CategoryManager() {
  const t = useTranslations("categories");
  const tc = useTranslations("common");

  const [items, setItems] = useState<Category[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ fr: "", ar: "" });
  const [confirming, setConfirming] = useState<string | null>(null);

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const load = useCallback(async () => {
    setError(null);
    try {
      const r = await api.get<{ items: Category[] }>("/api/categories");
      setItems(r.items);
    } catch (e) {
      setItems(null);
      setError(messageFor(e, tc("loadFailed")));
    }
  }, [tc]);

  useEffect(() => {
    void load();
  }, [load]);

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    setBusy(true);
    try {
      await fn();
      await load();
      return true;
    } catch (e) {
      setError(messageFor(e, tc("saveFailed")));
      return false;
    } finally {
      setBusy(false);
    }
  }

  const field =
    "h-11 w-full rounded-input border border-sand-deep bg-surface px-3 text-body outline-none focus:border-rose";
  const chip =
    "h-9 rounded-pill border border-sand-deep px-3 text-caption font-semibold";

  return (
    <div className="mx-4 flex flex-col gap-3 border border-sand-deep p-4">
      {items === null ? (
        <p className="text-caption text-ink-muted">{tc("loading")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((c) => {
            const isEditing = editing === c.slug;
            const isConfirming = confirming === c.slug;

            return (
              <li
                key={c.slug}
                className="flex flex-col gap-2 border-b border-sand-deep pb-2 last:border-0 last:pb-0"
              >
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <input
                      className={field}
                      value={draft.fr}
                      placeholder={t("nameFr")}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, fr: e.target.value }))
                      }
                    />
                    <input
                      dir="rtl"
                      className={field}
                      value={draft.ar}
                      placeholder={t("nameAr")}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, ar: e.target.value }))
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy || !draft.fr.trim()}
                        onClick={async () => {
                          const ok = await run(() =>
                            api.patch(`/api/categories/${c.slug}`, {
                              name: {
                                fr: draft.fr.trim(),
                                ar: draft.ar.trim() || undefined,
                              },
                            }),
                          );
                          if (ok) setEditing(null);
                        }}
                        className={`${chip} border-rose bg-rose text-paper disabled:opacity-50`}
                      >
                        {t("save")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className={chip}
                      >
                        {tc("cancel")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-body">
                        {c.name.fr}
                        {c.name.ar ? (
                          <span className="text-ink-muted"> · {c.name.ar}</span>
                        ) : null}
                      </span>
                      <span className="lat text-caption text-ink-muted">
                        {c.slug} ·{" "}
                        {t("bookCount", { n: c.bookCount ?? 0 })}
                        {!c.isActive ? ` · ${t("hidden")}` : ""}
                      </span>
                    </span>

                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setEditing(c.slug);
                        setConfirming(null);
                        setDraft({ fr: c.name.fr, ar: c.name.ar ?? "" });
                      }}
                      className="text-caption font-semibold text-rose"
                    >
                      {t("edit")}
                    </button>
                  </div>
                )}

                {isConfirming ? (
                  <div className="flex flex-col gap-2 rounded-card bg-danger/8 p-3">
                    <span className="text-caption">{t("deleteConfirm")}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={async () => {
                          const ok = await run(() =>
                            api.del(`/api/categories/${c.slug}`),
                          );
                          if (ok) setConfirming(null);
                        }}
                        className={`${chip} border-danger bg-danger text-paper`}
                      >
                        {t("deleteYes")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirming(null)}
                        className={chip}
                      >
                        {tc("cancel")}
                      </button>
                    </div>
                  </div>
                ) : isEditing ? null : (
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        run(() =>
                          api.patch(`/api/categories/${c.slug}`, {
                            isActive: !c.isActive,
                          }),
                        )
                      }
                      className="text-caption text-ink-muted underline"
                    >
                      {c.isActive ? t("hide") : t("show")}
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setConfirming(c.slug)}
                      className="text-caption text-danger underline"
                    >
                      {t("delete")}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div className="flex flex-col gap-2 rounded-card bg-sand p-3">
          <input
            className={field}
            value={newName}
            placeholder={t("nameFr")}
            onChange={(e) => setNewName(e.target.value)}
          />
          <span className="lat text-caption text-ink-muted">
            {t("slugPreview", { slug: slugify(newName) || "…" })}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy || !slugify(newName)}
              onClick={async () => {
                const ok = await run(() =>
                  api.post("/api/categories", {
                    slug: slugify(newName),
                    name: { fr: newName.trim() },
                  }),
                );
                if (ok) {
                  setNewName("");
                  setAdding(false);
                }
              }}
              className={`${chip} border-rose bg-rose text-paper disabled:opacity-50`}
            >
              {t("create")}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setNewName("");
              }}
              className={chip}
            >
              {tc("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="h-11 w-fit rounded-pill border border-sand-deep px-4 text-caption font-semibold"
        >
          {t("add")}
        </button>
      )}

      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

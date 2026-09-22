"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loading, LoadFailed } from "@/components/Async";
import { IconAlert, IconChevron } from "@/components/icons";
import { api, messageFor } from "@/lib/client";
import { pick, type Bilingual } from "@/lib/types";

type AgreementSection = {
  key: string;
  title: Bilingual;
  points: Bilingual[];
  needsReview?: boolean;
};

type Payload = { sections: AgreementSection[]; publishedAt: string | null };

/** Where the public page lives. Not a secret — it is the address customers
 *  type — so NEXT_PUBLIC_ is correct here, unlike anything Yalidine. */
const STORE_URL =
  process.env.NEXT_PUBLIC_STORE_URL ?? "http://localhost:3110";

/** A9 — Éditeur des conditions: sections, puces FR/AR, publication. */
export default function AgreementPage() {
  const locale = useLocale();
  const t = useTranslations("agreement");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const format = useFormatter();

  const [sections, setSections] = useState<AgreementSection[] | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await api.get<Payload>("/api/agreement");
      setSections(data.sections);
      setPublishedAt(data.publishedAt);
      setDirty(false);
    } catch (e) {
      setSections(null);
      setLoadError(messageFor(e, tc("loadFailed")));
    }
  }, [tc]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * Edits are held in memory until Publier. The database has no
   * saved-but-unpublished state, and inventing one in the browser would let
   * this screen show "enregistre" for terms no customer can actually read.
   */
  function commit(next: AgreementSection[]) {
    setSections(next);
    setDirty(true);
  }

  function patchSection(i: number, patch: Partial<AgreementSection>) {
    commit((sections ?? []).map((s, n) => (n === i ? { ...s, ...patch } : s)));
  }

  function move<T>(list: T[], from: number, to: number): T[] {
    if (to < 0 || to >= list.length) return list;
    const next = [...list];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    return next;
  }

  function addSection() {
    const key = `section-${Date.now()}`;
    commit([
      ...(sections ?? []),
      {
        key,
        title: { fr: "", ar: "" },
        points: [{ fr: "", ar: "" }],
        needsReview: true,
      },
    ]);
    setOpenKey(key);
  }

  function addPoint(i: number) {
    patchSection(i, {
      points: [...(sections?.[i].points ?? []), { fr: "", ar: "" }],
    });
  }

  async function publish() {
    if (!sections) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await api.put<{ publishedAt: string | null }>(
        "/api/agreement",
        { sections, publish: true },
      );
      setPublishedAt(res.publishedAt);
      setDirty(false);
      setNote(t("published"));
      window.setTimeout(() => setNote(null), 5000);
    } catch (e) {
      setError(messageFor(e, tc("saveFailed")));
    } finally {
      setPublishing(false);
    }
  }

  const field =
    "h-11 w-full rounded-input border border-sand-deep bg-surface px-3 text-body outline-none placeholder:text-ink-faint focus:border-rose";
  const label = "text-micro uppercase tracking-[0.06em] text-ink-muted";
  const iconBtn =
    "grid h-9 w-9 shrink-0 place-items-center rounded-pill border border-sand-deep bg-surface text-ink-muted disabled:opacity-40";

  /** Non-null inside the list below, where a load has already happened. */
  const list = sections ?? [];

  return (
    <main className="flex flex-col gap-4 pb-40">
      <header className="flex items-center gap-1 px-2 pt-2">
        <Link
          href="/reglages"
          aria-label={tn("back")}
          className="grid h-11 w-11 place-items-center text-ink"
        >
          <span className="rotate-180 rtl:rotate-0">
            <IconChevron className="h-5 w-5" />
          </span>
        </Link>
        <h1 className="font-display text-title">{t("title")}</h1>
      </header>

      {/* These are commitments to customers, not marketing copy. The screen
          says so once, at the top, rather than pretending it is a CMS. */}
      <p className="mx-4 flex gap-2 rounded-card bg-warning/12 p-3 text-caption text-warning">
        <IconAlert className="h-4 w-4 shrink-0" />
        {t("legalWarning")}
      </p>

      {loadError ? <LoadFailed message={loadError} onRetry={load} /> : null}
      {!sections && !loadError ? <Loading rows={5} /> : null}

      <ul className="flex flex-col gap-2 px-4">
        {list.map((section, i) => {
          const open = openKey === section.key;
          const missingAr =
            !section.title.ar || section.points.some((p) => !p.ar);
          return (
            <li
              key={section.key}
              className="flex flex-col border border-sand-deep"
            >
              {/* Title gets the full row: on a 375px screen it loses to
                  three side-by-side controls and truncates to "Commande
                  et…". The arrows moved to the meta row below. */}
              <button
                type="button"
                aria-expanded={open}
                onClick={() => setOpenKey(open ? null : section.key)}
                className="flex items-center gap-2 px-4 pb-1 pt-3 text-start"
              >
                {/* numbered from the position, not from the text: the arrows
                    reorder sections, and a number typed into the title would
                    be wrong the moment they do */}
                <span className="line-clamp-2 flex-1 text-body font-semibold">
                  <span className="lat">{i + 1}.</span>{" "}
                  {pick(section.title, locale) || t("untitled")}
                </span>
                <span className={open ? "-rotate-90" : "rotate-90"}>
                  <IconChevron className="h-4 w-4 shrink-0 text-ink-faint" />
                </span>
              </button>

              <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
                <span className="lat text-caption text-ink-muted">
                  {t("pointCount", { count: section.points.length })}
                </span>
                {section.needsReview ? (
                  <span className="rounded-pill bg-warning/12 px-2.5 py-1 text-micro uppercase tracking-[0.06em] text-warning">
                    {t("toReview")}
                  </span>
                ) : null}
                {missingAr ? (
                  <span className="rounded-pill bg-info/12 px-2.5 py-1 text-micro uppercase tracking-[0.06em] text-info">
                    {t("missingAr")}
                  </span>
                ) : null}

                <span className="ms-auto flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={t("moveUp")}
                    disabled={i === 0}
                    onClick={() => commit(move(list, i, i - 1))}
                    className={iconBtn}
                  >
                    <Arrow up />
                  </button>
                  <button
                    type="button"
                    aria-label={t("moveDown")}
                    disabled={i === list.length - 1}
                    onClick={() => commit(move(list, i, i + 1))}
                    className={iconBtn}
                  >
                    <Arrow />
                  </button>
                </span>
              </div>

              {open ? (
                <div className="flex flex-col gap-4 border-t border-sand-deep p-4">
                  <div className="flex flex-col gap-2">
                    <span className={label}>{t("sectionTitle")}</span>
                    <input
                      dir="ltr"
                      className={field}
                      placeholder={t("frPlaceholder")}
                      value={section.title.fr}
                      onChange={(e) =>
                        patchSection(i, {
                          title: { ...section.title, fr: e.target.value },
                        })
                      }
                    />
                    <input
                      dir="rtl"
                      className={field}
                      placeholder={t("arPlaceholder")}
                      value={section.title.ar ?? ""}
                      onChange={(e) =>
                        patchSection(i, {
                          title: { ...section.title, ar: e.target.value },
                        })
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-3">
                    <span className={label}>{t("points")}</span>
                    {section.points.map((point, j) => (
                      <div
                        key={j}
                        className="flex flex-col gap-2 rounded-input bg-paper p-3"
                      >
                        <div className="flex items-center gap-1">
                          <span className="lat flex-1 text-caption text-ink-muted">
                            {j + 1}
                          </span>
                          {/* Up/down rather than drag: this list is edited on a
                              phone, where a drag handle fights the page scroll
                              and is unreachable by keyboard. */}
                          <button
                            type="button"
                            aria-label={t("moveUp")}
                            disabled={j === 0}
                            onClick={() =>
                              patchSection(i, {
                                points: move(section.points, j, j - 1),
                              })
                            }
                            className={iconBtn}
                          >
                            <Arrow up />
                          </button>
                          <button
                            type="button"
                            aria-label={t("moveDown")}
                            disabled={j === section.points.length - 1}
                            onClick={() =>
                              patchSection(i, {
                                points: move(section.points, j, j + 1),
                              })
                            }
                            className={iconBtn}
                          >
                            <Arrow />
                          </button>
                          <button
                            type="button"
                            aria-label={t("deletePoint")}
                            onClick={() =>
                              patchSection(i, {
                                points: section.points.filter(
                                  (_, n) => n !== j,
                                ),
                              })
                            }
                            className={`${iconBtn} text-danger`}
                          >
                            ×
                          </button>
                        </div>

                        <textarea
                          dir="ltr"
                          rows={2}
                          className="w-full rounded-input border border-sand-deep bg-surface p-3 text-body outline-none focus:border-rose"
                          placeholder={t("frPlaceholder")}
                          value={point.fr}
                          onChange={(e) =>
                            patchSection(i, {
                              points: section.points.map((p, n) =>
                                n === j ? { ...p, fr: e.target.value } : p,
                              ),
                            })
                          }
                        />
                        <textarea
                          dir="rtl"
                          rows={2}
                          className={`w-full rounded-input border bg-surface p-3 text-body outline-none focus:border-rose ${
                            point.ar ? "border-sand-deep" : "border-info/50"
                          }`}
                          placeholder={t("arPlaceholder")}
                          value={point.ar ?? ""}
                          onChange={(e) =>
                            patchSection(i, {
                              points: section.points.map((p, n) =>
                                n === j ? { ...p, ar: e.target.value } : p,
                              ),
                            })
                          }
                        />
                        {!point.ar ? (
                          <span className="text-caption text-info">
                            {t("missingArHint")}
                          </span>
                        ) : null}
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={() => addPoint(i)}
                      className="h-11 w-fit rounded-pill border border-sand-deep bg-surface px-4 text-caption font-semibold"
                    >
                      {t("addPoint")}
                    </button>
                  </div>

                  {/* The seed text for sections 4 and 5 was drafted, not
                      written by the owner. Clearing the flag is their
                      statement that they have read it. */}
                  {section.needsReview ? (
                    <button
                      type="button"
                      onClick={() => patchSection(i, { needsReview: false })}
                      className="h-11 w-fit rounded-pill border border-warning/50 px-4 text-caption font-semibold text-warning"
                    >
                      {t("markReviewed")}
                    </button>
                  ) : null}

                  {/* Deleting a section removes text a customer may already
                      have agreed to, so it asks twice. */}
                  {confirmKey === section.key ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          commit(list.filter((_, n) => n !== i));
                          setConfirmKey(null);
                        }}
                        className="h-11 rounded-pill bg-danger px-4 text-caption font-semibold text-paper"
                      >
                        {t("confirmDelete")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmKey(null)}
                        className="h-11 px-3 text-caption text-ink-muted"
                      >
                        {t("cancel")}
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmKey(section.key)}
                      className="h-11 w-fit rounded-pill border border-danger/40 px-4 text-caption font-semibold text-danger"
                    >
                      {t("deleteSection")}
                    </button>
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 px-4">
        <button
          type="button"
          onClick={addSection}
          className="h-12 rounded-card border border-dashed border-sand-deep text-body font-semibold text-ink-muted"
        >
          {t("addSection")}
        </button>

        <a
          href={`${STORE_URL}/${locale}/conditions`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between border border-sand-deep px-4 py-3 text-body"
        >
          {t("preview")}
          <IconChevron className="h-4 w-4 text-ink-faint" />
        </a>
      </div>

      {note ? (
        <p
          role="status"
          className="mx-4 rounded-card bg-success/12 p-3 text-caption text-success"
        >
          {note}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mx-4 rounded-card bg-danger/8 p-3 text-caption text-danger"
        >
          {error}
        </p>
      ) : null}

      {/* publish bar */}
      <div className="fixed inset-x-0 bottom-[56px] z-20 mx-auto flex w-full max-w-[640px] items-center gap-3 border-t border-sand-deep bg-surface/95 px-4 py-3 backdrop-blur">
        <span className="flex flex-1 items-center gap-2 text-caption">
          <span
            className={`h-2 w-2 shrink-0 rounded-pill ${
              dirty ? "bg-warning" : "bg-success"
            }`}
          />
          <span className="text-ink-muted">
            {dirty
              ? t("unpublished")
              : publishedAt
                ? t("publishedAt", {
                    at: format.dateTime(new Date(publishedAt), {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  })
                : t("upToDate")}
          </span>
        </span>
        <button
          type="button"
          onClick={publish}
          disabled={!dirty || publishing}
          className="h-11 rounded-pill bg-rose px-6 text-body font-semibold text-paper hover:bg-rose-hover disabled:bg-sand-deep disabled:text-ink-faint"
        >
          {publishing ? tc("loading") : t("publish")}
        </button>
      </div>
    </main>
  );
}

/** Small chevron pointing down, or up with `up`. */
function Arrow({ up = false }: { up?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d={up ? "M5 15l7-7 7 7" : "M5 9l7 7 7-7"}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

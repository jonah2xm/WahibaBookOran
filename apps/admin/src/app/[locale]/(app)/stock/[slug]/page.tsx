"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loading, LoadFailed } from "@/components/Async";
import { IconChevron } from "@/components/icons";
import { api, messageFor } from "@/lib/client";
import { pick, type Bilingual } from "@/lib/types";

/** Every movement kind this build knows how to label. */
const MOVEMENT_KINDS = [
  "purchase_in",
  "sale_out",
  "return_in",
  "damage_out",
  "adjustment",
] as const;

type MovementKind = (typeof MOVEMENT_KINDS)[number];

type StockMovement = {
  id: string;
  kind: MovementKind;
  delta: number;
  reason?: string;
  orderNumber?: string;
  at: string;
};

type StockPayload = {
  slug: string;
  title: Bilingual;
  stockOnHand: number;
  stockReserved: number;
  lowStockThreshold: number;
  movements: StockMovement[];
};

/**
 * Motifs offered by the adjustment sheet, with the direction each implies.
 * `sale_out` is absent on purpose: a sale is recorded by an order, never by hand.
 */
const MOTIFS: { kind: Exclude<MovementKind, "sale_out">; sign: 1 | -1 | 0 }[] = [
  { kind: "purchase_in", sign: 1 },
  { kind: "return_in", sign: 1 },
  { kind: "damage_out", sign: -1 },
  { kind: "adjustment", sign: 0 },
];

/** A5 — Stock par livre: en main, historique, ajustement manuel. */
export default function StockDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const locale = useLocale();
  const t = useTranslations("stock");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const format = useFormatter();

  const [data, setData] = useState<StockPayload | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MovementKind>("purchase_in");
  const [sign, setSign] = useState<1 | -1>(1);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setData(await api.get<StockPayload>(`/api/stock/${slug}`));
    } catch (e) {
      setData(null);
      setLoadError(messageFor(e, tc("loadFailed")));
    }
  }, [slug, tc]);

  useEffect(() => {
    void load();
  }, [load]);

  const motif = useMemo(
    () => MOTIFS.find((m) => m.kind === kind) ?? MOTIFS[0],
    [kind],
  );

  if (loadError) {
    return (
      <main className="py-10">
        <LoadFailed message={loadError} onRetry={load} />
      </main>
    );
  }

  if (!data) {
    return (
      <main className="py-6">
        <Loading rows={5} />
      </main>
    );
  }

  const book = data;
  const movements = data.movements;
  const state =
    book.stockOnHand <= 0
      ? ("out" as const)
      : book.stockOnHand <= book.lowStockThreshold
        ? ("low" as const)
        : ("in" as const);
  const effectiveSign = motif.sign === 0 ? sign : motif.sign;
  const delta = effectiveSign * Math.abs(quantity || 0);
  const wouldBe = book.stockOnHand + delta;
  const canSubmit = Boolean(quantity) && Boolean(reason.trim()) && wouldBe >= 0;

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/api/stock/${slug}/movements`, {
        type: kind,
        quantity: delta,
        reason,
      });
      // Re-read rather than patching locally: the server owns the count, and
      // another device may have moved it since this screen loaded.
      await load();
      setOpen(false);
      setQuantity(1);
      setReason("");
      setNote(tc("saved"));
      window.setTimeout(() => setNote(null), 4000);
    } catch (e) {
      setError(messageFor(e, tc("saveFailed")));
    } finally {
      setSaving(false);
    }
  }

  function labelFor(m: StockMovement) {
    // A stored movement can carry a kind this build no longer knows — a
    // renamed type, an older device. Fall back to the generic label rather
    // than printing a raw message key at the manager.
    const known = MOVEMENT_KINDS.includes(m.kind) ? m.kind : "adjustment";
    const name = t(`kind.${known}`);
    const suffix = m.orderNumber ?? m.reason;
    return suffix ? `${name} — ${suffix}` : name;
  }

  const field =
    "field-underline";
  const label = "text-micro uppercase tracking-[0.06em] text-ink-muted";

  return (
    <main className="flex flex-col gap-4 pb-32">
      <header className="flex items-center gap-1 px-2 pt-2">
        <Link
          href="/stock"
          aria-label={tn("back")}
          className="grid h-11 w-11 place-items-center text-ink"
        >
          <span className="rotate-180 rtl:rotate-0">
            <IconChevron className="h-5 w-5" />
          </span>
        </Link>
        <h1 className="font-display line-clamp-1 text-title">
          {pick(book.title, locale)}
        </h1>
      </header>

      {/* on hand */}
      <section className="mx-4 flex items-center justify-between gap-3 rounded-card bg-sand p-4">
        <div className="flex flex-col">
          <span className={label}>{t("onHand")}</span>
          <span className="lat font-display text-display-lg">
            {book.stockOnHand}
          </span>
        </div>
        <span
          className={`shrink-0 rounded-pill px-3 py-1.5 text-caption font-semibold ${
            state === "out"
              ? "bg-danger/12 text-danger"
              : state === "low"
                ? "bg-warning/12 text-warning"
                : "bg-success/12 text-success"
          }`}
        >
          {state === "out"
            ? t("soldOut")
            : state === "low"
              ? t("belowThreshold", { n: book.lowStockThreshold })
              : t("healthy")}
        </span>
      </section>

      <Link
        href={`/livres/${slug}`}
        className="mx-4 flex items-center justify-between border border-sand-deep px-4 py-3 text-body"
      >
        {t("editBook")}
        <IconChevron className="h-4 w-4 text-ink-faint" />
      </Link>

      {/* history */}
      <section className="mx-4 flex flex-col gap-2">
        <h2 className="font-display text-body-lg font-semibold">
          {t("history")}
        </h2>

        {movements.length === 0 ? (
          <p className="border border-sand-deep p-4 text-caption text-ink-muted">
            {t("noMovements")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {movements.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 border border-sand-deep p-3"
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-1 text-body">{labelFor(m)}</span>
                  <span className="lat text-caption text-ink-muted">
                    {format.dateTime(new Date(m.at), {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <span
                  className={`lat shrink-0 text-body-lg font-semibold ${
                    m.delta > 0 ? "text-success" : "text-danger"
                  }`}
                >
                  {m.delta > 0 ? "+" : "−"}
                  {Math.abs(m.delta)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {note ? (
        <p
          role="status"
          className="mx-4 rounded-card bg-success/12 p-3 text-caption text-success"
        >
          {note}
        </p>
      ) : null}

      {/* adjust */}
      <div className="fixed inset-x-0 bottom-[56px] z-20 mx-auto w-full max-w-[640px] border-t border-sand-deep bg-surface/95 px-4 py-3 backdrop-blur">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
          className="h-11 w-full rounded-pill bg-rose text-body font-semibold text-paper hover:bg-rose-hover"
        >
          {t("adjust")}
        </button>
      </div>

      {open ? (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t("adjust")}
            className="flex max-h-[88dvh] w-full max-w-[640px] flex-col gap-4 overflow-y-auto rounded-t-sheet bg-paper p-4 pb-8"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-body-lg font-semibold">
                {t("adjust")}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-11 px-2 text-caption text-ink-muted"
              >
                {t("cancel")}
              </button>
            </div>

            {/* motif */}
            <div className="flex flex-col gap-2">
              <span className={label}>{t("motif")}</span>
              <div className="flex flex-wrap gap-2">
                {MOTIFS.map((m) => (
                  <button
                    key={m.kind}
                    type="button"
                    aria-pressed={kind === m.kind}
                    onClick={() => setKind(m.kind)}
                    className={`h-10 rounded-pill border px-4 text-caption font-medium ${
                      kind === m.kind
                        ? "border-rose bg-rose-50 text-rose"
                        : "border-sand-deep bg-surface text-ink"
                    }`}
                  >
                    {t(`kind.${m.kind}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* direction — only an inventory correction can go either way */}
            {motif.sign === 0 ? (
              <div className="flex flex-col gap-2">
                <span className={label}>{t("direction")}</span>
                <div className="flex gap-1 rounded-pill border border-sand-deep bg-surface p-1">
                  {([1, -1] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      aria-pressed={sign === s}
                      onClick={() => setSign(s)}
                      className={`h-9 flex-1 rounded-pill text-caption font-semibold ${
                        sign === s ? "bg-rose text-paper" : "text-ink-muted"
                      }`}
                    >
                      {s === 1 ? t("add") : t("remove")}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <label className="flex flex-col gap-1.5">
              <span className={label}>{t("quantity")}</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                className={`${field} lat`}
                value={quantity || ""}
                onChange={(e) =>
                  setQuantity(Math.abs(Number(e.target.value)) || 0)
                }
              />
            </label>

            {/* Required, and the submit button says so while it is empty: a
                quantity that moved for no recorded reason is a hole in the
                ledger that nobody can close afterwards. */}
            <label className="flex flex-col gap-1.5">
              <span className={label}>{t("reason")}</span>
              <input
                className={field}
                value={reason}
                placeholder={t("reasonPlaceholder")}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>

            <p className="rounded-card bg-sand p-3 text-caption text-ink-muted">
              {t("preview", {
                from: book.stockOnHand,
                to: Math.max(wouldBe, 0),
              })}
            </p>

            {wouldBe < 0 ? (
              <p role="alert" className="text-caption text-danger">
                {t("belowZero")}
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-caption text-danger">
                {error}
              </p>
            ) : null}

            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit || saving}
              className="h-12 w-full rounded-pill bg-rose text-body font-semibold text-paper hover:bg-rose-hover disabled:bg-sand-deep disabled:text-ink-faint"
            >
              {saving
                ? tc("loading")
                : reason.trim()
                  ? t("confirm")
                  : t("reasonRequired")}
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}

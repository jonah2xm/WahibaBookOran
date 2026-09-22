"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loading, LoadFailed } from "@/components/Async";
import {
  IconAlert,
  IconChevron,
  IconCopy,
  IconPhoneCall,
} from "@/components/icons";
import { api, messageFor } from "@/lib/client";
import { STATUS_TONE, type OrderStatus } from "@/lib/statusTone";
import type { OrderDto } from "@/lib/serialize";
import { formatDzd, formatPhone } from "@/lib/format";

const STEPS = ["confirmed", "shipped", "delivered"] as const;

/**
 * What this order can become next, mirroring applyOrderStatus() on the
 * server. The server is still the authority — this only decides which
 * buttons to show, so an illegal move is never offered in the first place.
 * The first entry is the forward move, the second the way out.
 */
const NEXT: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["remitted"],
  remitted: [],
  returned: [],
  cancelled: [],
};

/** A8 — Détail commande. */
export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ order: string }>;
}) {
  const { order: orderParam } = use(params);
  const orderNumber = decodeURIComponent(orderParam);

  const t = useTranslations("sales");
  const ts = useTranslations("status");
  const tn = useTranslations("nav");
  const tc = useTranslations("common");
  const format = useFormatter();

  const [order, setOrder] = useState<OrderDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<OrderStatus | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      setOrder(await api.get<OrderDto>(`/api/orders/${encodeURIComponent(orderNumber)}`));
    } catch (e) {
      setOrder(null);
      setLoadError(messageFor(e, tc("loadFailed")));
    }
  }, [orderNumber, tc]);

  useEffect(() => {
    void load();
  }, [load]);

  async function move(to: OrderStatus) {
    setBusy(to);
    setError(null);
    try {
      const updated = await api.patch<OrderDto>(
        `/api/orders/${encodeURIComponent(orderNumber)}`,
        { status: to },
      );
      setOrder(updated);
      setNote(t(`moved.${to}`));
      window.setTimeout(() => setNote(null), 4000);
    } catch (e) {
      setError(messageFor(e, tc("saveFailed")));
    } finally {
      setBusy(null);
    }
  }

  function stub(message: string) {
    setNote(message);
    window.setTimeout(() => setNote(null), 3500);
  }

  if (loadError) {
    return (
      <main className="py-10">
        <LoadFailed message={loadError} onRetry={load} />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="py-6">
        <Loading rows={5} />
      </main>
    );
  }

  const status = order.status as OrderStatus;
  const next = NEXT[status] ?? [];
  const done = new Set(order.timeline.map((s) => s.key));
  const at = (iso: string) =>
    format.dateTime(new Date(iso), {
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

  const row = "flex items-baseline justify-between gap-3 text-body";

  return (
    <main className="flex flex-col gap-4 pb-28">
      <header className="flex items-center gap-1 px-2 pt-2">
        <Link
          href="/ventes"
          aria-label={tn("back")}
          className="grid h-11 w-11 place-items-center text-ink"
        >
          <span className="rotate-180 rtl:rotate-0">
            <IconChevron className="h-5 w-5" />
          </span>
        </Link>
        <h1 className="lat font-display text-title">{order.orderNumber}</h1>
        <span
          className={`ms-auto me-2 rounded-pill px-2.5 py-1 text-micro uppercase tracking-[0.06em] ${STATUS_TONE[status]}`}
        >
          {ts(status)}
        </span>
      </header>

      {/* customer */}
      <section className="mx-4 flex items-center gap-3 border border-sand-deep p-4">
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-body font-semibold">
            {order.customer.fullName}
          </span>
          {/* stored digits-only; grouped for reading, and the tel: link
              below strips it back */}
          <span className="lat text-caption text-ink-muted">
            {formatPhone(order.customer.phone)}
          </span>
          <span className="text-caption text-ink-muted">
            {order.delivery.wilaya} · {order.delivery.commune} ·{" "}
            {t(order.delivery.method === "home" ? "home" : "stopdesk")}
          </span>
        </div>
        <a
          href={`tel:${order.customer.phone.replace(/\s/g, "")}`}
          aria-label={t("call", { name: order.customer.fullName })}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-rose-50 text-rose"
        >
          <IconPhoneCall className="h-5 w-5" />
        </a>
        <button
          type="button"
          onClick={() =>
            navigator.clipboard?.writeText(order.customer.phone).catch(() => {})
          }
          aria-label="Copier"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-pill border border-sand-deep text-ink-muted"
        >
          <IconCopy className="h-5 w-5" />
        </button>
      </section>

      {/* money */}
      <section className="mx-4 flex flex-col gap-2 border border-sand-deep p-4">
        <ul className="flex flex-col gap-1.5">
          {order.items.map((i) => (
            <li key={i.title} className={row}>
              <span className="text-ink-muted">
                {i.title}
                {i.quantity > 1 ? (
                  <span className="lat"> × {i.quantity}</span>
                ) : null}
              </span>
              <span className="lat shrink-0">
                {formatDzd(i.price * i.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className={`${row} border-t border-sand-deep pt-2.5`}>
          <span className="text-ink-muted">{t("subtotal")}</span>
          <span className="lat font-semibold">{formatDzd(order.subtotal)}</span>
        </div>
        <div className={row}>
          <span className="text-ink-muted">{t("delivery")}</span>
          <span className="lat">{formatDzd(order.deliveryFee)}</span>
        </div>
        <div className={`${row} border-t border-sand-deep pt-2.5`}>
          <span className="font-semibold">{t("expected")}</span>
          <span className="lat font-display text-title">
            {formatDzd(order.expected)}
          </span>
        </div>
      </section>

      {/* yalidine */}
      <section className="mx-4 flex flex-col gap-2 rounded-card bg-sand p-4">
        <span className="text-micro uppercase tracking-[0.06em] text-ink-muted">
          {t("yalidine")}
        </span>
        {order.yalidine ? (
          <>
            <span className="lat text-body-lg font-semibold">
              {order.yalidine.tracking}
            </span>
            <span className="text-caption text-ink-muted">
              {t("parcelCreated", { at: at(order.yalidine.createdAt) })}
            </span>
            <button
              type="button"
              onClick={() => stub(t("needsCredentials"))}
              className="mt-1 h-11 w-fit rounded-pill border border-sand-deep bg-surface px-4 text-caption font-semibold"
            >
              {t("printLabel")}
            </button>
          </>
        ) : (
          <>
            <span className="text-caption text-ink-muted">{t("noParcel")}</span>
            <button
              type="button"
              onClick={() => stub(t("needsCredentials"))}
              className="mt-1 flex h-11 w-fit items-center gap-2 rounded-pill border border-sand-deep bg-surface px-4 text-caption font-semibold"
            >
              <IconAlert className="h-4 w-4 text-warning" />
              {t("createParcel")}
            </button>
          </>
        )}
      </section>

      {/* timeline */}
      <ol className="mx-4 flex flex-col">
        {STEPS.map((step, i) => {
          const entry = order.timeline.find((s) => s.key === step);
          const isDone = done.has(step);
          const last = i === STEPS.length - 1;
          return (
            <li key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1 h-4 w-4 shrink-0 rounded-pill border-2 ${
                    isDone ? "border-rose bg-rose" : "border-sand-deep bg-surface"
                  }`}
                />
                {!last ? (
                  <span
                    className={`w-0.5 flex-1 ${isDone ? "bg-rose" : "bg-sand-deep"}`}
                  />
                ) : null}
              </div>
              <div className="flex flex-col pb-5">
                <span
                  className={`text-body ${isDone ? "font-semibold text-ink" : "text-ink-faint"}`}
                >
                  {t(`timeline.${step}`)}
                </span>
                <span className="text-caption text-ink-faint">
                  {entry ? at(entry.at) : t("pending")}
                </span>
              </div>
            </li>
          );
        })}
      </ol>

      {note ? (
        <p
          role="status"
          className="mx-4 rounded-card bg-ink p-3 text-center text-caption text-paper"
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

      {/* actions — only the moves this status actually allows */}
      {next.length > 0 ? (
        <div className="fixed inset-x-0 bottom-[56px] z-20 mx-auto flex w-full max-w-[640px] items-center gap-3 border-t border-sand-deep bg-surface/95 px-4 py-3 backdrop-blur">
          {next.length > 1 ? (
            <button
              type="button"
              onClick={() => move(next[1])}
              disabled={busy !== null}
              className="h-11 rounded-pill border border-danger/40 px-5 text-body font-semibold text-danger disabled:opacity-50"
            >
              {ts(next[1])}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => move(next[0])}
            disabled={busy !== null}
            className="h-11 flex-1 rounded-pill bg-rose px-5 text-body font-semibold text-paper hover:bg-rose-hover disabled:bg-sand-deep disabled:text-ink-faint"
          >
            {busy ? tc("loading") : t(`moveTo.${next[0]}`)}
          </button>
        </div>
      ) : (
        <p className="mx-4 rounded-card bg-sand p-3 text-center text-caption text-ink-muted">
          {t("finished")}
        </p>
      )}
    </main>
  );
}

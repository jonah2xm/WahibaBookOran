"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Loading, LoadFailed } from "@/components/Async";
import { IconPhoneCall } from "@/components/icons";
import { api, messageFor } from "@/lib/client";
import { PIPELINE, STATUS_TONE, type OrderStatus } from "@/lib/statusTone";
import type { OrderDto } from "@/lib/serialize";
import { formatDzd } from "@/lib/format";

type Payload = { items: OrderDto[]; counts: Record<OrderStatus, number> };

/** A7 — Ventes, le pipeline. Appel en un geste. */
export default function SalesPage() {
  const t = useTranslations("sales");
  const ts = useTranslations("status");
  const tc = useTranslations("common");

  const [tab, setTab] = useState<OrderStatus>("pending");
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (status: OrderStatus) => {
      setError(null);
      try {
        setData(await api.get<Payload>(`/api/orders?status=${status}`));
      } catch (e) {
        setData(null);
        setError(messageFor(e, tc("loadFailed")));
      }
    },
    [tc],
  );

  // Refetches on every tab change: the counts come back with the column, so
  // the badges stay honest as orders move.
  useEffect(() => {
    void load(tab);
  }, [load, tab]);

  const shown = data?.items ?? [];
  const counts = data?.counts;

  return (
    <main className="flex flex-col pb-6">
      <header className="flex flex-col gap-3 pb-3 pt-4">
        <h1 className="px-4 font-display text-title">{t("title")}</h1>

        <div className="rail flex gap-2 overflow-x-auto px-4">
          {PIPELINE.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={tab === s}
              onClick={() => setTab(s)}
              className={`flex h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-caption font-medium ${
                tab === s
                  ? "border-rose bg-rose text-white"
                  : "border-sand-deep bg-surface text-ink"
              }`}
            >
              {ts(s)}
              {counts ? (
                <span className="lat opacity-70">· {counts[s] ?? 0}</span>
              ) : null}
            </button>
          ))}
        </div>
      </header>

      {error ? <LoadFailed message={error} onRetry={() => load(tab)} /> : null}
      {!data && !error ? <Loading rows={4} /> : null}

      <ul className="flex flex-col gap-2 px-4">
        {shown.map((o) => {
          const count = o.items.reduce((n, i) => n + i.quantity, 0);
          const line = [
            o.delivery.wilaya,
            o.delivery.commune,
            o.yalidine?.tracking ?? t("items", { count }),
          ].join(" · ");

          return (
            <li
              key={o.orderNumber}
              className="flex flex-col gap-2 rounded-card bg-surface p-3 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Link
                  href={`/ventes/${o.orderNumber}`}
                  className="lat font-display text-body-lg font-semibold"
                >
                  {o.orderNumber}
                </Link>
                <span
                  className={`rounded-full px-2.5 py-1 text-micro uppercase tracking-[0.06em] ${
                    STATUS_TONE[o.status as OrderStatus]
                  }`}
                >
                  {ts(o.status)}
                </span>
              </div>

              <div className="flex items-end gap-3">
                <Link
                  href={`/ventes/${o.orderNumber}`}
                  className="flex min-w-0 flex-1 flex-col"
                >
                  <span className="text-body font-semibold">
                    {o.customer.fullName}
                  </span>
                  <span className="line-clamp-1 text-caption text-ink-muted">
                    {line}
                  </span>
                  <span className="lat mt-0.5 text-body font-semibold">
                    {formatDzd(o.expected)}
                  </span>
                </Link>

                {/* one tap to call — the single most used action in this list */}
                <a
                  href={`tel:${o.customer.phone.replace(/\s/g, "")}`}
                  aria-label={t("call", { name: o.customer.fullName })}
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-rose-50 text-rose"
                >
                  <IconPhoneCall className="h-5 w-5" />
                </a>
              </div>
            </li>
          );
        })}
      </ul>

      {data && shown.length === 0 ? (
        <p className="px-8 py-14 text-center text-body text-ink-muted">
          {t("none")}
        </p>
      ) : null}
    </main>
  );
}

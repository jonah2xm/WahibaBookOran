"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { IconPhone } from "@/components/icons";
import { formatDzd } from "@/lib/format";

type StoredOrder = {
  orderNumber: string;
  delivery: { wilaya: string; commune: string };
  items: { title: string; quantity: number; price: number }[];
  totals: { subtotal: number; deliveryFee: number | null; total: number };
  /** no tariff for this commune — the shop confirms the fee by phone */
  deliveryFeePending?: boolean;
};

/**
 * S7 — Confirmation.
 *
 * Reads the receipt the checkout kept after the server accepted the order.
 * The numbers here are the ones the server recorded, not the ones the
 * browser had computed before sending.
 */
export default function ConfirmationPage() {
  const t = useTranslations("confirmation");
  const tb = useTranslations("brand");
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bookoran31.lastOrder");
      if (raw) setOrder(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  if (!order) {
    return (
      <main className="flex flex-col items-center gap-4 px-8 py-20 text-center">
        <p className="text-body text-ink-muted">{t("noOrder")}</p>
        <Link
          href="/"
          className="grid h-11 place-items-center rounded-full bg-rose px-6 text-body font-semibold text-paper"
        >
          {t("keepShopping")}
        </Link>
      </main>
    );
  }

  const count = order.items.reduce((n, i) => n + i.quantity, 0);


  return (
    <main className="flex flex-col gap-5 px-4 py-8">
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-success/10">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" aria-hidden>
            <path
              d="m5 12.5 4.5 4.5L19 7.5"
              stroke="var(--color-success)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h1 className="font-display text-display">{t("title")}</h1>
        <p className="text-body text-ink-muted">{t("body")}</p>
      </div>

      <div className="flex items-center justify-between rounded-card bg-sand p-4">
        <div className="flex flex-col">
          <span className="text-micro uppercase tracking-[0.06em] text-ink-muted">
            {t("orderNumber")}
          </span>
          <span className="lat font-display text-title">
            {order.orderNumber}
          </span>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(order.orderNumber).then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              },
              () => {
                /* clipboard blocked — the number is on screen anyway */
              },
            );
          }}
          className="h-11 rounded-full border border-sand-deep bg-surface px-4 text-caption font-semibold"
        >
          {copied ? t("copied") : t("copy")}
        </button>
      </div>

      <dl className="flex flex-col gap-2 rounded-card bg-surface p-4 shadow-sm">
        <div className="flex items-baseline justify-between">
          <dt className="text-body text-ink-muted">
            {t("items", { count })}
          </dt>
          <dd className="lat text-body">{formatDzd(order.totals.subtotal)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-body text-ink-muted">
            {t("deliveryTo", {
              place: `${order.delivery.wilaya}, ${order.delivery.commune}`,
            })}
          </dt>
          <dd className="shrink-0 text-body">
            {/* A pending fee is stored as 0, which would read as "free
                delivery". Say "à confirmer" instead — the shop will quote it
                on the phone. */}
            {order.deliveryFeePending || order.totals.deliveryFee === null ? (
              <span className="text-caption text-ink-faint">
                {t("toConfirm")}
              </span>
            ) : (
              <span className="lat">{formatDzd(order.totals.deliveryFee)}</span>
            )}
          </dd>
        </div>

        {order.deliveryFeePending ? (
          <p className="rounded-card bg-warning/12 p-3 text-caption text-warning">
            {t("feePending")}
          </p>
        ) : null}
        <div className="flex items-baseline justify-between border-t border-sand-deep pt-3">
          <dt className="text-body font-semibold">{t("toPay")}</dt>
          <dd className="lat font-display text-title">
            {formatDzd(order.totals.total)}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-2">
        <Link
          href="/suivi"
          className="grid h-11 place-items-center rounded-full bg-rose text-body font-semibold text-paper"
        >
          {t("track")}
        </Link>
        <Link
          href="/"
          className="grid h-11 place-items-center rounded-full border border-sand-deep bg-surface text-body font-semibold text-ink"
        >
          {t("keepShopping")}
        </Link>
      </div>

      <a
        href={`tel:${tb("phone").replace(/\s/g, "")}`}
        className="flex items-center justify-center gap-2 text-body text-ink-muted"
      >
        <IconPhone className="h-5 w-5 text-rose" />
        <span className="lat">{tb("phone")}</span>
      </a>
    </main>
  );
}

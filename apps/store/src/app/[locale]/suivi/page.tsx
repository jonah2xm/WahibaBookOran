"use client";

import { useCallback, useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { IconChevron, IconInfo } from "@/components/icons";
import { formatDzd } from "@/lib/format";

type TrackedOrder = {
  orderNumber: string;
  status: string;
  placedAt: string;
  timeline: { key: string; at: string }[];
  delivery: { wilaya: string; commune: string };
  totals: { total: number };
  tracking: string | null;
};

type StepKey = "registered" | "confirmed" | "packed" | "shipped" | "delivered";
const STEPS: StepKey[] = ["registered", "confirmed", "packed", "shipped", "delivered"];

/**
 * The order's real status, mapped onto the five steps the customer sees.
 * `remitted` is the shop being paid by Yalidine — no business of the
 * customer's, who already paid the driver, so it reads as delivered.
 */
/** The raw status behind each step, for dating it from the timeline. */
const STATUS_OF: Record<StepKey, string> = {
  registered: "pending",
  confirmed: "confirmed",
  packed: "packed",
  shipped: "shipped",
  delivered: "delivered",
};

const STEP_FOR: Record<string, StepKey> = {
  pending: "registered",
  confirmed: "confirmed",
  packed: "packed",
  shipped: "shipped",
  delivered: "delivered",
  remitted: "delivered",
};

function digits(s: string) {
  return s.replace(/\D/g, "");
}

/**
 * S8 — Suivi. Looks the order up by number AND phone: checkout is guest-only,
 * so there is no account, and order numbers are sequential — the phone is
 * what stops anyone walking the range and reading other people's orders.
 */
export default function TrackingPage() {
  const t = useTranslations("tracking");
  const tn = useTranslations("nav");
  const format = useFormatter();
  const [number, setNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searching, setSearching] = useState(false);
  const [copied, setCopied] = useState(false);

  const lookUp = useCallback(async (num: string, tel: string) => {
    setNotFound(false);
    setSearching(true);
    try {
      const res = await fetch(
        `/api/orders/track?number=${encodeURIComponent(num.trim())}&phone=${encodeURIComponent(digits(tel))}`,
      );
      if (!res.ok) {
        setOrder(null);
        setNotFound(true);
        return;
      }
      setOrder((await res.json()) as TrackedOrder);
    } catch {
      setOrder(null);
      setNotFound(true);
    } finally {
      setSearching(false);
    }
  }, []);

  // Prefill from the order just placed, so the link from S7 lands on a
  // result. The receipt is only a hint — the status still comes from the
  // server, because the shop may have moved the order along since.
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bookoran31.lastOrder");
      if (!raw) return;
      const o = JSON.parse(raw) as {
        orderNumber: string;
        customer: { phone: string };
      };
      setNumber(o.orderNumber);
      setPhone(o.customer.phone);
      void lookUp(o.orderNumber, o.customer.phone);
    } catch {
      /* ignore */
    }
  }, [lookUp]);

  function search() {
    void lookUp(number, phone);
  }

  const current: StepKey = order ? (STEP_FOR[order.status] ?? "registered") : "registered";
  const currentIndex = STEPS.indexOf(current);

  const stepAt = (step: StepKey): string | undefined => {
    const entry = order?.timeline.find((e) => e.key === STATUS_OF[step]);
    if (entry) return entry.at;
    // The order row itself is the record of "registered"; older orders may
    // predate the history entry for it.
    return step === "registered" ? order?.placedAt : undefined;
  };

  const field =
    "h-11 w-full rounded-input border border-sand-deep bg-surface px-4 text-body outline-none placeholder:text-ink-faint focus:border-rose";
  const label = "text-micro uppercase tracking-[0.06em] text-ink-muted";

  return (
    <main className="flex flex-col gap-4 pb-8">
      <header className="flex items-center gap-1 px-2 py-2">
        <Link
          href="/"
          aria-label={tn("back")}
          className="grid h-11 w-11 place-items-center text-ink"
        >
          <span className="rotate-180 rtl:rotate-0">
            <IconChevron className="h-5 w-5" />
          </span>
        </Link>
        <h1 className="font-display text-title">{t("title")}</h1>
      </header>

      <section className="flex flex-col gap-3 px-4">
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("orderNumber")}</span>
          <div className="flex gap-2">
            <input
              className={`${field} lat`}
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="BO-0000"
            />
            <button
              type="button"
              onClick={search}
              className="h-11 shrink-0 rounded-full bg-rose px-5 text-body font-semibold text-white"
            >
              {t("submit")}
            </button>
          </div>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("phone")}</span>
          <input
            className={`${field} lat`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            placeholder="0X XX XX XX XX"
          />
        </label>
        {notFound ? (
          <p role="alert" className="text-caption text-danger">
            {t("notFound")}
          </p>
        ) : null}
      </section>

      {order ? (
        <section className="mx-4 flex flex-col gap-4 rounded-card bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="lat font-display text-title">
              {order.orderNumber}
            </span>
            <span className="rounded-full bg-rose-50 px-3 py-1 text-micro uppercase tracking-[0.06em] text-rose">
              {t(`statusShort.${current}`)}
            </span>
          </div>

          {order.tracking ? (
            <div className="flex items-center justify-between gap-2 rounded-input bg-sand px-3 py-2">
              <div className="flex flex-col">
                <span className={label}>{t("yalidine")}</span>
                <span className="lat text-body font-semibold">
                  {order.tracking}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard
                    ?.writeText(order.tracking as string)
                    .then(
                      () => {
                        setCopied(true);
                        window.setTimeout(() => setCopied(false), 2000);
                      },
                      () => {},
                    );
                }}
                className="h-11 rounded-full border border-sand-deep bg-surface px-4 text-caption font-semibold"
              >
                {copied ? t("copied") : t("copy")}
              </button>
            </div>
          ) : (
            <p className="flex items-start gap-2 rounded-input bg-sand px-3 py-2.5 text-caption text-ink-muted">
              <IconInfo className="h-4 w-4 shrink-0 text-ink-faint" />
              {t("awaitingCall")}
            </p>
          )}

          {/* timeline */}
          <ol className="flex flex-col">
            {STEPS.map((step, i) => {
              const done = i <= currentIndex;
              const last = i === STEPS.length - 1;
              return (
                <li key={step} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
                        done
                          ? "border-rose bg-rose"
                          : "border-sand-deep bg-surface"
                      }`}
                    />
                    {!last ? (
                      <span
                        className={`w-0.5 flex-1 ${
                          i < currentIndex ? "bg-rose" : "bg-sand-deep"
                        }`}
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-col pb-5">
                    <span
                      className={`text-body ${
                        done ? "font-semibold text-ink" : "text-ink-faint"
                      }`}
                    >
                      {t(`status.${step}`)}
                    </span>
                    {/* Dated from the order's own history, so a step the
                        shop has already completed shows when — not a
                        permanent "en attente" under a ticked circle. */}
                    <span className="text-caption text-ink-faint">
                      {stepAt(step)
                        ? format.dateTime(new Date(stepAt(step) as string), {
                            day: "numeric",
                            month: "long",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : t("pending")}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>

          <p className="flex items-start gap-2 rounded-input bg-rose-50 p-3 text-caption text-ink">
            <IconInfo className="h-4 w-4 shrink-0 text-rose" />
            {t("prepare", { amount: formatDzd(order.totals.total) })}
          </p>
        </section>
      ) : null}
    </main>
  );
}

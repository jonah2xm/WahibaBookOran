"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useCart } from "@/components/CartProvider";
import { PickerSheet, type PickerOption } from "@/components/PickerSheet";
import { IconChevron, IconInfo, IconTruck, IconWallet } from "@/components/icons";
import { centersOf, communesOf, wilayas, zoneFees } from "@/lib/geo";
import { pick } from "@/lib/types";
import { formatDzd } from "@/lib/format";
import type { QuoteResponse } from "@/app/api/quote/route";

type FeeState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; quote: Extract<QuoteResponse, { status: "ok" }> }
  | { kind: "unavailable" };

/** S6 — Commande. Three steps on one scroll. */
export default function CheckoutPage() {
  const locale = useLocale();
  const t = useTranslations("checkout");
  const tn = useTranslations("nav");
  // Same source as every other "call us" link in the shop. This one used to
  // be a hardcoded number, which meant changing the shop's phone fixed three
  // places and left the fourth calling a stranger.
  const tb = useTranslations("brand");
  const router = useRouter();
  const { lines, subtotal, ready, clear } = useCart();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [altPhone, setAltPhone] = useState("");
  const [wilayaId, setWilayaId] = useState<number | null>(null);
  const [communeId, setCommuneId] = useState<number | null>(null);
  const [method, setMethod] = useState<"home" | "stopdesk">("home");
  const [address, setAddress] = useState("");
  const [centerId, setCenterId] = useState<number | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [sheet, setSheet] = useState<null | "wilaya" | "commune">(null);
  const [fee, setFee] = useState<FeeState>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  // guards against a double tap placing two orders
  const [sending, setSending] = useState(false);

  const wilaya = wilayas.find((w) => w.id === wilayaId) ?? null;
  const communeList = wilayaId ? communesOf(wilayaId) : [];
  const commune = communeList.find((c) => c.id === communeId) ?? null;
  const centerList = wilayaId ? centersOf(wilayaId) : [];
  const center = centerList.find((c) => c.id === centerId) ?? centerList[0] ?? null;
  const rates = wilayaId ? zoneFees(wilayaId) : null;

  const payload = useMemo(
    () => lines.map((l) => ({ slug: l.slug, quantity: l.quantity })),
    [lines],
  );

  // quote whenever the commune or the method changes
  useEffect(() => {
    if (!wilayaId || !communeId || payload.length === 0) {
      setFee({ kind: "idle" });
      return;
    }
    const controller = new AbortController();
    setFee({ kind: "loading" });
    fetch("/api/quote", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ items: payload, wilayaId, communeId, method }),
      signal: controller.signal,
    })
      .then((r) => r.json() as Promise<QuoteResponse>)
      .then((q) =>
        setFee(q.status === "ok" ? { kind: "ok", quote: q } : { kind: "unavailable" }),
      )
      .catch((e) => {
        if (e?.name === "AbortError") return;
        // Never block the sale on the quote failing (PROJECT_PLAN §6).
        setFee({ kind: "unavailable" });
      });
    return () => controller.abort();
  }, [wilayaId, communeId, method, payload]);

  // An empty cart means the customer got here by accident — send them back.
  // But confirming also empties the cart, so once submitted this guard must
  // stand down or it races the push to the confirmation page and wins.
  useEffect(() => {
    if (submitted) return;
    if (ready && lines.length === 0) router.replace("/panier");
  }, [ready, lines.length, router, submitted]);

  const deliveryFee = fee.kind === "ok" ? fee.quote.fee : null;
  const total = subtotal + (deliveryFee ?? 0);

  async function confirm() {
    if (!fullName.trim() || !phone.trim() || !wilaya || !commune) {
      setError(t("missingFields"));
      return;
    }
    if (method === "home" && !address.trim()) {
      setError(t("missingFields"));
      return;
    }
    if (!agreed) {
      setError(t("mustAgree"));
      return;
    }
    setError(null);
    setSending(true);

    try {
      /**
       * The server recomputes every price, fee and total from the catalogue.
       * The numbers on this screen were display only — if they disagree, the
       * server's win, and the confirmation page shows what was actually
       * recorded rather than what the browser had hoped for.
       */
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          items: lines.map((l) => ({
            slug: l.slug,
            quantity: l.quantity,
          })),
          customer: { fullName, phone, altPhone: altPhone || undefined },
          delivery: {
            method,
            wilayaId: wilaya.id,
            communeId: commune.id,
            address: method === "home" ? address : undefined,
            stopdeskCenterId:
              method === "stopdesk" && center ? center.id : undefined,
          },
          locale,
          agreed: true,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        // A book that sold out between adding it and confirming is the one
        // failure worth its own message — the customer needs to go back to
        // the cart, not retry the same order.
        if (data?.error?.code === "nothing_available") {
          setError(t("noLongerAvailable"));
        } else {
          setError(data?.error?.message ?? t("orderFailed"));
        }
        setSending(false);
        return;
      }

      // Confirmed. Keep the receipt for the confirmation screen, then empty
      // the cart — `submitted` stands the empty-cart guard down so it does
      // not race this navigation and win.
      setSubmitted(true);
      try {
        localStorage.setItem(
          "bookoran31.lastOrder",
          JSON.stringify({
            orderNumber: data.orderNumber,
            customer: { fullName, phone, altPhone },
            delivery: {
              method,
              wilaya: pick(wilaya.name, locale),
              commune: pick(commune.name, locale),
              address: method === "home" ? address : null,
              center:
                method === "stopdesk" && center
                  ? pick(center.name, locale)
                  : null,
            },
            items: lines.map((l) => ({
              title: pick(l.book.title, locale),
              quantity: l.quantity,
              price: l.book.priceDzd,
            })),
            totals: {
              subtotal: data.subtotal,
              deliveryFee: data.deliveryFee,
              total: data.total,
            },
            deliveryFeePending: Boolean(data.deliveryFeePending),
            createdAt: new Date().toISOString(),
          }),
        );
      } catch {
        /* storage blocked — the order is placed either way */
      }
      clear();
      router.push("/commande/confirmation");
    } catch {
      setError(t("orderFailed"));
      setSending(false);
    }
  }

  // The board has no boxed input: a field is a micro-caps label over a
  // hairline underline, the same rule that divides every list on the page.
  const field = "field-underline";
  const label = "field-label";

  return (
    <main className="flex flex-col pb-28">
      <header className="flex items-center gap-1 px-2 py-2">
        <Link
          href="/panier"
          aria-label={tn("back")}
          className="grid h-11 w-11 place-items-center text-ink"
        >
          <span className="rotate-180 rtl:rotate-0">
            <IconChevron className="h-5 w-5" />
          </span>
        </Link>
        <h1 className="font-display text-title">{t("title")}</h1>
      </header>

      {/* progress */}
      <ol className="flex items-center gap-2 px-4 pb-4">
        {[t("stepShort1"), t("stepShort2"), t("stepShort3")].map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span
              className={`lat grid h-6 w-6 shrink-0 place-items-center rounded-full text-micro ${
                i === 0 ? "bg-rose text-paper" : "bg-sand text-ink-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className="truncate text-caption text-ink-muted">{s}</span>
          </li>
        ))}
      </ol>

      {/* 1 · Coordonnées */}
      <section className="flex flex-col gap-3 px-4">
        <h2 className="mb-4 font-display text-[22px]">{t("step1")}</h2>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("fullName")}</span>
          <input
            className={field}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t("fullNamePh")}
            autoComplete="name"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("phone")}</span>
          <input
            className={`${field} lat`}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t("phonePh")}
            inputMode="tel"
            autoComplete="tel"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={label}>{t("altPhone")}</span>
          <input
            className={`${field} lat`}
            value={altPhone}
            onChange={(e) => setAltPhone(e.target.value)}
            placeholder={t("phonePh")}
            inputMode="tel"
          />
        </label>
      </section>

      {/* 2 · Livraison */}
      <section className="mt-6 flex flex-col gap-3 px-4">
        <h2 className="section-head">{t("step2")}</h2>

        <div className="flex flex-col gap-1.5">
          <span className={label}>{t("wilaya")}</span>
          <button
            type="button"
            onClick={() => setSheet("wilaya")}
            className={`${field} flex items-center justify-between text-start`}
          >
            <span className={wilaya ? "text-ink" : "text-ink-faint"}>
              {wilaya ? pick(wilaya.name, locale) : t("choose")}
            </span>
            <span className="rotate-90 text-ink-muted">
              <IconChevron className="h-4 w-4" />
            </span>
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={label}>{t("commune")}</span>
          <button
            type="button"
            disabled={!wilayaId}
            onClick={() => setSheet("commune")}
            className={`${field} flex items-center justify-between text-start disabled:opacity-50`}
          >
            <span className={commune ? "text-ink" : "text-ink-faint"}>
              {commune ? pick(commune.name, locale) : t("choose")}
            </span>
            <span className="rotate-90 text-ink-muted">
              <IconChevron className="h-4 w-4" />
            </span>
          </button>
          {wilayaId ? (
            <span className="text-caption text-ink-faint">
              {t("communesHint", { count: communeList.length })}
            </span>
          ) : null}
        </div>

        {/* method cards, each with its own price */}
        <div className="mt-1 flex flex-col gap-2">
          {(["home", "stopdesk"] as const).map((m) => {
            const active = method === m;
            const price = rates ? (m === "home" ? rates.home : rates.desk) : null;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                aria-pressed={active}
                className={`flex items-center gap-[13px] border px-4 py-[15px] text-start ${
                  active ? "border-rose" : "border-sand-deep"
                }`}
              >
                <span
                  className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full border-[1.5px] ${
                    active ? "border-rose" : "border-ink-faint"
                  }`}
                >
                  {active ? (
                    <span className="h-2 w-2 rounded-full bg-rose" />
                  ) : null}
                </span>
                <span className="flex flex-1 flex-col">
                  <span className="text-body font-semibold">
                    {m === "home" ? t("home") : t("desk")}
                  </span>
                  <span className="text-caption text-ink-muted">
                    {m === "home" ? t("homeDelay") : t("deskDelay")}
                  </span>
                </span>
                {price !== null ? (
                  <span className="lat text-body font-semibold">
                    {formatDzd(price)}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {method === "home" ? (
          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("address")}</span>
            {/* The one boxed field in the board: an underline cannot
                hold three lines of address. */}
            <textarea
              rows={3}
              className="min-h-[76px] w-full resize-none border border-sand-deep bg-transparent p-3 text-[15px] outline-none placeholder:text-ink-faint focus:border-rose"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder={t("addressPh")}
            />
          </label>
        ) : center ? (
          <div className="flex flex-col gap-1.5">
            <span className={label}>{t("center")}</span>
            <div className="flex items-center gap-3 border-y border-sand-deep py-4">
              <IconTruck className="h-5 w-5 shrink-0 text-rose" />
              <div className="flex flex-col">
                <span className="text-body font-semibold">
                  {pick(center.name, locale)}
                </span>
                <span className="text-caption text-ink-muted">
                  {pick(center.address, locale)} · {center.hours}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        {/* the delivery-fee block — one place on screen, four states */}
        <div className="mt-2 flex flex-col gap-2 border-y border-sand-deep py-3.5">
          <span className={label}>{t("feeTitle")}</span>

          {fee.kind === "idle" ? (
            <div className="flex min-h-11 items-center gap-2.5">
              <IconInfo className="h-5 w-5 shrink-0 text-ink-faint" />
              <span className="text-caption text-ink-muted">{t("feeIdle")}</span>
            </div>
          ) : null}

          {fee.kind === "loading" ? (
            <div className="flex min-h-11 items-center gap-3">
              <div className="shimmer h-[26px] flex-1 rounded-full" />
              <span className="text-caption text-ink-faint">
                {t("feeLoading")}
              </span>
            </div>
          ) : null}

          {fee.kind === "ok" ? (
            <div className="flex min-h-11 items-center justify-between gap-2.5 bg-rose-50 px-3 py-2">
              <span className="flex flex-col">
                <span className="text-body font-semibold">
                  {commune ? pick(commune.name, locale) : ""}
                </span>
                <span className="text-caption text-ink-muted">
                  {fee.quote.freeShippingApplied
                    ? t("feeFree")
                    : t("feeConfirmed")}
                </span>
              </span>
              <span className="lat font-display text-title">
                {formatDzd(fee.quote.fee)}
              </span>
            </div>
          ) : null}

          {fee.kind === "unavailable" ? (
            <div className="flex flex-col gap-2.5 bg-warning/10 p-3">
              <span className="text-caption text-ink">
                {t("feeUnavailable")}
              </span>
              <a
                href={`tel:${tb("phone").replace(/\s/g, "")}`}
                className="grid place-items-center rounded-pill border border-warning py-3 text-caption font-semibold text-warning"
              >
                {t("callMe")}
              </a>
            </div>
          ) : null}
        </div>
      </section>

      {/* 3 · Récapitulatif */}
      <section className="mt-6 flex flex-col gap-2 px-4">
        <h2 className="section-head">{t("step3")}</h2>
        <ul className="flex flex-col gap-1.5">
          {lines.map((l) => (
            <li key={l.slug} className="flex items-baseline justify-between gap-3">
              <span className="text-body text-ink-muted">
                {pick(l.book.title, locale)}
                {l.quantity > 1 ? (
                  <span className="lat"> × {l.quantity}</span>
                ) : null}
              </span>
              <span className="lat shrink-0 text-body">
                {formatDzd(l.lineTotal)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-2 flex items-baseline justify-between border-t border-sand-deep pt-3">
          <span className="text-body text-ink-muted">{t("subtotal")}</span>
          <span className="lat text-body font-semibold">
            {formatDzd(subtotal)}
          </span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-body text-ink-muted">{t("delivery")}</span>
          {deliveryFee !== null ? (
            <span className="lat text-body font-semibold">
              {formatDzd(deliveryFee)}
            </span>
          ) : (
            <span className="text-caption text-ink-faint">
              {fee.kind === "unavailable" ? t("toConfirm") : "—"}
            </span>
          )}
        </div>
        <div className="flex items-baseline justify-between border-b-2 border-ink pb-3.5" />
        <div className="flex items-baseline justify-between pb-[22px] pt-4">
          <span className="font-display text-[22px]">{t("total")}</span>
          <span className="lat font-display text-[28px] font-bold tracking-[-0.02em]">
            {formatDzd(total)}
          </span>
        </div>

        <div className="relative flex gap-3 overflow-hidden bg-sand px-[18px] py-4">
          <span className="rule-tricolour absolute inset-x-0 top-0 h-[3px]" />
          <IconWallet className="mt-0.5 h-[17px] w-[17px] shrink-0 text-rose" />
          <div className="flex flex-col">
            <span className="text-[14.5px] font-semibold">{t("codTitle")}</span>
            <span className="mt-0.5 text-[13px] text-body">{t("codBody")}</span>
          </div>
        </div>

        {/* A square box, not the round native control: the board draws a
            1.5px ink square that fills with wine when checked. `appearance-none`
            keeps the real <input> for the keyboard and the label. */}
        <label className="mt-5 flex items-start gap-[11px] text-body">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="checkbox-square mt-px"
          />
          <span className="text-[13.5px] leading-[1.45] text-body">
            {t("agreePre")}
            <Link href="/conditions" className="text-rose underline">
              {t("agreeLink")}
            </Link>
            {t("agreePost")}
          </span>
        </label>

        {error ? (
          <p role="alert" className="text-caption text-danger">
            {error}
          </p>
        ) : null}
      </section>

      {/* fixed action bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-[480px] border-t border-ink bg-paper px-5 pb-5 pt-3.5">
        <div className="flex items-center gap-3 pb-[env(safe-area-inset-bottom)]">
          <div className="flex shrink-0 flex-col">
            <span className={label}>{t("totalDue")}</span>
            <span className="lat font-display text-title">
              {formatDzd(total)}
            </span>
          </div>
          <button
            type="button"
            onClick={confirm}
            disabled={sending}
            className="ms-auto flex-1 rounded-pill bg-rose px-4 py-4 text-[15px] font-semibold text-paper shadow-md hover:bg-rose-hover disabled:bg-sand-deep disabled:text-ink-faint disabled:shadow-none"
          >
            {sending ? t("sending") : t("confirm")}
          </button>
        </div>
      </div>

      <PickerSheet
        open={sheet === "wilaya"}
        title={t("wilaya")}
        options={wilayas.map<PickerOption>((w) => ({
          id: w.id,
          label: pick(w.name, locale),
          sub: String(w.id).padStart(2, "0"),
        }))}
        onPick={(o) => {
          setWilayaId(o.id);
          setCommuneId(null);
          setCenterId(null);
        }}
        onClose={() => setSheet(null)}
      />

      <PickerSheet
        open={sheet === "commune"}
        title={t("commune")}
        options={communeList.map<PickerOption>((c) => ({
          id: c.id,
          label: pick(c.name, locale),
        }))}
        onPick={(o) => setCommuneId(o.id)}
        onClose={() => setSheet(null)}
      />
    </main>
  );
}

import { getFormatter, getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconAlert, IconChevron } from "@/components/icons";
import { STATUS_TONE, type OrderStatus } from "@/lib/statusTone";
import { formatDzd } from "@/lib/format";
import { getDashboardData } from "@/lib/queries";
import { activeAdmin } from "@/lib/session";
import { pick } from "@/lib/types";

/** A2 — Tableau de bord. Every figure is read from the database. */
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("dashboard");
  const ts = await getTranslations("status");
  const format = await getFormatter();

  // The layout already redirected anyone without an active account, so this
  // is only here for the name on the greeting.
  const admin = await activeAdmin();
  const data = await getDashboardData();

  const name = admin?.name ?? "";
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="flex flex-col gap-5 pb-6">
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <div className="flex flex-col">
          <h1 className="font-display text-title">{t("greeting", { name })}</h1>
          {/* first-letter, not `capitalize`: French writes "dimanche 20
              septembre", so capitalising every word is wrong. */}
          <span className="text-caption text-ink-muted first-letter:uppercase">
            {format.dateTime(new Date(), {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>
        <span className="lat grid h-11 w-11 shrink-0 place-items-center rounded-pill bg-rose text-caption font-semibold text-paper">
          {initials}
        </span>
      </header>

      {/* stat tiles */}
      <section className="grid grid-cols-2 gap-3 px-4">
        <Tile label={t("ordersToday")} value={String(data.ordersToday)} />
        <Tile
          label={t("toConfirm")}
          value={String(data.toConfirm)}
          tone="warning"
        />
        <Tile
          label={t("collected")}
          value={formatDzd(data.collectedThisMonth)}
          sub={t("thisMonth")}
          tone="success"
        />
        <Tile
          label={t("awaiting")}
          value={formatDzd(data.awaitingCollection)}
          sub={t("parcels", { count: data.awaitingParcels })}
        />
      </section>

      {/* low stock */}
      <section className="flex flex-col gap-2 px-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-body-lg font-semibold">
            {t("lowStock")}
          </h2>
          <Link
            href="/stock"
            className="flex items-center gap-1 text-caption text-rose"
          >
            {t("seeAll")}
            <IconChevron />
          </Link>
        </div>

        {data.lowStock.length === 0 ? (
          <p className="border border-sand-deep p-4 text-caption text-ink-muted">
            {t("stockHealthy")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.lowStock.map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/stock/${b.slug}`}
                  className="flex items-center gap-3 border border-sand-deep p-3"
                >
                  <IconAlert
                    className={`h-5 w-5 shrink-0 ${
                      b.remaining === 0 ? "text-danger" : "text-warning"
                    }`}
                  />
                  <span className="flex flex-1 flex-col">
                    <span className="text-body font-semibold">
                      {pick(b.title, locale)}
                    </span>
                    <span className="text-caption text-ink-muted">
                      {t("threshold", { n: b.threshold })}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-micro uppercase tracking-[0.06em] ${
                      b.remaining === 0
                        ? "bg-danger/12 text-danger"
                        : "bg-warning/12 text-warning"
                    }`}
                  >
                    {b.remaining === 0 ? (
                      t("soldOut")
                    ) : (
                      <>
                        <span className="lat">{b.remaining}</span>{" "}
                        {t("remaining")}
                      </>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* recent orders */}
      <section className="flex flex-col gap-2 px-4">
        <h2 className="font-display text-body-lg font-semibold">
          {t("recentOrders")}
        </h2>

        {data.recentOrders.length === 0 ? (
          <p className="border border-sand-deep p-4 text-caption text-ink-muted">
            {t("noOrders")}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.recentOrders.map((o) => (
              <li key={o.orderNumber}>
                <Link
                  href={`/ventes/${o.orderNumber}`}
                  className="flex items-center gap-3 border border-sand-deep p-3"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="line-clamp-1 text-body font-semibold">
                      <span className="lat">{o.orderNumber}</span> ·{" "}
                      {o.customer.fullName}
                    </span>
                    <span className="text-caption text-ink-muted">
                      {o.delivery.wilaya} ·{" "}
                      <span className="lat">{formatDzd(o.expected)}</span>
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-pill px-2.5 py-1 text-micro uppercase tracking-[0.06em] ${
                      STATUS_TONE[o.status as OrderStatus]
                    }`}
                  >
                    {ts(o.status)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "warning" | "success";
}) {
  const valueTone =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : "text-ink";

  return (
    <div className="flex flex-col gap-1 border border-sand-deep p-4">
      <span className="text-micro uppercase tracking-[0.06em] text-ink-muted">
        {label}
      </span>
      <span className={`lat font-display text-title ${valueTone}`}>{value}</span>
      {sub ? <span className="text-caption text-ink-faint">{sub}</span> : null}
    </div>
  );
}

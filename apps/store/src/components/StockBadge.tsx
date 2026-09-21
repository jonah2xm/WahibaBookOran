import { useTranslations } from "next-intl";
import type { StockState } from "@/lib/types";

/**
 * Never colour alone — every state carries its label (brief §8).
 */
export function StockBadge({ state }: { state: StockState }) {
  const t = useTranslations("book");

  if (state.kind === "in") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-micro uppercase tracking-[0.06em] text-success">
        {t("inStock")}
      </span>
    );
  }

  if (state.kind === "low") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2.5 py-1 text-micro uppercase tracking-[0.06em] text-warning">
        {t("lowStock", { count: state.count })}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-ink/8 px-2.5 py-1 text-micro uppercase tracking-[0.06em] text-ink-muted">
      {t("outOfStock")}
    </span>
  );
}

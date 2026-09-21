"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { formatDzd } from "@/lib/format";
import type { Filters } from "@/lib/browse";

/**
 * Price range sheet. Sorting and categories moved out to visible controls,
 * so this sheet now holds price alone and is labelled accordingly.
 *
 * DEVIATION FROM THE BOARD: the board draws a dual-thumb slider. These are two
 * native range inputs — keyboard-operable out of the box, and swappable later
 * without changing this component's contract.
 */
export function PriceSheet({
  open,
  onClose,
  value,
  onChange,
  bounds,
  resultCount,
}: {
  open: boolean;
  onClose: () => void;
  value: Filters;
  onChange: (next: Filters) => void;
  bounds: { min: number; max: number };
  resultCount: number;
}) {
  const t = useTranslations("filters");
  const tb = useTranslations("books");
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    panelRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const step = 5000; // 50 DA
  const min = value.min ?? bounds.min;
  const max = value.max ?? bounds.max;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 bg-ink/35"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={tb("priceAny")}
        className="relative w-full max-w-[480px] rounded-t-sheet bg-surface shadow-lg"
      >
        <div className="flex flex-col items-center pt-3">
          <span className="h-1 w-10 rounded-full bg-sand-deep" />
          <h2 className="mt-3 font-display text-title">{tb("priceAny")}</h2>
        </div>

        <div className="flex flex-col gap-2 px-4 py-5">
          <span className="lat text-body-lg font-semibold">
            {formatDzd(min)} – {formatDzd(max)}
          </span>
          <label className="flex items-center gap-3 text-caption text-ink-muted">
            <span className="w-16 shrink-0">{t("min")}</span>
            <input
              type="range"
              min={bounds.min}
              max={bounds.max}
              step={step}
              value={min}
              onChange={(e) =>
                onChange({
                  ...value,
                  min: Math.min(Number(e.target.value), max),
                })
              }
              className="h-11 flex-1 accent-[var(--color-rose)]"
            />
          </label>
          <label className="flex items-center gap-3 text-caption text-ink-muted">
            <span className="w-16 shrink-0">{t("max")}</span>
            <input
              type="range"
              min={bounds.min}
              max={bounds.max}
              step={step}
              value={max}
              onChange={(e) =>
                onChange({
                  ...value,
                  max: Math.max(Number(e.target.value), min),
                })
              }
              className="h-11 flex-1 accent-[var(--color-rose)]"
            />
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-sand-deep p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => onChange({ ...value, min: null, max: null })}
            className="h-11 rounded-full border border-sand-deep px-5 text-body font-semibold text-ink"
          >
            {t("reset")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="h-11 flex-1 rounded-full bg-rose px-5 text-body font-semibold text-white hover:bg-rose-hover"
          >
            {t("apply", { count: resultCount })}
          </button>
        </div>
      </div>
    </div>
  );
}

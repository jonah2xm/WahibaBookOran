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
        className="absolute inset-0 bg-[rgba(20,16,14,0.45)]"
      />
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={tb("priceAny")}
        className="sheet-panel relative w-full max-w-[480px]"
      >
        <span className="sheet-grab" />
        <h2 className="sheet-title">{tb("priceAny")}</h2>

        <div className="flex flex-col gap-2 px-[22px] pb-5 pt-5">
          <span className="lat font-display text-[26px] tracking-[-0.015em]">
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

        <div className="mt-5 flex items-center gap-2.5 border-t border-sand-deep px-[22px] pt-[26px] pb-[max(0.25rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => onChange({ ...value, min: null, max: null })}
            className="rounded-pill border border-ink px-[22px] py-3.5 text-body font-semibold text-ink"
          >
            {t("reset")}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-pill bg-rose py-3.5 text-body font-semibold text-paper hover:bg-rose-hover"
          >
            {t("apply", { count: resultCount })}
          </button>
        </div>
      </div>
    </div>
  );
}

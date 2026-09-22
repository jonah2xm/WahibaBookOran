"use client";

import { useTranslations } from "next-intl";

/** Board §02 "Sélecteur · stepper". Both buttons are 44px targets (brief §8). */
export function QuantityStepper({
  value,
  onChange,
  max,
  min = 1,
}: {
  value: number;
  onChange: (next: number) => void;
  max?: number;
  min?: number;
}) {
  const t = useTranslations("book");
  const cap = max ?? Infinity;

  const btn =
    "grid h-[34px] w-[34px] place-items-center rounded-full text-[19px] leading-none text-ink hover:bg-sand disabled:text-ink-faint disabled:hover:bg-transparent";

  return (
    <div
      className="inline-flex items-center gap-1 rounded-pill border border-ink p-1"
      role="group"
      aria-label={t("quantity")}
    >
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="−"
      >
        −
      </button>
      <span className="lat min-w-[26px] text-center font-display text-[17px] font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        className={btn}
        onClick={() => onChange(Math.min(cap, value + 1))}
        disabled={value >= cap}
        aria-label="+"
      >
        +
      </button>
    </div>
  );
}

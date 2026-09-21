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
    "grid h-11 w-11 place-items-center text-title text-ink disabled:text-ink-faint";

  return (
    <div
      className="inline-flex items-center rounded-full border border-sand-deep bg-surface"
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
      <span className="lat w-8 text-center text-body font-semibold tabular-nums">
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

"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

export type SelectOption<T extends string> = { value: T; label: string };

/**
 * Bottom-sheet replacement for a native <select>.
 *
 * The shop already answers "pick one from a list" with a sheet (PickerSheet
 * for communes, PriceSheet for the range), and a native dropdown renders as
 * whatever the phone's OS decides — grey iOS wheel, Android dialog — which is
 * the one control on the page that ignores the board's tokens entirely.
 *
 * Search is deliberately absent: this is for short lists. Anything long
 * enough to need a search field belongs in PickerSheet.
 */
export function SelectSheet<T extends string>({
  open,
  title,
  options,
  value,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  options: SelectOption<T>[];
  value: T;
  onPick: (value: T) => void;
  onClose: () => void;
}) {
  const t = useTranslations("filters");
  const listRef = useRef<HTMLUListElement>(null);

  /**
   * Focus, keyed on `open` alone.
   *
   * `onClose` is an inline arrow in the parent, so its identity changes on
   * every render. Including it here re-ran this effect constantly: it
   * overwrote the remembered trigger with whatever was focused inside the
   * sheet, and re-stole focus onto the selected row mid-keyboard-navigation.
   */
  useEffect(() => {
    if (!open) return;

    const back = document.activeElement as HTMLElement | null;

    // The current choice, not the first row: a keyboard should land where
    // the eye does.
    const id = window.setTimeout(() => {
      listRef.current
        ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
        ?.focus();
    }, 50);

    return () => {
      window.clearTimeout(id);
      // Next frame: picking an option pushes a new URL, and the re-render
      // that follows drops focus on <body> if it is restored synchronously.
      requestAnimationFrame(() => {
        if (back && document.contains(back)) back.focus();
      });
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  function onArrowKeys(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    const here = items.indexOf(document.activeElement as HTMLButtonElement);
    const step = e.key === "ArrowDown" ? 1 : -1;
    items[(here + step + items.length) % items.length]?.focus();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 bg-ink/35"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative flex max-h-[80dvh] w-full max-w-[480px] flex-col rounded-t-sheet bg-surface shadow-lg"
      >
        <div className="flex flex-col items-center pt-3">
          <span className="h-1 w-10 rounded-full bg-sand-deep" />
          <h2 className="mt-3 font-display text-title">{title}</h2>
        </div>

        <ul
          ref={listRef}
          role="listbox"
          aria-label={title}
          onKeyDown={onArrowKeys}
          className="mt-2 flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {options.map((o) => {
            const current = o.value === value;
            return (
              <li key={o.value} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={current}
                  onClick={() => {
                    onPick(o.value);
                    onClose();
                  }}
                  className={`flex min-h-[52px] w-full items-center justify-between gap-3 border-b border-sand-deep/60 text-start text-body ${
                    current ? "font-semibold text-rose" : "text-ink"
                  }`}
                >
                  {o.label}
                  {current ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-5 w-5 shrink-0"
                      aria-hidden
                    >
                      <path
                        d="m5 12.5 4.5 4.5L19 7.5"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

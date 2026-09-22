"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { IconSearch } from "./icons";

export type SelectOption = { value: string; label: string };

/**
 * Bottom-sheet replacement for a native <select>.
 *
 * A native dropdown is rendered by the OS, so it is the one control in the
 * back-office that ignores both the board's tokens and dark mode — a white
 * iOS wheel on a dark settings screen. It also cannot show 58 wilayas
 * without scrolling blind, hence the search field.
 */
export function SelectSheet({
  open,
  title,
  options,
  value,
  onPick,
  onClose,
  searchable = false,
}: {
  open: boolean;
  title: string;
  options: SelectOption[];
  value: string;
  onPick: (value: string) => void;
  onClose: () => void;
  searchable?: boolean;
}) {
  const t = useTranslations("common");
  const listRef = useRef<HTMLUListElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  /**
   * Focus and the remembered trigger, keyed on `open` alone: `onClose` is an
   * inline arrow in the parent, so depending on it would re-run this on
   * every render and overwrite the trigger with a row inside the sheet.
   */
  useEffect(() => {
    if (!open) return;
    setQuery("");
    const back = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => {
      if (searchable) inputRef.current?.focus();
      else
        listRef.current
          ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
          ?.focus();
    }, 50);
    return () => {
      window.clearTimeout(id);
      requestAnimationFrame(() => {
        if (back && document.contains(back)) back.focus();
      });
    };
  }, [open, searchable]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLocaleLowerCase().includes(q));
  }, [options, query]);

  // Kept mounted-free rather than hidden: an unmounted sheet cannot trap a
  // stray tab stop behind the overlay.
  if (!open) return null;

  function onArrowKeys(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = Array.from(
      listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [],
    );
    if (items.length === 0) return;
    const here = items.indexOf(document.activeElement as HTMLButtonElement);
    if (here === -1) {
      items[0].focus();
      return;
    }
    const step = e.key === "ArrowDown" ? 1 : -1;
    items[(here + step + items.length) % items.length]?.focus();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      {/* ink-deep, not ink: `--color-ink` flips to near-white in dark mode,
          which would turn the scrim into a white flash. */}
      <button
        type="button"
        aria-label={t("close")}
        onClick={onClose}
        className="absolute inset-0 bg-ink-deep/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={onArrowKeys}
        className="relative flex max-h-[80dvh] w-full max-w-[640px] flex-col rounded-t-sheet bg-surface shadow-lg"
      >
        <div className="flex flex-col items-center pt-3">
          <span className="h-1 w-10 rounded-full bg-sand-deep" />
          <h2 className="mt-3 font-display text-title">{title}</h2>
        </div>

        {searchable ? (
          <div className="px-4 py-3">
            <div className="flex h-11 items-center gap-2 rounded-full border border-sand-deep px-4">
              <IconSearch className="h-5 w-5 text-ink-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search")}
                aria-label={t("search")}
                className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ink-faint"
              />
            </div>
          </div>
        ) : null}

        <ul
          ref={listRef}
          role="listbox"
          aria-label={title}
          className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          {filtered.map((o) => {
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
          {filtered.length === 0 ? (
            <li className="py-8 text-center text-body text-ink-muted">
              {t("noMatch")}
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}

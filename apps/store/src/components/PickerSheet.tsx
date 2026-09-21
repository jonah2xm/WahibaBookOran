"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { IconSearch } from "./icons";

export type PickerOption = { id: number; label: string; sub?: string };

/**
 * Searchable bottom sheet for wilaya / commune (board S6).
 *
 * A native <select> is unusable for ~1 541 communes on a phone, which is why
 * the board draws a search sheet. Do not "simplify" this back to a dropdown.
 */
export function PickerSheet({
  open,
  title,
  options,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  options: PickerOption[];
  onPick: (option: PickerOption) => void;
  onClose: () => void;
}) {
  const t = useTranslations("checkout");
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
    };
  }, [open, onClose]);

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (!q) return options;
    return options.filter((o) => o.label.toLocaleLowerCase().includes(q));
  }, [options, query]);

  if (!open) return null;

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

        <div className="px-4 py-3">
          <div className="flex h-11 items-center gap-2 rounded-full border border-sand-deep px-4">
            <IconSearch className="h-5 w-5 text-ink-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("searchPlaceholder")}
              aria-label={t("searchPlaceholder")}
              className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-ink-faint"
            />
          </div>
        </div>

        <ul className="flex-1 overflow-y-auto px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {filtered.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(o);
                  onClose();
                }}
                className="flex min-h-[52px] w-full flex-col justify-center border-b border-sand-deep/60 text-start"
              >
                <span className="text-body">{o.label}</span>
                {o.sub ? (
                  <span className="text-caption text-ink-muted">{o.sub}</span>
                ) : null}
              </button>
            </li>
          ))}
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

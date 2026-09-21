"use client";

import { useTranslations } from "next-intl";
import { IconAlert } from "./icons";

/** Placeholder rows while a screen's data is in flight. */
export function Loading({ rows = 4 }: { rows?: number }) {
  const t = useTranslations("common");
  return (
    <div
      role="status"
      aria-label={t("loading")}
      className="flex flex-col gap-2 px-4 py-4"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-16 animate-pulse rounded-card bg-sand"
          // fades out down the list so it reads as "more below", not as
          // content that failed to arrive
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}

/**
 * A failed load, with the server's own message and a way to try again.
 * A dead end with no retry would mean closing and reopening the app.
 */
export function LoadFailed({
  message,
  onRetry,
}: {
  message?: string;
  onRetry: () => void;
}) {
  const t = useTranslations("common");
  return (
    <div
      role="alert"
      className="mx-4 my-6 flex flex-col items-start gap-3 rounded-card bg-danger/8 p-4"
    >
      <span className="flex gap-2 text-body text-danger">
        <IconAlert className="h-5 w-5 shrink-0" />
        {message ?? t("loadFailed")}
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="h-11 rounded-full border border-danger/40 px-5 text-caption font-semibold text-danger"
      >
        {t("retry")}
      </button>
    </div>
  );
}

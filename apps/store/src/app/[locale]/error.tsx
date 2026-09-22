"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

/** S10 — generic error. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");
  const tb = useTranslations("brand");

  useEffect(() => {
    // replaced by real error reporting before launch
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-danger/10">
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" aria-hidden>
          <path
            d="M12 7v6"
            stroke="var(--color-danger)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="12" cy="17" r="1.2" fill="var(--color-danger)" />
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="var(--color-danger)"
            strokeWidth="1.6"
          />
        </svg>
      </span>
      <h1 className="font-display text-title">{t("errorTitle")}</h1>
      <p className="text-body text-ink-muted">
        {t("errorBody", { phone: tb("phone") })}
      </p>
      <div className="mt-2 flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={reset}
          className="h-11 rounded-full bg-rose text-body font-semibold text-paper"
        >
          {t("retry")}
        </button>
        <a
          href={`tel:${tb("phone").replace(/\s/g, "")}`}
          className="grid h-11 place-items-center rounded-full border border-sand-deep bg-surface text-body font-semibold text-ink"
        >
          {t("call")}
        </a>
      </div>
    </main>
  );
}

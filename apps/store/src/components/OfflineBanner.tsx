"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * S10 — offline state. Real behaviour, not a mock: it listens to the browser's
 * connectivity events. The cart genuinely survives, because it lives in
 * localStorage (see CartProvider).
 */
export function OfflineBanner() {
  const t = useTranslations("errors");
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-30 flex items-center gap-3 bg-warning/15 px-4 py-2.5"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0" fill="none" aria-hidden>
        <path
          d="M3 3l18 18M8.5 12.5a5 5 0 0 1 7 0M5 9.5a9.5 9.5 0 0 1 14 0"
          stroke="var(--color-warning)"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
        <circle cx="12" cy="17" r="1.2" fill="var(--color-warning)" />
      </svg>
      <div className="flex flex-col">
        <span className="text-caption font-semibold text-ink">
          {t("offlineTitle")}
        </span>
        <span className="text-caption text-ink-muted">{t("offlineBody")}</span>
      </div>
    </div>
  );
}

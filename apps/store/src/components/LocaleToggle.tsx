"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useTransition } from "react";

/** Board §S1 top bar — "FR | ع", the active one in ink, the other muted. */
export function LocaleToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  const labels: Record<string, string> = { fr: "FR", ar: "ع" };

  return (
    <div
      className="flex items-center gap-1 text-micro uppercase tracking-[0.06em]"
      role="group"
      aria-label="Langue"
    >
      {routing.locales.map((l, i) => (
        <span key={l} className="flex items-center gap-1">
          {i > 0 ? <span className="text-ink-faint">|</span> : null}
          <button
            type="button"
            disabled={isPending}
            onClick={() =>
              startTransition(() => {
                router.replace(
                  // @ts-expect-error -- pathname is a known route at runtime
                  { pathname, params },
                  { locale: l },
                );
              })
            }
            className={`grid h-11 min-w-[32px] place-items-center ${
              l === locale ? "font-semibold text-ink" : "text-ink-faint"
            }`}
            aria-pressed={l === locale}
          >
            {labels[l]}
          </button>
        </span>
      ))}
    </div>
  );
}

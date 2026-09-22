import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** S10 — 404. */
export default async function NotFound() {
  const t = await getTranslations("errors");

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-3 px-8 text-center">
      <span className="lat font-display text-[64px] leading-none text-rose-300">
        {t("notFoundCode")}
      </span>
      <h1 className="font-display text-title">{t("notFoundTitle")}</h1>
      <p className="text-body text-ink-muted">{t("notFoundBody")}</p>
      <Link
        href="/"
        className="mt-2 grid h-11 place-items-center rounded-full bg-rose px-6 text-body font-semibold text-paper"
      >
        {t("home")}
      </Link>
    </main>
  );
}

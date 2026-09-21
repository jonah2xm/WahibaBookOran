import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconChevron } from "@/components/icons";
import { getAgreement } from "@/lib/catalogue";
import { pick } from "@/lib/types";

/** S9 — Conditions. One template for CGV, retours and confidentialité. */
export default async function ConditionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const agreementSections = await getAgreement();

  const t = await getTranslations("legal");
  const tn = await getTranslations("nav");

  return (
    <main className="flex flex-col pb-10">
      <header className="flex items-center gap-1 px-2 py-2">
        <Link
          href="/"
          aria-label={tn("back")}
          className="grid h-11 w-11 place-items-center text-ink"
        >
          <span className="rotate-180 rtl:rotate-0">
            <IconChevron className="h-5 w-5" />
          </span>
        </Link>
        <h1 className="font-display text-title">{t("title")}</h1>
      </header>

      {/* table of contents — the board's "Sommaire" */}
      <nav className="mx-4 rounded-card bg-sand p-4">
        <h2 className="text-micro uppercase tracking-[0.06em] text-ink-muted">
          {t("toc")}
        </h2>
        <ol className="mt-2 flex flex-col gap-1.5">
          {agreementSections.map((s, n) => (
            <li key={s.key}>
              <a href={`#${s.key}`} className="text-body text-ink underline">
                {n + 1}. {pick(s.title, locale)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-6 flex flex-col gap-7 px-4">
        {agreementSections.map((s, n) => (
          <section key={s.key} id={s.key} className="scroll-mt-4">
            {/* numbered from the array, never from the title: the admin can
                reorder sections and a number typed into the text would lie */}
            <h2 className="font-display text-body-lg font-semibold">
              {n + 1}. {pick(s.title, locale)}
            </h2>
            <ul className="mt-2 flex list-disc flex-col gap-2 ps-5 text-body text-ink-muted marker:text-rose-300">
              {s.points.map((p, i) => (
                <li key={i}>{pick(p, locale)}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

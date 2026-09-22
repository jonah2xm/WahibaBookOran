import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { IconChevron } from "@/components/icons";
import { getAgreement } from "@/lib/catalogue";
import { pick } from "@/lib/types";

/**
 * Re-render at most once a minute.
 *
 * Without this Next prerenders the page at build time and Vercel serves that
 * snapshot forever: adding a book in the admin changes nothing on the shop
 * until the next deploy. The catalogue and the conditions are both editable,
 * so neither can be frozen at build time.
 *
 * 60s rather than fully dynamic: a bookshop's catalogue changes a few times a
 * week, and a static page is much faster on a mobile connection.
 */
export const revalidate = 60;

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
    <main className="flex flex-col pb-[26px]">
      <header className="flex items-center gap-3.5 border-b border-ink px-[22px] pb-3.5 pt-5">
        <Link
          href="/"
          aria-label={tn("back")}
          className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full border border-ink text-ink hover:bg-sand"
        >
          <span className="rotate-180 rtl:rotate-0">
            <IconChevron className="h-[15px] w-[15px]" />
          </span>
        </Link>
        <h1 className="font-display text-[26px] font-semibold tracking-[-0.02em]">
          {t("title")}
        </h1>
      </header>

      {/* table of contents — the board's "Sommaire", capped by the tricolour
          rule it gives every sand block */}
      <nav className="relative mx-[22px] mt-5 overflow-hidden bg-sand px-5 py-[18px]">
        <span className="rule-tricolour absolute inset-x-0 top-0 h-[3px]" />
        <h2 className="mb-3 text-[9.5px] uppercase tracking-[0.2em] text-ink-muted">
          {t("toc")}
        </h2>
        <ol className="flex flex-col">
          {agreementSections.map((s, n) => (
            <li key={s.key}>
              <a
                href={`#${s.key}`}
                className="block py-[5px] text-body text-rose hover:text-rose-deep"
              >
                {n + 1}. {pick(s.title, locale)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col px-[22px] pt-6">
        {agreementSections.map((s, n) => (
          <section key={s.key} id={s.key} className="scroll-mt-4 pb-[22px]">
            {/* numbered from the array, never from the title: the admin can
                reorder sections and a number typed into the text would lie */}
            <h2 className="mb-2.5 border-b border-ink pb-1.5 font-display text-[20px] tracking-[-0.01em]">
              {n + 1}. {pick(s.title, locale)}
            </h2>
            <ul className="flex flex-col">
              {s.points.map((p, i) => (
                /* A gold dot, not a list marker: the board sets the bullet
                   as its own 4px mark so it lines up with the text's cap
                   height rather than the font's baseline. */
                <li key={i} className="flex gap-2.5 py-[7px]">
                  <span className="mt-[9px] h-1 w-1 shrink-0 rounded-full bg-gold" />
                  <span className="text-[14.5px] leading-[1.5] text-body text-pretty">
                    {pick(p, locale)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

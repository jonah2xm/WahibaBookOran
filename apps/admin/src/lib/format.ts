/**
 * Money is stored as integer centimes of DZD everywhere in this codebase.
 * It is only ever turned into a string here.
 *
 * Board convention (BookOran31.dc.html): "1 350 DA" — no-break space as the
 * thousands separator, unit after the number, Western digits in both locales.
 * Never "DZD 1350.00".
 *
 * U+00A0 and not the typographically-correct U+202F: the narrow no-break
 * space has no glyph in Plus Jakarta Sans and collapses to nothing, which
 * renders as "1350DA".
 */
const NBSP = " ";

/* Left-to-right isolate. Without it, an amount interpolated into an Arabic
   sentence is reordered by the bidi algorithm and renders "DA 5 000" instead
   of "5 000 DA". Components that already sit in a `.lat` span isolate too;
   doubling up is harmless, and this way every call site is safe. */
const LRI = "⁦";
const PDI = "⁩";

export function formatDzd(centimes: number): string {
  const dinars = Math.round(centimes / 100);
  const grouped = String(Math.abs(dinars)).replace(
    /\B(?=(\d{3})+(?!\d))/g,
    NBSP,
  );
  return `${LRI}${dinars < 0 ? "-" : ""}${grouped}${NBSP}DA${PDI}`;
}

/** 0555312408 -> "0555 31 24 08" */
export function formatPhone(raw: string): string {
  const d = raw.replace(/\D/g, "");
  if (d.length !== 10) return raw;
  return `${d.slice(0, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)} ${d.slice(8, 10)}`;
}

import { routing } from "@/i18n/routing";

/**
 * The shop's public origin, in one place.
 *
 * Metadata, the sitemap and robots.txt all need absolute URLs, and a wrong
 * one is the kind of mistake that only shows up weeks later in a search
 * result pointing at localhost. Set NEXT_PUBLIC_SITE_URL on the host; the
 * fallback is the dev port, which is correct locally and obviously wrong
 * anywhere else.
 *
 * Public by design — it is the address visitors type. Nothing secret goes
 * near a NEXT_PUBLIC_ prefix.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3110"
).replace(/\/+$/, "");

export function absolute(path: string) {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/**
 * Every locale's URL for one page, for `alternates.languages`.
 *
 * Both languages are the same catalogue, so without this a search engine
 * treats /fr/livre/x and /ar/livre/x as rival duplicates instead of two
 * versions of one page.
 */
export function localeAlternates(pathWithoutLocale: string) {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absolute(`/${locale}${pathWithoutLocale}`);
  }
  return languages;
}

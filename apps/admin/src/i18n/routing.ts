import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["fr", "ar"],
  defaultLocale: "fr",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

/** Arabic is the only RTL locale we ship. */
export function dirFor(locale: string) {
  return locale === "ar" ? "rtl" : "ltr";
}

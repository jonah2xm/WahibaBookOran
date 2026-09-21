/**
 * Root layout — a pass-through.
 *
 * Every real page lives under `[locale]`, and that layout renders <html> with
 * the right `lang` and `dir`. This one cannot render them too, or the two
 * would nest. But Next still requires a root layout to exist for anything at
 * the top of `app/`: `not-found.tsx`, `sitemap.ts`, `robots.ts`.
 *
 * Without it those files fail to compile with "doesn't have a root layout",
 * which is why the root not-found never ran.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

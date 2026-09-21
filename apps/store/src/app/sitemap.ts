import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getBooks } from "@/lib/catalogue";
import { absolute } from "@/lib/site";

/**
 * /sitemap.xml — built from the database, not a list kept by hand.
 *
 * The catalogue is editable in the admin, so any hardcoded list would start
 * lying the first time a book is added. Only active books are listed:
 * getBooks() already filters them, and advertising a hidden book would send
 * visitors to a 404.
 *
 * Checkout, cart, tracking and the confirmation page are deliberately absent.
 * They are personal, they change per visit, and there is nothing to index.
 *
 * /categorie/<slug> is absent too: those routes only redirect to the filtered
 * list, and a sitemap full of redirects wastes the crawl on pages that are
 * not pages.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const books = await getBooks();

  const paths = [
    { path: "", priority: 1 },
    { path: "/livres", priority: 0.8 },
    { path: "/conditions", priority: 0.3 },
    ...books.map((b) => ({ path: `/livre/${b.slug}`, priority: 0.7 })),
  ];

  // One entry per locale per page, each pointing at its siblings, so the two
  // languages are read as translations rather than duplicates.
  return paths.flatMap(({ path, priority }) =>
    routing.locales.map((locale) => ({
      url: absolute(`/${locale}${path}`),
      lastModified: new Date(),
      priority,
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((l) => [l, absolute(`/${l}${path}`)]),
        ),
      },
    })),
  );
}

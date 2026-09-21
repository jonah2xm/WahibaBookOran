import { Suspense } from "react";
import { setRequestLocale } from "next-intl/server";
import { BooksBrowser } from "@/components/BooksBrowser";
import { getBooks, getCategories } from "@/lib/catalogue";

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

/**
 * "Tous les livres" — one listing screen for the whole catalogue, with search,
 * category and price filters, and sorting. Replaces the former /categories and
 * /recherche pages.
 *
 * The Suspense boundary is required: BooksBrowser reads useSearchParams, and
 * without it Next cannot prerender this route.
 */
export default async function BooksPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // Fetched on the server: the whole catalogue arrives with the HTML, so the
  // list is filterable the moment it paints and is visible to crawlers.
  const [books, categories] = await Promise.all([getBooks(), getCategories()]);

  return (
    <main className="flex flex-col">
      <Suspense fallback={<BooksSkeleton />}>
        <BooksBrowser books={books} categories={categories} />
      </Suspense>
    </main>
  );
}

function BooksSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4 pt-4">
      <div className="h-7 w-40 rounded-full bg-sand" />
      <div className="h-11 w-full rounded-full bg-sand" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="shimmer aspect-[2/3] w-full rounded-cover" />
            <div className="h-3 w-4/5 rounded-full bg-sand" />
            <div className="h-3 w-1/2 rounded-full bg-sand" />
          </div>
        ))}
      </div>
    </div>
  );
}

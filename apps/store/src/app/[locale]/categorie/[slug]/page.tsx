import { redirect } from "next/navigation";
import { getCategories } from "@/lib/catalogue";

// No generateStaticParams: categories are editable, so the set of these
// redirects changes without a rebuild.

/**
 * The per-category screens were folded into /livres. This keeps the old URLs
 * working — anything already shared or linked lands on the same list, filtered.
 */
export default async function CategoryRedirect({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const categories = await getCategories();
  const known = categories.some((c) => c.slug === slug);
  redirect(known ? `/${locale}/livres?categorie=${slug}` : `/${locale}/livres`);
}

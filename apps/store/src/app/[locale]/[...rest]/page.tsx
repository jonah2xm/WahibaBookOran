import { notFound } from "next/navigation";

/**
 * Without this catch-all, an unmatched path under /fr or /ar falls through to
 * Next's built-in 404 page and never reaches `[locale]/not-found.tsx` — so the
 * customer gets an unstyled English "This page could not be found."
 */
export default function CatchAllPage() {
  notFound();
}

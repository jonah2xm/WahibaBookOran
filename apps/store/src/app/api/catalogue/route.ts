import { NextResponse } from "next/server";
import { getBooks, getCategories, getShopSettings } from "@/lib/catalogue";

/**
 * GET /api/catalogue — the catalogue for client components.
 *
 * The cart lives in localStorage as slugs and quantities; it needs titles,
 * prices and stock to render, and it runs in the browser. Server components
 * read lib/catalogue.ts directly instead of calling this.
 *
 * Public on purpose: it is the shop window. It carries no costs, no customer
 * data and no settings beyond what the cart already displays.
 */
export const revalidate = 60;

export async function GET() {
  const [books, categories, settings] = await Promise.all([
    getBooks(),
    getCategories(),
    getShopSettings(),
  ]);

  return NextResponse.json({
    books,
    categories,
    settings: {
      freeShippingThresholdDzd: settings.freeShippingThresholdDzd,
      stopdeskByDefault: settings.stopdeskByDefault,
      phone: settings.phone,
      storeName: settings.storeName,
    },
  });
}

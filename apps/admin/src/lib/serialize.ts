import type { BookDoc, CategoryDoc, OrderDoc } from "@bookoran/db";
import type { Book, Category } from "./types";

/**
 * Mongo documents → the shapes the screens already use.
 *
 * The UI was built against seed files, and those shapes are good ones. Rather
 * than rewrite every screen, the API speaks the same language: category slugs
 * instead of ObjectIds, `isNew` instead of the database's `isNewArrival`.
 * That keeps this translation in one file where it can be seen.
 */

type Lean<T> = T & { _id: unknown };

export function toCategory(doc: Lean<CategoryDoc>): Category {
  return {
    slug: doc.slug,
    name: { fr: doc.name.fr, ar: doc.name.ar ?? undefined },
    sortOrder: doc.sortOrder ?? 0,
  };
}

export function toBook(
  doc: Lean<BookDoc>,
  slugByCategoryId: Map<string, string>,
): Book {
  return {
    slug: doc.slug,
    title: { fr: doc.title.fr, ar: doc.title.ar ?? undefined },
    author: { fr: doc.author.fr, ar: doc.author.ar ?? undefined },
    summary: doc.summary?.fr
      ? { fr: doc.summary.fr, ar: doc.summary.ar ?? undefined }
      : undefined,
    categorySlugs: (doc.categoryIds ?? [])
      .map((id) => slugByCategoryId.get(String(id)))
      .filter((s): s is string => Boolean(s)),
    priceDzd: doc.priceDzd,
    compareAtPriceDzd: doc.compareAtPriceDzd ?? null,
    coverUrl: doc.coverUrl ?? null,
    coverTint: doc.coverTint ?? 0,
    stockOnHand: doc.stockOnHand ?? 0,
    lowStockThreshold: doc.lowStockThreshold ?? 3,
    weightGrams: doc.weightGrams,
    isbn: doc.isbn ?? undefined,
    publisher: doc.publisher ?? undefined,
    pageCount: doc.pageCount ?? undefined,
    bookLanguage: (doc.bookLanguage as "fr" | "ar") ?? "fr",
    isNew: doc.isNewArrival ?? false,
    isBestSeller: doc.isBestSeller ?? false,
  };
}

export type OrderDto = {
  orderNumber: string;
  status: string;
  customer: { fullName: string; phone: string };
  delivery: {
    wilaya: string;
    commune: string;
    method: "home" | "stopdesk";
    note?: string;
  };
  items: { title: string; quantity: number; price: number }[];
  deliveryFee: number;
  subtotal: number;
  expected: number;
  yalidine?: { tracking: string; createdAt: string };
  timeline: { key: string; at: string }[];
  createdAt: string;
};

export function toOrder(doc: Lean<OrderDoc>): OrderDto {
  const totals = doc.totals;
  return {
    orderNumber: doc.orderNumber,
    status: doc.status ?? "pending",
    customer: {
      fullName: doc.customer.fullName,
      phone: doc.customer.phone,
    },
    delivery: {
      wilaya: doc.delivery.wilayaName,
      commune: doc.delivery.communeName,
      method: doc.delivery.method as "home" | "stopdesk",
      note: doc.notes ?? undefined,
    },
    items: doc.items.map((i) => ({
      title: i.titleSnapshot,
      quantity: i.quantity,
      price: i.priceSnapshot,
    })),
    deliveryFee: totals.deliveryFee,
    subtotal: totals.subtotal,
    // What the driver collects. Recomputed from the stored parts rather than
    // trusted from a field, so a bad grandTotal cannot reach the screen.
    expected: totals.subtotal + totals.deliveryFee - (totals.discount ?? 0),
    yalidine: doc.yalidine?.tracking
      ? {
          tracking: doc.yalidine.tracking,
          createdAt: (doc.yalidine.lastSyncedAt ?? doc.createdAt).toISOString(),
        }
      : undefined,
    timeline: (doc.statusHistory ?? []).map((s) => ({
      key: s.status,
      at: (s.at ?? doc.createdAt).toISOString(),
    })),
    createdAt: doc.createdAt.toISOString(),
  };
}

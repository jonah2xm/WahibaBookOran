import "server-only";
import {
  AgreementSection,
  Book as BookModel,
  Category as CategoryModel,
  connectDb,
  getSettings,
  type BookDoc,
  type CategoryDoc,
} from "@bookoran/db";
import type { Bilingual, Book, Category } from "./types";

/**
 * The storefront's read side.
 *
 * The shapes returned here are the ones the
 * components were already written against — category slugs rather than
 * ObjectIds, `isNew` rather than the database's `isNewArrival` — so the
 * translation stays in this one file.
 *
 * Only ACTIVE books and categories are ever returned. A book the owner
 * switched off should not be reachable by guessing its URL.
 */

type Lean<T> = T & { _id: unknown };

function bilingual(v: { fr: string; ar?: string | null }): Bilingual {
  return { fr: v.fr, ar: v.ar ?? undefined };
}

function toCategory(doc: Lean<CategoryDoc>): Category {
  return {
    slug: doc.slug,
    name: bilingual(doc.name),
    sortOrder: doc.sortOrder ?? 0,
  };
}

function toBook(doc: Lean<BookDoc>, slugById: Map<string, string>): Book {
  return {
    slug: doc.slug,
    title: bilingual(doc.title),
    author: bilingual(doc.author),
    summary: doc.summary?.fr ? bilingual(doc.summary) : undefined,
    categorySlugs: (doc.categoryIds ?? [])
      .map((id) => slugById.get(String(id)))
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

async function slugById() {
  const categories = await CategoryModel.find().select("slug").lean();
  return new Map(categories.map((c) => [String(c._id), c.slug]));
}

export async function getCategories(): Promise<Category[]> {
  await connectDb();
  const docs = await CategoryModel.find({ isActive: true })
    .sort({ sortOrder: 1 })
    .lean();
  return docs.map(toCategory);
}

export async function getBooks(): Promise<Book[]> {
  await connectDb();
  const [map, docs] = await Promise.all([
    slugById(),
    BookModel.find({ isActive: true }).sort({ createdAt: -1 }).lean(),
  ]);
  return docs.map((d) => toBook(d, map));
}

export async function getBook(slug: string): Promise<Book | null> {
  await connectDb();
  const [map, doc] = await Promise.all([
    slugById(),
    BookModel.findOne({ slug, isActive: true }).lean(),
  ]);
  return doc ? toBook(doc, map) : null;
}

/** The "Du même auteur" rail on the book page. */
export async function getSameAuthor(book: Book, limit = 6): Promise<Book[]> {
  await connectDb();
  const [map, docs] = await Promise.all([
    slugById(),
    BookModel.find({
      isActive: true,
      "author.fr": book.author.fr,
      slug: { $ne: book.slug },
    })
      .limit(limit)
      .lean(),
  ]);
  return docs.map((d) => toBook(d, map));
}

/** Home rails. Both fall back to newest when the owner has flagged nothing. */
export async function getHomeRails() {
  await connectDb();
  const map = await slugById();

  const [newArrivals, bestSellers, newest] = await Promise.all([
    BookModel.find({ isActive: true, isNewArrival: true })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    BookModel.find({ isActive: true, isBestSeller: true }).limit(10).lean(),
    BookModel.find({ isActive: true }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);

  const fallback = newest.map((d) => toBook(d, map));
  return {
    newArrivals: newArrivals.length
      ? newArrivals.map((d) => toBook(d, map))
      : fallback,
    bestSellers: bestSellers.length
      ? bestSellers.map((d) => toBook(d, map))
      : fallback,
  };
}

/**
 * Shop settings. These decide what the customer is charged, so the quote
 * route and the cart both read them from here rather than from constants.
 */
export async function getShopSettings() {
  await connectDb();
  const s = await getSettings();
  return {
    storeName: s.storeName,
    phone: s.phone,
    originWilayaId: s.originWilayaId,
    freeShippingThresholdDzd: s.freeShippingThresholdDzd,
    overweightRateDzd: s.overweightRateDzd,
    freeKg: s.freeKg,
    stopdeskByDefault: s.stopdeskByDefault ?? false,
  };
}

export type ShopSettings = Awaited<ReturnType<typeof getShopSettings>>;

/** Conditions de vente, in the order the admin arranged them. */
export async function getAgreement() {
  await connectDb();
  const docs = await AgreementSection.find({ isActive: true })
    .sort({ sortOrder: 1 })
    .lean();

  return docs.map((s) => ({
    key: s.key,
    title: bilingual(s.title),
    points: s.points.map(bilingual),
  }));
}

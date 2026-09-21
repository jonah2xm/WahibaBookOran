import { Book, Category } from "@bookoran/db";
import { NextResponse } from "next/server";
import { ApiError, body, route } from "@/lib/api";
import { bookCreateSchema } from "@/lib/schemas";
import { toBook, toCategory } from "@/lib/serialize";

/** Category ids are stored; the screens speak slugs. Built per request. */
async function categoryMaps() {
  const categories = await Category.find().sort({ sortOrder: 1 }).lean();
  return {
    categories,
    slugById: new Map(categories.map((c) => [String(c._id), c.slug])),
    idBySlug: new Map(categories.map((c) => [c.slug, String(c._id)])),
  };
}

/** GET /api/books — the whole catalogue plus the categories it references. */
export const GET = route(async () => {
  const { categories, slugById } = await categoryMaps();
  const books = await Book.find().sort({ createdAt: -1 }).lean();

  return NextResponse.json({
    items: books.map((b) => toBook(b, slugById)),
    categories: categories.map(toCategory),
  });
});

/** POST /api/books — create. Stock is not accepted here: it comes from the
 *  ledger, so a new book starts at zero and is stocked by a movement. */
export const POST = route(async ({ req }) => {
  const input = await body(req, bookCreateSchema);
  const { slugById, idBySlug } = await categoryMaps();

  const categoryIds = input.categorySlugs.map((slug) => {
    const id = idBySlug.get(slug);
    if (!id) {
      throw new ApiError(422, "unknown_category", `Catégorie inconnue : ${slug}.`);
    }
    return id;
  });

  const created = await Book.create({
    ...input,
    categoryIds,
    stockOnHand: 0,
    stockReserved: 0,
    isNewArrival: true,
    isActive: true,
  });

  return NextResponse.json(toBook(created.toObject(), slugById), {
    status: 201,
  });
});

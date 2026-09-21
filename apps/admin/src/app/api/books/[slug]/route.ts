import { Book, Category } from "@bookoran/db";
import { NextResponse } from "next/server";
import { ApiError, body, notFound, route } from "@/lib/api";
import { bookPatchSchema } from "@/lib/schemas";
import { toBook } from "@/lib/serialize";

type Params = { slug: string };

async function categoryMaps() {
  const categories = await Category.find().lean();
  return {
    slugById: new Map(categories.map((c) => [String(c._id), c.slug])),
    idBySlug: new Map(categories.map((c) => [c.slug, String(c._id)])),
  };
}

/** GET /api/books/<slug> */
export const GET = route<Params>(async ({ params }) => {
  const { slugById } = await categoryMaps();
  const book = await Book.findOne({ slug: params.slug }).lean();
  if (!book) notFound("Livre");
  return NextResponse.json(toBook(book, slugById));
});

/**
 * PATCH /api/books/<slug>
 *
 * `stockOnHand` is deliberately not accepted. Stock changes through
 * /api/stock/<slug>/movements so that every count has a movement explaining
 * it — letting the editor set it directly would put the book and its own
 * ledger permanently out of step.
 */
export const PATCH = route<Params>(async ({ req, params }) => {
  const patch = await body(req, bookPatchSchema);
  const { slugById, idBySlug } = await categoryMaps();

  const update: Record<string, unknown> = {};

  if (patch.title) update.title = patch.title;
  if (patch.author) update.author = patch.author;
  if (patch.summary !== undefined) {
    update.summary = patch.summary?.fr ? patch.summary : undefined;
  }
  if (patch.categorySlugs) {
    update.categoryIds = patch.categorySlugs.map((slug) => {
      const id = idBySlug.get(slug);
      if (!id) {
        throw new ApiError(
          422,
          "unknown_category",
          `Catégorie inconnue : ${slug}.`,
        );
      }
      return id;
    });
  }
  if (patch.coverUrl !== undefined) update.coverUrl = patch.coverUrl;
  if (patch.priceDzd !== undefined) update.priceDzd = patch.priceDzd;
  if (patch.compareAtPriceDzd !== undefined) {
    update.compareAtPriceDzd = patch.compareAtPriceDzd;
  }
  if (patch.weightGrams !== undefined) update.weightGrams = patch.weightGrams;
  if (patch.lowStockThreshold !== undefined) {
    update.lowStockThreshold = patch.lowStockThreshold;
  }
  if (patch.isbn !== undefined) update.isbn = patch.isbn;
  if (patch.publisher !== undefined) update.publisher = patch.publisher;
  if (patch.pageCount !== undefined) update.pageCount = patch.pageCount;
  if (patch.bookLanguage) update.bookLanguage = patch.bookLanguage;
  if (patch.isNew !== undefined) update.isNewArrival = patch.isNew;
  if (patch.isBestSeller !== undefined) update.isBestSeller = patch.isBestSeller;
  if (patch.isActive !== undefined) update.isActive = patch.isActive;

  const book = await Book.findOneAndUpdate(
    { slug: params.slug },
    { $set: update },
    // runValidators so an integer price and a positive weight are enforced on
    // an update, not only on create — findOneAndUpdate skips them otherwise.
    { new: true, runValidators: true, context: "query" },
  ).lean();

  if (!book) notFound("Livre");
  return NextResponse.json(toBook(book, slugById));
});

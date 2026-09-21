import { Book, Category } from "@bookoran/db";
import { NextResponse } from "next/server";
import { ApiError, body, route } from "@/lib/api";
import { categoryCreateSchema } from "@/lib/schemas";
import { toCategory } from "@/lib/serialize";

/**
 * GET /api/categories — every category, active or not, with a book count.
 *
 * The count is what makes deletion honest: a category holding eleven books
 * should not disappear behind a confirm dialog without saying so.
 */
export const GET = route(async () => {
  const categories = await Category.find().sort({ sortOrder: 1 }).lean();

  // One grouped count rather than a query per category.
  const counts = await Book.aggregate<{ _id: unknown; n: number }>([
    { $unwind: "$categoryIds" },
    { $group: { _id: "$categoryIds", n: { $sum: 1 } } },
  ]);
  const byId = new Map(counts.map((c) => [String(c._id), c.n]));

  return NextResponse.json({
    items: categories.map((c) => ({
      ...toCategory(c),
      bookCount: byId.get(String(c._id)) ?? 0,
    })),
  });
});

/** POST /api/categories — owner only, like everything that shapes the shop. */
export const POST = route(
  async ({ req }) => {
    const input = await body(req, categoryCreateSchema);

    const clash = await Category.findOne({ slug: input.slug })
      .select("_id")
      .lean();
    if (clash) {
      throw new ApiError(
        409,
        "slug_taken",
        `Une catégorie utilise déjà « ${input.slug} ».`,
        { slug: "Ce slug est déjà pris." },
      );
    }

    // Appended rather than dropped at position zero: a new category should
    // not silently jump ahead of the ones already ordered.
    const last = await Category.findOne().sort({ sortOrder: -1 }).lean();
    const created = await Category.create({
      ...input,
      sortOrder: input.sortOrder ?? (last?.sortOrder ?? 0) + 1,
      isActive: input.isActive ?? true,
    });

    return NextResponse.json(
      { ...toCategory(created.toObject()), bookCount: 0 },
      { status: 201 },
    );
  },
  { owner: true },
);

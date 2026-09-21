import { Book, Category } from "@bookoran/db";
import { NextResponse } from "next/server";
import { ApiError, body, notFound, route } from "@/lib/api";
import { categoryPatchSchema } from "@/lib/schemas";
import { toCategory } from "@/lib/serialize";

type Params = { slug: string };

/** PATCH /api/categories/<slug> — rename, reorder, show or hide. */
export const PATCH = route<Params>(
  async ({ req, params }) => {
    const patch = await body(req, categoryPatchSchema);

    const category = await Category.findOneAndUpdate(
      { slug: params.slug },
      { $set: patch },
      { new: true, runValidators: true, context: "query" },
    ).lean();

    if (!category) notFound("Catégorie");
    return NextResponse.json(toCategory(category));
  },
  { owner: true },
);

/**
 * DELETE /api/categories/<slug>
 *
 * Refuses while books still point at it. Deleting anyway would leave those
 * books holding an id that resolves to nothing: they would vanish from the
 * category pages while still looking fine in the editor, which is the kind
 * of half-broken state nobody goes looking for.
 *
 * Hiding (`isActive: false`) takes a category out of the shop without
 * touching the books, and is what you usually want.
 */
export const DELETE = route<Params>(
  async ({ params }) => {
    const category = await Category.findOne({ slug: params.slug })
      .select("_id")
      .lean();
    if (!category) notFound("Catégorie");

    const books = await Book.countDocuments({ categoryIds: category._id });
    if (books > 0) {
      throw new ApiError(
        409,
        "category_in_use",
        books === 1
          ? "1 livre est encore classé ici. Reclassez-le, ou masquez la catégorie."
          : `${books} livres sont encore classés ici. Reclassez-les, ou masquez la catégorie.`,
      );
    }

    await Category.deleteOne({ _id: category._id });
    return NextResponse.json({ deleted: params.slug });
  },
  { owner: true },
);

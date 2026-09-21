import { Book, recordMovement, type MovementType } from "@bookoran/db";
import { NextResponse } from "next/server";
import { ApiError, body, notFound, route } from "@/lib/api";
import { movementSchema } from "@/lib/schemas";

type Params = { slug: string };

/**
 * POST /api/stock/<slug>/movements — record an adjustment.
 *
 * Goes through recordMovement(), which writes the ledger entry and moves the
 * cached count together and refuses to take stock below zero. Nothing here
 * touches `books.stockOnHand` directly.
 */
export const POST = route<Params>(async ({ req, params, session }) => {
  const input = await body(req, movementSchema);

  const book = await Book.findOne({ slug: params.slug }).select("_id").lean();
  if (!book) notFound("Livre");

  try {
    const { movement, stockOnHand } = await recordMovement({
      bookId: book._id,
      type: input.type as MovementType,
      quantity: input.quantity,
      reason: input.reason,
      createdBy: session.id,
    });

    return NextResponse.json(
      {
        stockOnHand,
        movement: {
          id: String(movement._id),
          kind: movement.type,
          delta: movement.quantity,
          reason: movement.reason ?? undefined,
          at: movement.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    // "Stock would go to -4" is the one message the manager actually needs;
    // a 500 would hide it.
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Stock would go to")) {
      throw new ApiError(
        409,
        "below_zero",
        "Le stock ne peut pas passer sous zéro.",
      );
    }
    throw error;
  }
});

import { Types } from "mongoose";
import { Book } from "./models/Book";
import { StockMovement, type MovementType } from "./models/StockMovement";

/**
 * The only supported way to change stock.
 *
 * `books.stockOnHand` is a cache of the ledger. Writing it directly makes the
 * two disagree with no way to tell which is right, so every caller — admin
 * adjustment, order confirmation, return — comes through here.
 *
 * The movement is written FIRST, then the cached count is incremented. If the
 * process dies between the two, the ledger holds a movement the cache has not
 * applied, and recomputeStockOnHand() puts it right. The other order would
 * leave a count nobody can explain, and reconciliation would silently revert
 * it — losing real stock instead of recovering it.
 */
export async function recordMovement(input: {
  bookId: Types.ObjectId | string;
  type: MovementType;
  /** signed, non-zero */
  quantity: number;
  reason?: string;
  orderId?: Types.ObjectId | string;
  createdBy?: Types.ObjectId | string;
}) {
  const book = await Book.findById(input.bookId).select("stockOnHand");
  if (!book) throw new Error(`Unknown book ${String(input.bookId)}`);

  const next = book.stockOnHand + input.quantity;
  // Negative stock would mean the shop sold copies it never had. Refuse it
  // here so the count stays a fact rather than a running guess.
  if (next < 0) {
    throw new Error(
      `Stock would go to ${next}: ${book.stockOnHand} on hand, movement ${input.quantity}.`,
    );
  }

  const movement = await StockMovement.create({
    bookId: input.bookId,
    type: input.type,
    quantity: input.quantity,
    reason: input.reason,
    orderId: input.orderId,
    createdBy: input.createdBy,
  });

  await Book.updateOne(
    { _id: input.bookId },
    { $inc: { stockOnHand: input.quantity } },
  );

  return { movement, stockOnHand: next };
}

/**
 * Recomputes one book's cached count from its own ledger.
 * Returns what changed, or null when the cache was already right.
 */
export async function recomputeStockOnHand(bookId: Types.ObjectId | string) {
  // aggregate() skips schema casting, so a string id would match nothing and
  // quietly report a total of 0 — which would then zero the book's stock.
  const id = new Types.ObjectId(String(bookId));
  const [sum] = await StockMovement.aggregate<{ total: number }>([
    { $match: { bookId: id } },
    { $group: { _id: null, total: { $sum: "$quantity" } } },
  ]);

  const total = sum?.total ?? 0;
  const book = await Book.findById(bookId).select("stockOnHand slug");
  if (!book) return null;
  if (book.stockOnHand === total) return null;

  const was = book.stockOnHand;
  await Book.updateOne({ _id: bookId }, { $set: { stockOnHand: total } });
  return { slug: book.slug, was, now: total };
}

/**
 * The nightly reconciliation from PROJECT_PLAN §4. Returns every book whose
 * cache had drifted, so the job can report rather than fix in silence — a
 * drift means something wrote stock outside recordMovement, and that is worth
 * knowing about.
 */
export async function reconcileAllStock() {
  const books = await Book.find().select("_id").lean();
  const drifted: { slug: string; was: number; now: number }[] = [];
  for (const b of books) {
    const changed = await recomputeStockOnHand(b._id);
    if (changed) drifted.push(changed);
  }
  return drifted;
}

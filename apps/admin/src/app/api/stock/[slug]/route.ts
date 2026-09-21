import { Book, Order, StockMovement } from "@bookoran/db";
import { NextResponse } from "next/server";
import { notFound, route } from "@/lib/api";

type Params = { slug: string };

/** GET /api/stock/<slug> — on hand, thresholds and the movement history. */
export const GET = route<Params>(async ({ params }) => {
  const book = await Book.findOne({ slug: params.slug })
    .select("slug title stockOnHand stockReserved lowStockThreshold")
    .lean();
  if (!book) notFound("Livre");

  const movements = await StockMovement.find({ bookId: book._id })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  // A movement from a sale or a return points at an order; the history shows
  // the human-readable number ("Vente — BO-2609-0143"), so resolve them in
  // one query rather than one per row.
  const orderIds = movements
    .map((m) => m.orderId)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));

  const numberByOrderId = new Map<string, string>();
  if (orderIds.length) {
    const orders = await Order.find({ _id: { $in: orderIds } })
      .select("orderNumber")
      .lean();
    for (const o of orders) {
      numberByOrderId.set(String(o._id), o.orderNumber);
    }
  }

  return NextResponse.json({
    slug: book.slug,
    title: { fr: book.title.fr, ar: book.title.ar ?? undefined },
    stockOnHand: book.stockOnHand ?? 0,
    stockReserved: book.stockReserved ?? 0,
    lowStockThreshold: book.lowStockThreshold ?? 3,
    movements: movements.map((m) => ({
      id: String(m._id),
      kind: m.type,
      delta: m.quantity,
      reason: m.reason ?? undefined,
      orderNumber: m.orderId
        ? numberByOrderId.get(String(m.orderId))
        : undefined,
      at: m.createdAt.toISOString(),
    })),
  });
});

import {
  Order,
  TransitionError,
  applyOrderStatus,
  type OrderStatus,
} from "@bookoran/db";
import { NextResponse } from "next/server";
import { ApiError, body, notFound, route } from "@/lib/api";
import { orderStatusSchema } from "@/lib/schemas";
import { toOrder } from "@/lib/serialize";

type Params = { orderNumber: string };

/** GET /api/orders/<orderNumber> */
export const GET = route<Params>(async ({ params }) => {
  const order = await Order.findOne({
    orderNumber: decodeURIComponent(params.orderNumber),
  }).lean();
  if (!order) notFound("Commande");
  return NextResponse.json(toOrder(order));
});

/**
 * PATCH /api/orders/<orderNumber> — move the order along the pipeline.
 *
 * The transition rules and their stock effects live in applyOrderStatus():
 * confirming reserves copies, shipping takes them out of stock, a return puts
 * them back. An illegal jump (delivered straight from pending, say) is
 * refused with the list of moves that are actually available.
 */
export const PATCH = route<Params>(async ({ req, params, session }) => {
  const input = await body(req, orderStatusSchema);

  try {
    const order = await applyOrderStatus({
      orderNumber: decodeURIComponent(params.orderNumber),
      to: input.status as OrderStatus,
      by: session.id,
      note: input.note,
    });

    if (!order) notFound("Commande");
    return NextResponse.json(toOrder(order.toObject()));
  } catch (error) {
    if (error instanceof TransitionError) {
      throw new ApiError(409, "illegal_transition", error.message);
    }
    // recordMovement refusing to take stock negative surfaces here when a
    // shipment would oversell. It is a real conflict, not a server fault.
    const message = error instanceof Error ? error.message : "";
    if (message.startsWith("Stock would go to")) {
      throw new ApiError(
        409,
        "below_zero",
        "Stock insuffisant pour expédier cette commande.",
      );
    }
    throw error;
  }
});

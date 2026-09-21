import type { Types } from "mongoose";
import { Book } from "./models/Book";
import { Order, type OrderStatus } from "./models/Order";
import { recordMovement } from "./stock";

/**
 * The order lifecycle from PROJECT_PLAN §5, and what each step does to stock.
 *
 * Stock moves twice, not once:
 *   confirmed  reserves copies (stockReserved) — they are spoken for but
 *              still on the shelf, so on-hand must not change yet
 *   shipped    the parcel leaves: the reservation is released and a
 *              `sale_out` movement takes the copies out of on-hand
 *   returned   a `return_in` movement puts them back
 *   cancelled  releases the reservation, if one was taken
 *
 * Doing it in one step at confirmation would show stock leaving the shop
 * before anything was packed, and a cancelled order would need a compensating
 * movement that never happened in the real world.
 */
const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["remitted"],
  remitted: [],
  returned: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus) {
  return ALLOWED[from]?.includes(to) ?? false;
}

export class TransitionError extends Error {
  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus,
  ) {
    super(
      ALLOWED[from]?.length
        ? `Une commande « ${from} » ne peut aller que vers : ${ALLOWED[from].join(", ")}.`
        : `Une commande « ${from} » est terminée et ne change plus.`,
    );
  }
}

/** True once the order has taken copies off the available pool. */
function holdsReservation(status: OrderStatus) {
  return status === "confirmed" || status === "packed";
}

export async function applyOrderStatus(input: {
  orderNumber: string;
  to: OrderStatus;
  by?: Types.ObjectId | string;
  note?: string;
}) {
  const order = await Order.findOne({ orderNumber: input.orderNumber });
  if (!order) return null;

  const from = order.status as OrderStatus;
  if (from === input.to) return order;
  if (!canTransition(from, input.to)) throw new TransitionError(from, input.to);

  if (input.to === "confirmed") {
    for (const item of order.items) {
      await Book.updateOne(
        { _id: item.bookId },
        { $inc: { stockReserved: item.quantity } },
      );
    }
  }

  if (input.to === "shipped") {
    for (const item of order.items) {
      await Book.updateOne(
        { _id: item.bookId },
        { $inc: { stockReserved: -item.quantity } },
      );
      await recordMovement({
        bookId: item.bookId,
        type: "sale_out",
        quantity: -item.quantity,
        orderId: order._id,
        createdBy: input.by,
      });
    }
  }

  if (input.to === "returned") {
    for (const item of order.items) {
      await recordMovement({
        bookId: item.bookId,
        type: "return_in",
        quantity: item.quantity,
        orderId: order._id,
        createdBy: input.by,
        reason: input.note?.trim() || "retour client",
      });
    }
  }

  if (input.to === "cancelled" && holdsReservation(from)) {
    for (const item of order.items) {
      await Book.updateOne(
        { _id: item.bookId },
        { $inc: { stockReserved: -item.quantity } },
      );
    }
  }

  if (input.to === "delivered") {
    order.payment.collected = true;
    order.payment.collectedAt = new Date();
  }

  if (input.to === "remitted") {
    order.payment.remittedAt = new Date();
  }

  order.status = input.to;
  order.statusHistory.push({
    status: input.to,
    at: new Date(),
    by: input.by as Types.ObjectId | undefined,
    note: input.note,
  });

  await order.save();
  return order;
}

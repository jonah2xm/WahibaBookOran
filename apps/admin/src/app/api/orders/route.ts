import { ORDER_STATUSES, Order, type OrderStatus } from "@bookoran/db";
import { NextResponse } from "next/server";
import { route } from "@/lib/api";
import { toOrder } from "@/lib/serialize";

/**
 * GET /api/orders?status=pending&limit=50
 *
 * Returns one pipeline column plus the counts for every column, so the tab
 * badges are right without a second request.
 */
export const GET = route(async ({ req }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 200);

  const filter: Record<string, unknown> = {};
  // An unknown status would silently return every order, which reads as "the
  // filter is broken" on screen. Ignore it and say so in the response.
  const valid = status && (ORDER_STATUSES as readonly string[]).includes(status);
  if (valid) filter.status = status;

  const [orders, counts] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).limit(limit).lean(),
    Order.aggregate<{ _id: OrderStatus; n: number }>([
      { $group: { _id: "$status", n: { $sum: 1 } } },
    ]),
  ]);

  const byStatus = Object.fromEntries(
    ORDER_STATUSES.map((s) => [s, 0]),
  ) as Record<OrderStatus, number>;
  for (const row of counts) byStatus[row._id] = row.n;

  return NextResponse.json({
    items: orders.map(toOrder),
    counts: byStatus,
    ...(status && !valid ? { ignoredStatus: status } : {}),
  });
});

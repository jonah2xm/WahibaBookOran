import "server-only";
import { Book, Order, connectDb } from "@bookoran/db";
import { toOrder, type OrderDto } from "./serialize";

/**
 * Server-side reads shared by the route handlers and the server components.
 *
 * A server component could fetch its own API route, but that is an HTTP hop
 * to the same process plus a second session check for data it is already
 * allowed to read. It calls these directly instead, and /api/dashboard calls
 * the same function, so there is one definition of each figure.
 */

export type DashboardData = {
  ordersToday: number;
  toConfirm: number;
  /** centimes actually handed over, by collection date — not by order date */
  collectedThisMonth: number;
  /** centimes out with a parcel: shipped, not yet delivered */
  awaitingCollection: number;
  /** orders ready to go with no Yalidine parcel yet */
  awaitingParcels: number;
  lowStock: {
    slug: string;
    title: { fr: string; ar?: string };
    remaining: number;
    threshold: number;
  }[];
  recentOrders: OrderDto[];
};

export async function getDashboardData(): Promise<DashboardData> {
  await connectDb();

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    ordersToday,
    toConfirm,
    collected,
    awaiting,
    awaitingParcels,
    lowStock,
    recent,
  ] = await Promise.all([
    Order.countDocuments({ createdAt: { $gte: startOfDay } }),
    Order.countDocuments({ status: "pending" }),
    Order.aggregate<{ total: number }>([
      {
        $match: {
          "payment.collected": true,
          "payment.collectedAt": { $gte: startOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: "$totals.grandTotal" } } },
    ]),
    Order.aggregate<{ total: number }>([
      { $match: { status: "shipped" } },
      { $group: { _id: null, total: { $sum: "$totals.grandTotal" } } },
    ]),
    Order.countDocuments({
      status: { $in: ["confirmed", "packed"] },
      "yalidine.tracking": { $in: [null, ""] },
    }),
    Book.find({
      isActive: true,
      $expr: { $lte: ["$stockOnHand", "$lowStockThreshold"] },
    })
      .select("slug title stockOnHand lowStockThreshold")
      .sort({ stockOnHand: 1 })
      .limit(10)
      .lean(),
    Order.find().sort({ createdAt: -1 }).limit(5).lean(),
  ]);

  return {
    ordersToday,
    toConfirm,
    collectedThisMonth: collected[0]?.total ?? 0,
    awaitingCollection: awaiting[0]?.total ?? 0,
    awaitingParcels,
    lowStock: lowStock.map((b) => ({
      slug: b.slug,
      title: { fr: b.title.fr, ar: b.title.ar ?? undefined },
      remaining: b.stockOnHand ?? 0,
      threshold: b.lowStockThreshold ?? 3,
    })),
    recentOrders: recent.map(toOrder),
  };
}

/** The tab bar badge: orders still waiting for a confirmation call. */
export async function getPendingCount() {
  await connectDb();
  return Order.countDocuments({ status: "pending" });
}

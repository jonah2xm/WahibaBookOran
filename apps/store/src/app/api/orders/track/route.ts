import { Order, connectDb } from "@bookoran/db";
import { NextResponse } from "next/server";

/**
 * GET /api/orders/track?number=BO-2609-0143&phone=0555312408
 *
 * Both are required and both must match. Order numbers are sequential, so a
 * number alone would let anyone walk the range and read every customer's
 * name, address and phone. The pair is the customer's own knowledge.
 *
 * A wrong pair returns the same 404 as a number that does not exist, so this
 * cannot be used to discover which numbers are real.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const number = url.searchParams.get("number")?.trim() ?? "";
  const phone = (url.searchParams.get("phone") ?? "").replace(/\D/g, "");

  if (!number || !phone) {
    return NextResponse.json(
      { error: { code: "missing", message: "Numéro et téléphone requis." } },
      { status: 400 },
    );
  }

  await connectDb();

  const order = await Order.findOne({
    orderNumber: number.toUpperCase(),
    "customer.phone": phone,
  })
    .select("orderNumber status statusHistory totals items delivery yalidine createdAt")
    .lean();

  if (!order) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Commande introuvable." } },
      { status: 404 },
    );
  }

  // Deliberately narrow: what the customer needs to follow their parcel, and
  // nothing else. No internal notes, no other contact details.
  return NextResponse.json({
    orderNumber: order.orderNumber,
    status: order.status,
    placedAt: order.createdAt.toISOString(),
    timeline: (order.statusHistory ?? []).map((s) => ({
      key: s.status,
      at: (s.at ?? order.createdAt).toISOString(),
    })),
    items: order.items.map((i) => ({
      title: i.titleSnapshot,
      quantity: i.quantity,
      price: i.priceSnapshot,
    })),
    delivery: {
      method: order.delivery.method,
      wilaya: order.delivery.wilayaName,
      commune: order.delivery.communeName,
    },
    totals: {
      subtotal: order.totals.subtotal,
      deliveryFee: order.totals.deliveryFee,
      total: order.totals.grandTotal,
    },
    tracking: order.yalidine?.tracking ?? null,
  });
}

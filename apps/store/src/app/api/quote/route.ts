import { NextResponse } from "next/server";
import { z } from "zod";
import { priceBasket, priceDelivery } from "@/lib/quote";

/**
 * Delivery quote for the checkout screen.
 *
 * Both the basket price and the delivery fee are computed in lib/quote.ts,
 * which /api/orders also calls — so the figure shown here and the figure
 * actually charged cannot drift apart.
 *
 * The client sends slugs and quantities, never prices.
 */

const Body = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1),
  wilayaId: z.number().int().min(1).max(58),
  communeId: z.number().int(),
  method: z.enum(["home", "stopdesk"]),
});

export type QuoteResponse =
  | {
      status: "ok";
      /** centimes */
      fee: number;
      baseFee: number;
      overweightFee: number;
      freeShippingApplied: boolean;
      subtotal: number;
      total: number;
      billableKg: number;
      /** true when served from a cache rather than a live call */
      stale: boolean;
      source: "zone-table" | "yalidine";
    }
  | { status: "unavailable"; reason: string; subtotal: number };

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { items, wilayaId, communeId, method } = parsed.data;

  const basket = await priceBasket(items);
  const delivery = await priceDelivery({
    wilayaId,
    communeId,
    method,
    subtotal: basket.subtotal,
    grams: basket.grams,
  });

  if (delivery.status === "unavailable") {
    const body: QuoteResponse = {
      status: "unavailable",
      reason: delivery.reason,
      subtotal: basket.subtotal,
    };
    return NextResponse.json(body);
  }

  const body: QuoteResponse = {
    status: "ok",
    fee: delivery.fee,
    baseFee: delivery.baseFee,
    overweightFee: delivery.overweightFee,
    freeShippingApplied: delivery.freeShippingApplied,
    subtotal: basket.subtotal,
    total: basket.subtotal + delivery.fee,
    billableKg: delivery.billableKg,
    stale: delivery.stale,
    source: delivery.source,
  };
  return NextResponse.json(body);
}

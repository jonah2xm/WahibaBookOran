import { Order, connectDb, nextOrderNumber } from "@bookoran/db";
import { NextResponse } from "next/server";
import { z } from "zod";
import { centersOf, communesOf, wilayas } from "@/lib/geo";
import { priceBasket, priceDelivery } from "@/lib/quote";

/**
 * POST /api/orders — places an order.
 *
 * ┌────────────────────────────────────────────────────────────────────┐
 * │ NOTHING ABOUT MONEY COMES FROM THE REQUEST.                        │
 * │                                                                    │
 * │ The body carries slugs, quantities, an address and a delivery      │
 * │ choice. Every price, weight, fee and total is recomputed here from │
 * │ the catalogue and the settings. The figures the browser showed are │
 * │ display only; if they disagree with these, these win and the       │
 * │ response says so.                                                  │
 * └────────────────────────────────────────────────────────────────────┘
 *
 * Stock is NOT decremented here. A cash-on-delivery order is a request, not
 * a sale — a real share are never confirmed. Copies are reserved when the
 * shop confirms by phone and leave stock when the parcel ships
 * (PROJECT_PLAN §5).
 */

const Body = z.object({
  items: z
    .array(
      z.object({
        slug: z.string().min(1),
        quantity: z.number().int().min(1).max(99),
      }),
    )
    .min(1, "Le panier est vide."),
  customer: z.object({
    fullName: z.string().trim().min(2, "Nom trop court."),
    phone: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => /^0[5-7]\d{8}$/.test(v), "Numéro algérien attendu."),
    altPhone: z
      .string()
      .trim()
      .transform((v) => v.replace(/\D/g, ""))
      .refine((v) => v === "" || /^0[5-7]\d{8}$/.test(v), "Numéro invalide.")
      .optional(),
  }),
  delivery: z.object({
    method: z.enum(["home", "stopdesk"]),
    wilayaId: z.number().int().min(1).max(58),
    communeId: z.number().int(),
    address: z.string().trim().optional(),
    stopdeskCenterId: z.number().int().optional(),
  }),
  locale: z.enum(["fr", "ar"]).default("fr"),
  /** the customer ticked the conditions of sale */
  agreed: z.literal(true, {
    errorMap: () => ({ message: "Les conditions doivent être acceptées." }),
  }),
});

function fail(status: number, code: string, message: string, extra = {}) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return fail(400, "bad_json", "Requête illisible.");
  }

  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fields[issue.path.join(".")] = issue.message;
    }
    return fail(422, "invalid_body", "Informations incomplètes.", { fields });
  }

  const input = parsed.data;

  // A home delivery with no address cannot be delivered.
  if (input.delivery.method === "home" && !input.delivery.address) {
    return fail(422, "invalid_body", "Informations incomplètes.", {
      fields: { "delivery.address": "L'adresse est obligatoire." },
    });
  }

  const wilaya = wilayas.find((w) => w.id === input.delivery.wilayaId);
  const commune = communesOf(input.delivery.wilayaId).find(
    (c) => c.id === input.delivery.communeId,
  );
  if (!wilaya || !commune) {
    return fail(422, "unknown_place", "Wilaya ou commune inconnue.");
  }

  const centre =
    input.delivery.method === "stopdesk" && input.delivery.stopdeskCenterId
      ? centersOf(input.delivery.wilayaId).find(
          (c) => c.id === input.delivery.stopdeskCenterId,
        )
      : undefined;

  const basket = await priceBasket(input.items);

  // Everything the customer picked is gone or unsellable — there is no order
  // to place, and saying which lines failed lets the cart fix itself.
  if (basket.lines.length === 0) {
    return fail(409, "nothing_available", "Aucun article n'est disponible.", {
      rejected: basket.rejected,
    });
  }

  const delivery = await priceDelivery({
    wilayaId: input.delivery.wilayaId,
    communeId: input.delivery.communeId,
    method: input.delivery.method,
    subtotal: basket.subtotal,
    grams: basket.grams,
  });

  // No tariff for this commune: take the order anyway and flag it, rather
  // than turning away a customer over a gap in our own fee table. The admin
  // sees the note and confirms the fee on the phone.
  const unpriced = delivery.status === "unavailable";
  const deliveryFee = unpriced ? 0 : delivery.fee;

  await connectDb();

  const order = await Order.create({
    orderNumber: await nextOrderNumber(),
    status: "pending",
    customer: {
      fullName: input.customer.fullName,
      phone: input.customer.phone,
      altPhone: input.customer.altPhone || undefined,
    },
    delivery: {
      method: input.delivery.method,
      wilayaId: wilaya.id,
      wilayaName: wilaya.name.fr,
      communeId: commune.id,
      communeName: commune.name.fr,
      address:
        input.delivery.method === "home" ? input.delivery.address : undefined,
      stopdeskCenterId: centre?.id,
      stopdeskName: centre?.name.fr,
    },
    items: basket.lines.map((l) => ({
      bookId: l.bookId,
      titleSnapshot: l.title,
      priceSnapshot: l.unitPrice,
      weightSnapshot: l.unitWeight,
      quantity: l.quantity,
    })),
    totals: {
      subtotal: basket.subtotal,
      deliveryFee,
      discount: 0,
      grandTotal: basket.subtotal + deliveryFee,
    },
    locale: input.locale,
    notes: unpriced ? "Tarif de livraison à confirmer par téléphone." : undefined,
    statusHistory: [{ status: "pending", at: new Date() }],
  });

  return NextResponse.json(
    {
      orderNumber: order.orderNumber,
      subtotal: basket.subtotal,
      deliveryFee,
      total: basket.subtotal + deliveryFee,
      deliveryFeePending: unpriced,
      // Present only when the basket changed under the customer. The
      // confirmation screen tells them which lines were dropped rather than
      // letting them discover it from the total.
      ...(basket.rejected.length ? { rejected: basket.rejected } : {}),
    },
    { status: 201 },
  );
}

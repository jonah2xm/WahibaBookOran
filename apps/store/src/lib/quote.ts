import "server-only";
import { Book as BookModel, connectDb } from "@bookoran/db";
import { communesOf, zoneFees } from "./geo";
import { getShopSettings } from "./catalogue";

/**
 * The delivery quote, computed once and used twice: by /api/quote for the
 * figure on screen, and by /api/orders for the figure that is actually
 * charged. Two implementations would eventually disagree, and the customer
 * would be billed something other than what they agreed to.
 *
 * THIS IS THE YALIDINE SWAP POINT. `priceDelivery()` below prices from the
 * local zone table in lib/geo.ts. When the credentials land, replace its body
 * with GET /deliveryfees?from_wilaya_id=&to_wilaya_id=, cache into
 * `yalidineCache` per PROJECT_PLAN §6, and keep the return shape — both
 * callers and the UI are written against it.
 */

export type PricedLine = {
  slug: string;
  bookId: string;
  title: string;
  unitPrice: number;
  unitWeight: number;
  quantity: number;
};

export type Priced = {
  lines: PricedLine[];
  subtotal: number;
  grams: number;
  /** slugs the customer asked for that cannot be sold right now */
  rejected: { slug: string; reason: "unknown" | "inactive" | "out_of_stock" }[];
};

/**
 * Prices a basket from the database.
 *
 * The client sends slugs and quantities and nothing else. Every price, weight
 * and title here comes from the catalogue, so a tampered request cannot buy a
 * book for a price the shop never set.
 */
export async function priceBasket(
  items: { slug: string; quantity: number }[],
): Promise<Priced> {
  await connectDb();

  const slugs = items.map((i) => i.slug);
  const books = await BookModel.find({ slug: { $in: slugs } })
    .select("slug title priceDzd weightGrams stockOnHand isActive")
    .lean();

  const bySlug = new Map(books.map((b) => [b.slug, b]));

  const lines: PricedLine[] = [];
  const rejected: Priced["rejected"] = [];
  let subtotal = 0;
  let grams = 0;

  for (const item of items) {
    const book = bySlug.get(item.slug);
    if (!book) {
      rejected.push({ slug: item.slug, reason: "unknown" });
      continue;
    }
    if (!book.isActive) {
      rejected.push({ slug: item.slug, reason: "inactive" });
      continue;
    }
    // Reserved copies belong to orders already confirmed, so they are not
    // available here — otherwise two customers buy the same last copy.
    if ((book.stockOnHand ?? 0) < item.quantity) {
      rejected.push({ slug: item.slug, reason: "out_of_stock" });
      continue;
    }

    lines.push({
      slug: book.slug,
      bookId: String(book._id),
      title: book.title.fr,
      unitPrice: book.priceDzd,
      unitWeight: book.weightGrams,
      quantity: item.quantity,
    });
    subtotal += book.priceDzd * item.quantity;
    grams += book.weightGrams * item.quantity;
  }

  return { lines, subtotal, grams, rejected };
}

export type DeliveryQuote =
  | {
      status: "ok";
      fee: number;
      baseFee: number;
      overweightFee: number;
      freeShippingApplied: boolean;
      billableKg: number;
      stale: boolean;
      source: "zone-table" | "yalidine";
    }
  | { status: "unavailable"; reason: string };

export async function priceDelivery(input: {
  wilayaId: number;
  communeId: number;
  method: "home" | "stopdesk";
  subtotal: number;
  grams: number;
}): Promise<DeliveryQuote> {
  const settings = await getShopSettings();

  const commune = communesOf(input.wilayaId).find(
    (c) => c.id === input.communeId,
  );
  const fees = zoneFees(input.wilayaId);

  if (!commune || !fees) {
    // The board's fourth state. Never block the sale on this: the order can
    // still be placed and the fee confirmed by phone (PROJECT_PLAN §6).
    return { status: "unavailable", reason: "no tariff for this commune" };
  }

  const baseFee = input.method === "home" ? fees.home : fees.desk;
  const billableKg = Math.max(1, Math.ceil(input.grams / 1000));
  const overweightFee =
    billableKg > settings.freeKg
      ? (billableKg - settings.freeKg) * settings.overweightRateDzd
      : 0;

  const freeShippingApplied =
    input.subtotal >= settings.freeShippingThresholdDzd;

  return {
    status: "ok",
    // Free shipping waives the base fare, not the overweight surcharge —
    // Yalidine still bills the extra kilos whatever the shop promises.
    fee: (freeShippingApplied ? 0 : baseFee) + overweightFee,
    baseFee,
    overweightFee,
    freeShippingApplied,
    billableKg,
    stale: false,
    source: "zone-table",
  };
}

import { nextSequence } from "./models/Counter";

/**
 * Human-readable order number: BO-2609-0143.
 *
 * `BO-` because that is what the board, the storefront and the admin already
 * show, and what a customer will read back over the phone. `YYMM` so a number
 * says roughly when the order was placed without a lookup, and the sequence
 * restarts small every month instead of growing to six digits.
 *
 * The sequence comes from an atomic $inc, not from counting orders: two
 * checkouts in the same millisecond would otherwise mint the same number and
 * the unique index would reject the second customer's order at the very last
 * step of a form they already filled in.
 *
 * NOTE: the storefront still generates `BO-####` at random into localStorage
 * (apps/store/src/app/[locale]/commande/page.tsx). That stub, and the
 * `BO-0000` placeholder on the tracking page, change over when order creation
 * moves to the API.
 */
export async function nextOrderNumber(now = new Date()) {
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const period = `${yy}${mm}`;
  const seq = await nextSequence(`order:${period}`);
  return `BO-${period}-${String(seq).padStart(4, "0")}`;
}

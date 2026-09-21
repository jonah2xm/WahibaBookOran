import { Settings, getSettings } from "@bookoran/db";
import { NextResponse } from "next/server";
import { body, route } from "@/lib/api";
import { settingsSchema } from "@/lib/schemas";

function serialize(doc: Awaited<ReturnType<typeof getSettings>>) {
  return {
    storeName: doc.storeName,
    phone: doc.phone,
    originWilayaId: doc.originWilayaId,
    originWilayaName: doc.originWilayaName,
    freeShippingThresholdDzd: doc.freeShippingThresholdDzd,
    overweightRateDzd: doc.overweightRateDzd,
    freeKg: doc.freeKg,
    stopdeskByDefault: doc.stopdeskByDefault ?? false,
  };
}

/** GET /api/settings — creates the document on first read, never returns null. */
export const GET = route(async () => {
  return NextResponse.json(serialize(await getSettings()));
});

/**
 * PUT /api/settings — owner only.
 *
 * These values decide what customers are charged for delivery and when it is
 * free. That is a money decision, so a packer account cannot make it.
 */
export const PUT = route(
  async ({ req }) => {
    const input = await body(req, settingsSchema);

    const updated = await Settings.findByIdAndUpdate(
      "store",
      { $set: input },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );

    return NextResponse.json(serialize(updated!));
  },
  { owner: true },
);

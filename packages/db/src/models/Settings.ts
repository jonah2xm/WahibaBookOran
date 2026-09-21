import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { intField, PHONE_PATTERN } from "../schema-helpers";

/**
 * A single document, id "store". Admin A10 edits it; the storefront and the
 * quote route read it instead of the constants they use today
 * (apps/store/src/lib/geo.ts, apps/store/src/data/catalogue.ts).
 */
const settingsSchema = new Schema(
  {
    _id: { type: String, default: "store" },

    storeName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [PHONE_PATTERN, "Numéro algérien attendu, ex. 0555312408"],
    },

    /** Yalidine computes every tariff from this wilaya. */
    originWilayaId: { type: Number, required: true },
    originWilayaName: { type: String, required: true },

    /** centimes; subtotals at or above this ship free */
    freeShippingThresholdDzd: intField({ required: true, min: 0 }),
    /** centimes billed per kilo above the allowance */
    overweightRateDzd: intField({ required: true, min: 0 }),
    /** kilos included before the overweight rate applies */
    freeKg: intField({ required: true, min: 0 }),

    stopdeskByDefault: { type: Boolean, default: false },
  },
  { timestamps: true, _id: false },
);

export type SettingsDoc = InferSchemaType<typeof settingsSchema>;

export const Settings: Model<SettingsDoc> =
  (models.Settings as Model<SettingsDoc>) ??
  model<SettingsDoc>("Settings", settingsSchema);

/** The one document, created on first read so callers never get null. */
export async function getSettings() {
  const existing = await Settings.findById("store");
  if (existing) return existing;
  return Settings.create(defaultSettings);
}

export const defaultSettings = {
  _id: "store",
  storeName: "BookOran31",
  phone: "0555312408",
  originWilayaId: 31,
  originWilayaName: "Oran",
  freeShippingThresholdDzd: 500000,
  overweightRateDzd: 5000,
  freeKg: 5,
  stopdeskByDefault: false,
};

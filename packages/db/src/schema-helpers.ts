import { Schema } from "mongoose";

/**
 * Bilingual value. `ar` is optional on purpose: the shop launches in French
 * and gains Arabic content later with no migration (PROJECT_PLAN §4). Readers
 * fall back to `fr` — see `pick` in each app's lib/types.
 */
export type Bilingual = { fr: string; ar?: string };

export const bilingualSchema = new Schema<Bilingual>(
  {
    fr: { type: String, required: true, trim: true },
    ar: { type: String, trim: true },
  },
  { _id: false },
);

/** Same, but the French side may be empty — for optional prose like a summary. */
export const optionalBilingualSchema = new Schema<Bilingual>(
  {
    fr: { type: String, default: "", trim: true },
    ar: { type: String, trim: true },
  },
  { _id: false },
);

/**
 * Money and counts, as integers.
 *
 * Every amount in this codebase is centimes of DZD. Mongoose has no integer
 * type, so a stray 1350.5 would be stored happily and then surface as
 * "13.505 DA" three screens away. This validator is the only thing standing
 * between a float and the customer's total, so it is applied to every
 * monetary and quantity field rather than trusted to callers.
 */
export function intField(options: {
  required?: boolean;
  default?: number | null;
  min?: number;
} = {}) {
  return {
    type: Number,
    required: options.required ?? false,
    ...(options.default !== undefined ? { default: options.default } : {}),
    ...(options.min !== undefined ? { min: options.min } : {}),
    validate: {
      validator: (v: number | null | undefined) =>
        v === null || v === undefined || Number.isInteger(v),
      message: "{PATH} must be an integer (money is centimes, never a float)",
    },
  };
}

/** Algerian mobile: 0X XX XX XX XX, stored digits-only. */
export const PHONE_PATTERN = /^0[5-7]\d{8}$/;

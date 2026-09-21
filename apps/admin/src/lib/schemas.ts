import { MOVEMENT_TYPES, ORDER_STATUSES } from "@bookoran/db";
import { z } from "zod";

/**
 * Request bodies for the admin API.
 *
 * Money and quantities are `z.number().int()` on purpose: a float that gets
 * this far becomes a price ending in half a centime three screens later, and
 * the database validator would reject it anyway — better to say which field
 * and why, here, than to return a generic 500.
 */

const bilingual = z.object({
  fr: z.string().trim().min(1, "Le français est obligatoire."),
  ar: z.string().trim().optional(),
});

const optionalBilingual = z.object({
  fr: z.string().trim(),
  ar: z.string().trim().optional(),
});

const centimes = z
  .number()
  .int("Les montants sont en centimes, jamais des décimales.")
  .min(0);

export const bookPatchSchema = z
  .object({
    title: bilingual,
    author: bilingual,
    summary: optionalBilingual.nullable(),
    categorySlugs: z.array(z.string().trim().min(1)),
    // Only ever a Cloudinary URL on our own cloud, or null to clear it. A
    // free-form URL here would let the admin point a book's cover at any
    // site on the internet, which is a stored-content hole and a broken
    // image waiting to happen. The upload route is the only way in.
    coverUrl: z
      .string()
      .url()
      .refine(
        (u) => u.startsWith("https://res.cloudinary.com/"),
        "Une image envoyée depuis cet écran, pas un lien externe.",
      )
      .nullable(),
    priceDzd: centimes,
    compareAtPriceDzd: centimes.nullable(),
    // Required by the database because Yalidine bills by weight. Saying so
    // here means the editor gets the real reason, not "validation failed".
    weightGrams: z
      .number()
      .int()
      .min(1, "Le poids est obligatoire : sans lui, aucun tarif de livraison."),
    lowStockThreshold: z.number().int().min(0),
    isbn: z.string().trim().optional(),
    publisher: z.string().trim().optional(),
    pageCount: z.number().int().min(0).optional(),
    bookLanguage: z.enum(["fr", "ar"]),
    isNew: z.boolean(),
    isBestSeller: z.boolean(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, {
    message: "Rien à modifier.",
  });

export const bookCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug en minuscules, chiffres et tirets."),
  title: bilingual,
  author: bilingual,
  summary: optionalBilingual.optional(),
  categorySlugs: z.array(z.string().trim().min(1)).default([]),
  priceDzd: centimes,
  compareAtPriceDzd: centimes.nullable().optional(),
  weightGrams: z.number().int().min(1),
  lowStockThreshold: z.number().int().min(0).default(3),
  isbn: z.string().trim().optional(),
  publisher: z.string().trim().optional(),
  pageCount: z.number().int().min(0).optional(),
  bookLanguage: z.enum(["fr", "ar"]).default("fr"),
});

/**
 * A stock adjustment. `sale_out` is absent: a sale is recorded by an order,
 * never by hand, or the ledger stops matching the money.
 */
export const movementSchema = z
  .object({
    type: z.enum(
      MOVEMENT_TYPES.filter((t) => t !== "sale_out") as [string, ...string[]],
    ),
    quantity: z
      .number()
      .int("Une quantité entière.")
      .refine((n) => n !== 0, "Un mouvement de zéro n'enregistre rien."),
    reason: z.string().trim().min(1, "Indiquez un motif."),
  })
  .strict();

export const orderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES as unknown as [string, ...string[]]),
  note: z.string().trim().optional(),
});

export const agreementSchema = z.object({
  sections: z.array(
    z.object({
      key: z.string().trim().min(1),
      title: bilingual,
      points: z.array(optionalBilingual),
      needsReview: z.boolean().optional(),
    }),
  ),
  publish: z.boolean().optional(),
});

export const settingsSchema = z.object({
  storeName: z.string().trim().min(1),
  phone: z
    .string()
    .trim()
    .regex(/^0[5-7]\d{8}$/, "Numéro algérien attendu, ex. 0555312408"),
  originWilayaId: z.number().int().min(1).max(58),
  originWilayaName: z.string().trim().min(1),
  freeShippingThresholdDzd: centimes,
  overweightRateDzd: centimes,
  freeKg: z.number().int().min(0),
  stopdeskByDefault: z.boolean(),
});

/** A new category. The slug is the URL the shop links to, so it is checked. */
export const categoryCreateSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Slug en minuscules, chiffres et tirets."),
  name: bilingual,
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

/**
 * An edit. The slug is absent on purpose: books point at a category by id,
 * but the storefront links to it by slug, so renaming one would break every
 * link already shared. Delete and recreate if it really must change.
 */
export const categoryPatchSchema = z
  .object({
    name: bilingual,
    sortOrder: z.number().int().min(0),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Rien à modifier." });

/**
 * Changing your own password.
 *
 * `current` is required even though the caller is already signed in: a
 * session picked up from an unlocked laptop should not be enough to lock the
 * owner out of their own shop.
 */
export const passwordChangeSchema = z.object({
  current: z.string().min(1, "Mot de passe actuel requis."),
  next: z
    .string()
    .min(10, "Au moins 10 caractères : ce compte voit les coordonnées de tous les clients.")
    .max(200),
});

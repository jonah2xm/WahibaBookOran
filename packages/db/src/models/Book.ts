import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import {
  bilingualSchema,
  intField,
  optionalBilingualSchema,
} from "../schema-helpers";

const dimensionsSchema = new Schema(
  {
    l: intField({ min: 0 }),
    w: intField({ min: 0 }),
    h: intField({ min: 0 }),
  },
  { _id: false },
);

const bookSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    title: { type: bilingualSchema, required: true },
    author: { type: bilingualSchema, required: true },
    summary: { type: optionalBilingualSchema },

    categoryIds: [{ type: Schema.Types.ObjectId, ref: "Category", index: true }],

    isbn: { type: String, trim: true },
    publisher: { type: String, trim: true },
    publishedYear: { type: Number },
    pageCount: { type: Number, min: 0 },
    bookLanguage: { type: String, enum: ["fr", "ar"], default: "fr" },

    coverUrl: { type: String, default: null },
    galleryUrls: { type: [String], default: [] },
    /** placeholder tint index while real covers are missing (0–4) */
    coverTint: { type: Number, min: 0, max: 4, default: 0 },

    priceDzd: intField({ required: true, min: 0 }),
    compareAtPriceDzd: intField({ default: null, min: 0 }),

    /**
     * REQUIRED, and required for a reason: Yalidine bills by weight above the
     * free allowance. A book without a weight cannot be quoted, so the order
     * would be taken at a price the shop then has to eat. The admin editor
     * blocks saving without it; this is the same rule at the database.
     */
    weightGrams: intField({ required: true, min: 1 }),
    dimensionsCm: { type: dimensionsSchema },

    /** cached sum of stockMovements — see recomputeStockOnHand() */
    stockOnHand: intField({ default: 0 }),
    /** held by confirmed-but-unshipped orders */
    stockReserved: intField({ default: 0, min: 0 }),
    lowStockThreshold: intField({ default: 3, min: 0 }),

    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    /**
     * NOT `isNew`: that is a reserved Mongoose path — `doc.isNew` is its own
     * flag for "not yet saved", and shadowing it breaks save() in ways that
     * only show up at runtime. Mongoose warns about this at boot.
     */
    isNewArrival: { type: Boolean, default: false },
    isBestSeller: { type: Boolean, default: false },
  },
  { timestamps: true },
);

/** The storefront's default listing: active books, newest first. */
bookSchema.index({ isActive: 1, createdAt: -1 });
/** Admin "stock bas" and the dashboard alert list. */
bookSchema.index({ stockOnHand: 1 });
/** Free-text search over title and author, both languages. */
bookSchema.index({
  "title.fr": "text",
  "title.ar": "text",
  "author.fr": "text",
  "author.ar": "text",
  isbn: "text",
});

/** Free to sell now: on hand minus what confirmed orders are holding. */
bookSchema.virtual("stockAvailable").get(function () {
  return Math.max((this.stockOnHand ?? 0) - (this.stockReserved ?? 0), 0);
});

export type BookDoc = InferSchemaType<typeof bookSchema>;

export const Book: Model<BookDoc> =
  (models.Book as Model<BookDoc>) ?? model<BookDoc>("Book", bookSchema);

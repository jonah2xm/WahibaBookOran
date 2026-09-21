import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { intField, PHONE_PATTERN } from "../schema-helpers";

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "remitted",
  "returned",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

const statusEntrySchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: () => new Date() },
    by: { type: Schema.Types.ObjectId, ref: "AdminUser" },
    note: { type: String, trim: true },
  },
  { _id: false },
);

/**
 * Snapshots, not references.
 *
 * An order must still show what the customer actually agreed to pay after
 * next month's price change. `bookId` is kept for restocking on a return,
 * but nothing on the order is ever re-read from the book.
 */
const orderItemSchema = new Schema(
  {
    bookId: { type: Schema.Types.ObjectId, ref: "Book", required: true },
    titleSnapshot: { type: String, required: true },
    priceSnapshot: intField({ required: true, min: 0 }),
    weightSnapshot: intField({ required: true, min: 0 }),
    quantity: intField({ required: true, min: 1 }),
  },
  { _id: false },
);

const totalsSchema = new Schema(
  {
    subtotal: intField({ required: true, min: 0 }),
    deliveryFee: intField({ required: true, min: 0 }),
    discount: intField({ default: 0, min: 0 }),
    grandTotal: intField({ required: true, min: 0 }),
  },
  { _id: false },
);

const customerSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [PHONE_PATTERN, "Numéro algérien attendu, ex. 0555312408"],
    },
    altPhone: { type: String, trim: true },
  },
  { _id: false },
);

const deliverySchema = new Schema(
  {
    method: { type: String, enum: ["home", "stopdesk"], required: true },
    wilayaId: { type: Number, required: true },
    wilayaName: { type: String, required: true },
    communeId: { type: Number },
    communeName: { type: String, required: true },
    address: { type: String, trim: true },
    stopdeskCenterId: { type: Number },
    stopdeskName: { type: String, trim: true },
  },
  { _id: false },
);

const yalidineSchema = new Schema(
  {
    tracking: { type: String, trim: true },
    labelUrl: { type: String },
    lastStatus: { type: String },
    lastSyncedAt: { type: Date },
  },
  { _id: false },
);

const paymentSchema = new Schema(
  {
    method: { type: String, enum: ["cod"], default: "cod" },
    collected: { type: Boolean, default: false },
    collectedAt: { type: Date },
    remittedAt: { type: Date },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      index: true,
    },
    statusHistory: { type: [statusEntrySchema], default: [] },

    customer: { type: customerSchema, required: true },
    delivery: { type: deliverySchema, required: true },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
        message: "An order needs at least one item.",
      },
    },

    /**
     * Computed server-side at creation from the catalogue and the Yalidine
     * quote — never from numbers the browser sent. The client's figures are
     * display only.
     */
    totals: { type: totalsSchema, required: true },

    yalidine: { type: yalidineSchema, default: () => ({}) },
    payment: { type: paymentSchema, required: true, default: () => ({}) },

    locale: { type: String, enum: ["fr", "ar"], default: "fr" },
    notes: { type: String, trim: true },
  },
  { timestamps: true },
);

/** The admin pipeline: one column, newest first. */
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "yalidine.tracking": 1 }, { sparse: true });
/** Customer tracking looks up by number, or by phone when they forgot it. */
orderSchema.index({ "customer.phone": 1, createdAt: -1 });

/** Guard against a total that does not add up to its own parts. */
orderSchema.pre("validate", function (next) {
  const totals = this.totals;
  if (!totals) return next(new Error("An order needs totals."));

  const subtotal = this.items.reduce(
    (n, i) => n + i.priceSnapshot * i.quantity,
    0,
  );
  if (totals.subtotal !== subtotal) {
    return next(
      new Error(
        `totals.subtotal (${totals.subtotal}) does not match the items (${subtotal}).`,
      ),
    );
  }
  const grand = subtotal + totals.deliveryFee - (totals.discount ?? 0);
  if (totals.grandTotal !== grand) {
    return next(
      new Error(
        `totals.grandTotal (${totals.grandTotal}) does not match subtotal + delivery − discount (${grand}).`,
      ),
    );
  }
  next();
});

export type OrderDoc = InferSchemaType<typeof orderSchema>;

export const Order: Model<OrderDoc> =
  (models.Order as Model<OrderDoc>) ?? model<OrderDoc>("Order", orderSchema);

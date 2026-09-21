import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { intField } from "../schema-helpers";

/**
 * Why a quantity changed. There is no `production_in`: books are bought in,
 * not produced — production fees are out of scope by the owner's decision.
 *
 * These five strings are also the admin's message keys (`stock.kind.*`).
 * Renaming one means renaming it in apps/admin/messages/{fr,ar}.json.
 */
export const MOVEMENT_TYPES = [
  "purchase_in",
  "sale_out",
  "return_in",
  "damage_out",
  "adjustment",
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

const stockMovementSchema = new Schema(
  {
    bookId: {
      type: Schema.Types.ObjectId,
      ref: "Book",
      required: true,
      index: true,
    },
    type: { type: String, enum: MOVEMENT_TYPES, required: true },
    /** signed: negative takes stock out, positive puts it in. Never zero. */
    quantity: intField({ required: true }),
    /** free text; required on a manual adjustment, see the pre-validate hook */
    reason: { type: String, trim: true },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "AdminUser" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

/** The per-book history, newest first. */
stockMovementSchema.index({ bookId: 1, createdAt: -1 });

stockMovementSchema.pre("validate", function (next) {
  if (this.quantity === 0) {
    return next(new Error("A stock movement of zero records nothing."));
  }
  // An unexplained hand-made change is a hole in the ledger nobody can close
  // later. Movements that come from an order carry the order instead.
  if (
    (this.type === "adjustment" || this.type === "damage_out") &&
    !this.reason?.trim()
  ) {
    return next(new Error(`A movement of type "${this.type}" needs a reason.`));
  }
  next();
});

/**
 * Append-only. The ledger is the audit trail; editing it would make
 * `books.stockOnHand` unreconcilable against its own history.
 */
stockMovementSchema.pre("findOneAndUpdate", function (next) {
  next(new Error("stockMovements are append-only — write a new movement."));
});
stockMovementSchema.pre("updateOne", function (next) {
  next(new Error("stockMovements are append-only — write a new movement."));
});
stockMovementSchema.pre("updateMany", function (next) {
  next(new Error("stockMovements are append-only — write a new movement."));
});

export type StockMovementDoc = InferSchemaType<typeof stockMovementSchema>;

export const StockMovement: Model<StockMovementDoc> =
  (models.StockMovement as Model<StockMovementDoc>) ??
  model<StockMovementDoc>("StockMovement", stockMovementSchema);

import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { bilingualSchema } from "../schema-helpers";

/**
 * Conditions de vente. Rendered as <ul><li> on the storefront, edited as a
 * reorderable list in admin A9.
 *
 * Titles carry no number: A9 reorders sections, so the position is rendered
 * from `sortOrder` and a number typed into the title would be wrong the
 * moment the owner moves anything.
 */
const agreementSectionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    title: { type: bilingualSchema, required: true },
    points: { type: [bilingualSchema], default: [] },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    /**
     * Seed text the owner has not signed off yet. These are commitments to
     * customers, so the admin flags them "à relire" until it is cleared by
     * hand — it is never cleared by code.
     */
    needsReview: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

agreementSectionSchema.index({ isActive: 1, sortOrder: 1 });

export type AgreementSectionDoc = InferSchemaType<
  typeof agreementSectionSchema
>;

export const AgreementSection: Model<AgreementSectionDoc> =
  (models.AgreementSection as Model<AgreementSectionDoc>) ??
  model<AgreementSectionDoc>("AgreementSection", agreementSectionSchema);

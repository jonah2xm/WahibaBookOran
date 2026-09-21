import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";
import { bilingualSchema, optionalBilingualSchema } from "../schema-helpers";

const categorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, trim: true },
    name: { type: bilingualSchema, required: true },
    description: { type: optionalBilingualSchema },
    icon: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

categorySchema.index({ isActive: 1, sortOrder: 1 });

export type CategoryDoc = InferSchemaType<typeof categorySchema>;

/**
 * `models.Category ??` on every model in this package: Next re-evaluates
 * modules on hot reload, and calling model() twice with the same name throws
 * OverwriteModelError.
 */
export const Category: Model<CategoryDoc> =
  (models.Category as Model<CategoryDoc>) ??
  model<CategoryDoc>("Category", categorySchema);

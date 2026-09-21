import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Atomic sequence numbers, one document per counter.
 *
 * Order numbers cannot come from a count of existing orders — two checkouts
 * landing in the same millisecond would both read the same count and mint the
 * same number. findOneAndUpdate with $inc is atomic in Mongo, so each caller
 * gets its own value even under concurrency.
 */
const counterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

export type CounterDoc = InferSchemaType<typeof counterSchema>;

export const Counter: Model<CounterDoc> =
  (models.Counter as Model<CounterDoc>) ??
  model<CounterDoc>("Counter", counterSchema);

export async function nextSequence(name: string) {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return doc!.seq;
}

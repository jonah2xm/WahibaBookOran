import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

/**
 * Yalidine responses, cached so the shop does not call their API on every
 * page view and keeps working when it is down.
 *
 * `kind` + `key` is the cache key: ("communes", "31") is Oran's communes,
 * ("fees", "31-16-home") one origin/destination/method tariff.
 */
export const CACHE_KINDS = ["wilayas", "communes", "centers", "fees"] as const;
export type CacheKind = (typeof CACHE_KINDS)[number];

const yalidineCacheSchema = new Schema(
  {
    kind: { type: String, enum: CACHE_KINDS, required: true },
    key: { type: String, required: true, default: "" },
    payload: { type: Schema.Types.Mixed, required: true },
    fetchedAt: { type: Date, default: () => new Date() },
    ttlHours: { type: Number, default: 24 },
  },
  { timestamps: false },
);

yalidineCacheSchema.index({ kind: 1, key: 1 }, { unique: true });

/**
 * Deliberately NOT a TTL index. An expired entry is still better than no
 * price at all: when Yalidine is unreachable the quote route serves the stale
 * payload and marks it `stale: true` rather than telling the customer the
 * delivery cost is unknown. Mongo dropping the row would remove that option.
 */
yalidineCacheSchema.methods.isStale = function () {
  const age = Date.now() - new Date(this.fetchedAt).getTime();
  return age > this.ttlHours * 3600_000;
};

export type YalidineCacheDoc = InferSchemaType<typeof yalidineCacheSchema>;

export const YalidineCache: Model<YalidineCacheDoc> =
  (models.YalidineCache as Model<YalidineCacheDoc>) ??
  model<YalidineCacheDoc>("YalidineCache", yalidineCacheSchema);

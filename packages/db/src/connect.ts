import mongoose from "mongoose";

/**
 * One connection per process, reused across Next's hot reloads.
 *
 * Next re-evaluates modules on every edit in dev. Without the global cache
 * below, each reload opens another pool and Mongo eventually refuses new
 * connections — the classic "MongooseError: Can't call openUri() on an
 * active connection" / connection-limit failure in a Next app.
 */

type Cache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __bookoranMongoose: Cache | undefined;
}

const cache: Cache = globalThis.__bookoranMongoose ?? {
  conn: null,
  promise: null,
};
globalThis.__bookoranMongoose = cache;

export async function connectDb(uri = process.env.MONGODB_URI) {
  if (cache.conn) return cache.conn;

  if (!uri) {
    // Fail loudly and early. A silent fallback to a local mongod would let a
    // deploy come up looking healthy while serving an empty catalogue.
    throw new Error(
      "MONGODB_URI is not set. Add it to .env.local (see PROJECT_PLAN §9).",
    );
  }

  if (!cache.promise) {
    cache.promise = mongoose.connect(uri, {
      // Queries that arrive before the first connection completes would
      // otherwise buffer for 10s and then fail with a misleading timeout.
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });
  }

  try {
    cache.conn = await cache.promise;
  } catch (error) {
    // Let the next call retry instead of caching a rejected promise forever.
    cache.promise = null;
    throw error;
  }

  return cache.conn;
}

/** Closes the pool. For scripts and tests — never call this from a request. */
export async function disconnectDb() {
  if (!cache.conn) return;
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}

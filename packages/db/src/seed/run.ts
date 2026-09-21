/**
 * Seed script — `npm run seed --workspace @bookoran/db`
 *
 * Idempotent: every write is an upsert keyed on `slug` / `key` / `_id`, so
 * running it twice changes nothing the second time. Run it after any edit to
 * the files in this folder.
 *
 * Flags:
 *   --reset   empty the catalogue, the stock ledger, the agreement, the
 *             settings and the order counter first. Orders and admin users
 *             are never touched: one is the business's records, the other is
 *             its credentials.
 *   --force   allow --reset against a non-localhost database.
 *
 * What it does NOT do: invent an admin password. See ensureOwner() below.
 */
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { connectDb, disconnectDb } from "../connect";
import { AdminUser, hashPassword } from "../models/AdminUser";
import { AgreementSection } from "../models/AgreementSection";
import { Book } from "../models/Book";
import { Category } from "../models/Category";
import { Counter } from "../models/Counter";
import { Settings, defaultSettings } from "../models/Settings";
import { StockMovement } from "../models/StockMovement";
import { seedAgreement } from "./agreement";
import { seedBooks, seedCategories } from "./catalogue";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../..");

// Same file the apps read, so the script and the app cannot point at
// different databases by accident.
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, "apps/admin/.env.local") });

const args = new Set(process.argv.slice(2));
const reset = args.has("--reset");
const force = args.has("--force");

function log(step: string, detail = "") {
  console.log(`  ${step.padEnd(22)} ${detail}`);
}

async function clearSeedableCollections(uri: string) {
  const local = /localhost|127\.0\.0\.1/.test(uri);
  if (!local && !force) {
    throw new Error(
      "--reset points at a non-local database. This deletes the catalogue, " +
        "the stock ledger and the conditions of sale, and cannot be undone. " +
        "Re-run with --force if that is really what you want.",
    );
  }

  await Promise.all([
    Category.deleteMany({}),
    Book.deleteMany({}),
    StockMovement.deleteMany({}),
    AgreementSection.deleteMany({}),
    Settings.deleteMany({}),
    Counter.deleteMany({}),
  ]);
  log("reset", "catalogue, ledger, agreement, settings, counters");
}

async function seedCategoriesInto() {
  const bySlug = new Map<string, string>();
  for (const c of seedCategories) {
    const doc = await Category.findOneAndUpdate(
      { slug: c.slug },
      { $set: { name: c.name, sortOrder: c.sortOrder, isActive: true } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    bySlug.set(c.slug, String(doc._id));
  }
  log("categories", `${bySlug.size}`);
  return bySlug;
}

async function seedBooksInto(categoryIdBySlug: Map<string, string>) {
  let created = 0;
  let updated = 0;

  for (const b of seedBooks) {
    const categoryIds = b.categorySlugs.map((slug) => {
      const id = categoryIdBySlug.get(slug);
      // A typo here would silently produce a book in no category, which the
      // storefront then never lists. Fail instead.
      if (!id) throw new Error(`Book "${b.slug}" references unknown category "${slug}".`);
      return id;
    });

    const existing = await Book.findOne({ slug: b.slug }).select("_id");

    await Book.findOneAndUpdate(
      { slug: b.slug },
      {
        $set: {
          title: b.title,
          author: b.author,
          summary: b.summary,
          categoryIds,
          isbn: b.isbn,
          publisher: b.publisher,
          pageCount: b.pageCount,
          bookLanguage: b.bookLanguage ?? "fr",
          priceDzd: b.priceDzd,
          compareAtPriceDzd: b.compareAtPriceDzd ?? null,
          coverTint: b.coverTint ?? 0,
          weightGrams: b.weightGrams,
          lowStockThreshold: b.lowStockThreshold,
          // `isNew` in the seed file, `isNewArrival` in Mongo: `isNew` is a
          // reserved Mongoose path. See models/Book.ts.
          isNewArrival: b.isNew ?? false,
          isBestSeller: b.isBestSeller ?? false,
          isActive: true,
        },
        // Stock is owned by the ledger, never by the seed file. Re-running
        // the seed must not silently reset a count the owner has since
        // adjusted, so this is only set when the book is first created.
        $setOnInsert: { stockOnHand: 0, stockReserved: 0 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );

    if (existing) updated += 1;
    else created += 1;
  }

  log("books", `${created} created, ${updated} updated`);
}

/**
 * Gives every book an opening balance the ledger can explain.
 *
 * Without this the catalogue would show stock that no movement accounts for,
 * and the first reconciliation run would zero it. Only written for books that
 * have no movements yet, so re-running the seed never doubles a count.
 */
async function seedOpeningStock() {
  let written = 0;

  for (const b of seedBooks) {
    if (b.stockOnHand <= 0) continue;

    const book = await Book.findOne({ slug: b.slug }).select("_id");
    if (!book) continue;

    const already = await StockMovement.countDocuments({ bookId: book._id });
    if (already > 0) continue;

    await StockMovement.create({
      bookId: book._id,
      type: "purchase_in",
      quantity: b.stockOnHand,
      reason: "stock initial (seed)",
    });
    await Book.updateOne(
      { _id: book._id },
      { $set: { stockOnHand: b.stockOnHand } },
    );
    written += 1;
  }

  log("opening stock", `${written} books`);
}

async function seedAgreementInto() {
  for (const [i, s] of seedAgreement.entries()) {
    await AgreementSection.findOneAndUpdate(
      { key: s.key },
      {
        $set: {
          title: s.title,
          points: s.points,
          sortOrder: i + 1,
          isActive: true,
        },
        // Only on insert: if the owner has already reviewed a section,
        // re-seeding must not put the "à relire" flag back on.
        $setOnInsert: { needsReview: Boolean(s.draft) },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
  }
  log("agreement", `${seedAgreement.length} sections`);
}

async function seedSettings() {
  await Settings.findByIdAndUpdate(
    "store",
    { $setOnInsert: defaultSettings },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  log("settings", "store");
}

/**
 * Creates the owner account, once.
 *
 * The password comes from SEED_ADMIN_PASSWORD, or is generated and printed
 * here exactly once. It is never a fixed default: a known seed password on a
 * deployed admin is an open door, and this account can see every order and
 * every customer's phone number.
 *
 * An existing account is left alone — this must not reset a password the
 * owner has changed.
 */
async function ensureOwner() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase().trim();
  if (!email) {
    log("admin user", "skipped — set SEED_ADMIN_EMAIL to create one");
    return;
  }

  const existing = await AdminUser.findOne({ email });
  if (existing) {
    log("admin user", `${email} already exists, untouched`);
    return;
  }

  const provided = process.env.SEED_ADMIN_PASSWORD;
  const password = provided ?? randomBytes(12).toString("base64url");

  await AdminUser.create({
    email,
    name: process.env.SEED_ADMIN_NAME ?? "Gérant",
    role: "owner",
    passwordHash: await hashPassword(password),
    isActive: true,
  });

  log("admin user", `${email} created`);
  if (!provided) {
    const title = "Mot de passe généré — affiché une seule fois";
    const width = Math.max(title.length, password.length);
    const rule = "─".repeat(width + 2);
    console.log(`\n  ┌${rule}┐`);
    console.log(`  │ ${title.padEnd(width)} │`);
    console.log(`  │ ${password.padEnd(width)} │`);
    console.log(`  └${rule}┘`);
    console.log("  Copy it into your password manager now.\n");
  }
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "\nMONGODB_URI is not set.\n" +
        "Add it to bookstore/.env.local, e.g.\n" +
        "  MONGODB_URI=mongodb://127.0.0.1:27017/bookoran31\n",
    );
    process.exit(1);
  }

  const shown = uri.replace(/\/\/[^@]*@/, "//***@");
  console.log(`\nSeeding ${shown}\n`);

  await connectDb(uri);

  if (reset) await clearSeedableCollections(uri);

  const categoryIdBySlug = await seedCategoriesInto();
  await seedBooksInto(categoryIdBySlug);
  await seedOpeningStock();
  await seedAgreementInto();
  await seedSettings();
  await ensureOwner();

  console.log("\nDone.\n");
  await disconnectDb();
}

main().catch(async (error) => {
  console.error("\nSeed failed:", error instanceof Error ? error.message : error);
  await disconnectDb();
  process.exit(1);
});

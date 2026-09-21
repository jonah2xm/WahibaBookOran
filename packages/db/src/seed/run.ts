/**
 * Seed script — `npm run seed --workspace @bookoran/db`
 *
 * Idempotent: every write is an upsert keyed on `slug` / `key` / `_id`, so
 * running it twice changes nothing the second time. Run it after any edit to
 * the files in this folder.
 *
 * Targets development by default (.env.local). For production:
 *
 *   npm run seed:prod --workspace @bookoran/db
 *
 * which is this script with --env=.env.production.local. The two are separate
 * databases on the same cluster, so which one a run writes to is decided here
 * and nowhere else.
 *
 * Flags:
 *   --env=F   read F before .env.local, so F decides the database.
 *   --reset   empty the catalogue, the stock ledger, the agreement, the
 *             settings and the order counter first. Orders and admin users
 *             are never touched: one is the business's records, the other is
 *             its credentials.
 *   --force   allow --reset against a non-localhost database.
 *
 * What it does NOT do: invent an admin password. See ensureOwner() below.
 */
import { randomBytes } from "node:crypto";
import dns from "node:dns";
import fs from "node:fs";
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

const args = new Set(process.argv.slice(2));
const reset = args.has("--reset");
const force = args.has("--force");

/**
 * --env=<file> picks which database this run targets.
 *
 * Production and development are separate databases, and which one a run
 * writes to must be something you can read off the command line. Without the
 * flag this loads .env.local and seeds development; with
 * `--env=.env.production.local` it seeds production.
 *
 * It is the ONLY file read when given. Loading the dev .env.local alongside
 * it looks harmless — dotenv never overwrites an already-set variable, so the
 * database stays correct — but anything the chosen file leaves out silently
 * falls through to development. That is how a production run picked up the
 * dev SEED_ADMIN_PASSWORD instead of generating one: the variable was
 * commented out on purpose, and .env.local filled the gap.
 */
const envFlag = [...args]
  .find((a) => a.startsWith("--env="))
  ?.slice("--env=".length);

if (envFlag) {
  const file = path.isAbsolute(envFlag) ? envFlag : path.join(root, envFlag);
  // Falling back to the defaults here would seed development while the
  // command said production. Refuse instead.
  if (!fs.existsSync(file)) {
    console.error(`\n--env file not found: ${file}\n`);
    process.exit(1);
  }
  dotenv.config({ path: file });
  console.log(`Env file: ${path.relative(root, file)} (only)`);
} else {
  // Same files the apps read, so the script and the app cannot point at
  // different databases by accident.
  dotenv.config({ path: path.join(root, ".env.local") });
  dotenv.config({ path: path.join(root, "apps/admin/.env.local") });
}

/**
 * `mongodb+srv://` needs a DNS SRV lookup, and Node does that itself with
 * c-ares rather than through the OS resolver. If the machine points at a
 * local DNS proxy (a VPN client, Docker, a privacy filter — anything that
 * puts 127.0.0.1 in the resolver list), that proxy often refuses Node's
 * direct queries even though Windows itself resolves the name fine. The
 * result is `querySrv ECONNREFUSED`, which says nothing about the cause.
 *
 * Opt in with DNS_SERVERS=8.8.8.8,1.1.1.1 to route lookups elsewhere. Not
 * automatic: sending your DNS queries to a third party is your call, not the
 * script's.
 */
const dnsServers = (process.env.DNS_SERVERS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (dnsServers.length) {
  dns.setServers(dnsServers);
  console.log(`Using DNS servers: ${dnsServers.join(", ")}`);
}

/** The database a URI actually writes to, or null when it names none. */
function databaseName(uri: string) {
  const match = /^mongodb(?:\+srv)?:\/\/[^/?]+\/([^?/]+)/.exec(uri);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

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

  const database = databaseName(uri);

  // No database name means the driver silently uses `test`. On one cluster
  // holding both environments that is how production data ends up in the
  // development database, or the other way round — so this is fatal, not a
  // warning.
  if (!database) {
    console.error(
      "\nMONGODB_URI names no database, so everything would go into `test`.\n\n" +
        "  Put the name before the ? :\n" +
        "    ...mongodb.net/bookoran31_dev?retryWrites=true&w=majority\n\n" +
        "  Use the SAME uri on the host, or the deployed app reads a different\n" +
        "  database and finds neither your catalogue nor your admin account.\n",
    );
    process.exit(1);
  }

  const shown = uri.replace(/\/\/[^@]*@/, "//***@");
  const local = /localhost|127\.0\.0\.1/.test(uri);

  console.log(`\nSeeding ${shown}`);
  console.log(`Database: ${database}${local ? "" : "  (remote)"}`);

  // Worth a banner: on a shared cluster the only thing separating the shop's
  // real catalogue from a scratch one is this name.
  if (!local) {
    const line = `  TARGET: ${database}  — this is not a local database`;
    const rule = "─".repeat(line.length);
    console.log(`\n${rule}\n${line}\n${rule}`);
  }
  console.log("");

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
  const message = error instanceof Error ? error.message : String(error);
  console.error("\nSeed failed:", message);

  // The two failures worth explaining, because the raw message points at
  // neither cause.
  if (/querySrv|ECONNREFUSED .*_mongodb/.test(message)) {
    console.error(
      "\n  This is a DNS failure, not a database failure. A `mongodb+srv://`\n" +
        "  URI needs an SRV record, and Node resolves it itself — your machine's\n" +
        "  DNS is refusing that query. Two ways out:\n\n" +
        "    1. Re-run with DNS_SERVERS=8.8.8.8,1.1.1.1\n" +
        "    2. Or use Atlas's STANDARD connection string instead of the +srv one\n" +
        "       (Connect -> Drivers -> Node.js 2.2.12 or later). It lists the hosts\n" +
        "       directly, so no SRV lookup happens at all.\n",
    );
  }

  if (/Authentication failed|bad auth/i.test(message)) {
    console.error(
      "\n  The cluster answered but rejected the credentials. Check the user and\n" +
        "  password in MONGODB_URI, and remember a password with @ : / ? # or %\n" +
        "  must be percent-encoded.\n",
    );
  }

  if (/IP .*not allowed|whitelist/i.test(message)) {
    console.error(
      "\n  Atlas is refusing this IP. Add it under Network Access, or 0.0.0.0/0\n" +
        "  if the deployed app also needs in.\n",
    );
  }

  await disconnectDb();
  process.exit(1);
});

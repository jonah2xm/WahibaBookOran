/**
 * Demo orders — `npm run seed:demo --workspace @bookoran/db`
 *
 * DEV ONLY. Orders are the business's real records, so the main seed never
 * creates any. This script exists so the sales screens have something to show
 * before the storefront starts writing real ones.
 *
 * Every order it creates carries `notes: "DEMO"`, and `--clear` removes
 * exactly those and nothing else. Run it against a development database.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { connectDb, disconnectDb } from "../connect";
import { Book } from "../models/Book";
import { Order } from "../models/Order";
import { nextOrderNumber } from "../orderNumber";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../..");
dotenv.config({ path: path.join(root, ".env.local") });

const DEMO_MARKER = "DEMO";

const PEOPLE = [
  {
    fullName: "Nour Hamdani",
    phone: "0551224107",
    wilayaId: 16,
    wilayaName: "Alger",
    communeName: "Bab Ezzouar",
    method: "home" as const,
    fee: 60000,
    slugs: ["la-grande-maison", "l-incendie"],
  },
  {
    fullName: "Yacine Meziane",
    phone: "0662183055",
    wilayaId: 19,
    wilayaName: "Sétif",
    communeName: "El Eulma",
    method: "stopdesk" as const,
    fee: 35000,
    slugs: ["ce-que-le-jour-doit-a-la-nuit"],
  },
  {
    fullName: "Amine Belkacem",
    phone: "0555312408",
    wilayaId: 31,
    wilayaName: "Oran",
    communeName: "Bir El Djir",
    method: "home" as const,
    fee: 40000,
    slugs: ["meursault-contre-enquete", "le-fils-du-pauvre"],
  },
  {
    fullName: "Lila Ait Saada",
    phone: "0770041962",
    wilayaId: 6,
    wilayaName: "Béjaïa",
    communeName: "Akbou",
    method: "home" as const,
    fee: 60000,
    slugs: ["la-colline-oubliee"],
  },
];

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set.");
    process.exit(1);
  }
  if (!/localhost|127\.0\.0\.1/.test(uri) && !process.argv.includes("--force")) {
    console.error(
      "This writes fake orders. Refusing a non-local database without --force.",
    );
    process.exit(1);
  }

  await connectDb(uri);

  if (process.argv.includes("--clear")) {
    const { deletedCount } = await Order.deleteMany({ notes: DEMO_MARKER });
    console.log(`Removed ${deletedCount} demo orders.`);
    await disconnectDb();
    return;
  }

  const existing = await Order.countDocuments({ notes: DEMO_MARKER });
  if (existing > 0) {
    console.log(`${existing} demo orders already present — nothing to do.`);
    console.log("Run with --clear first to replace them.");
    await disconnectDb();
    return;
  }

  for (const person of PEOPLE) {
    const books = await Book.find({ slug: { $in: person.slugs } })
      .select("_id title priceDzd weightGrams")
      .lean();

    const items = books.map((b, i) => ({
      bookId: b._id,
      titleSnapshot: b.title.fr,
      priceSnapshot: b.priceDzd,
      weightSnapshot: b.weightGrams,
      // second line gets 2 copies, so the totals check has something to do
      quantity: i === 1 ? 2 : 1,
    }));

    const subtotal = items.reduce(
      (n, i) => n + i.priceSnapshot * i.quantity,
      0,
    );

    await Order.create({
      orderNumber: await nextOrderNumber(),
      status: "pending",
      customer: { fullName: person.fullName, phone: person.phone },
      delivery: {
        method: person.method,
        wilayaId: person.wilayaId,
        wilayaName: person.wilayaName,
        communeName: person.communeName,
      },
      items,
      totals: {
        subtotal,
        deliveryFee: person.fee,
        discount: 0,
        grandTotal: subtotal + person.fee,
      },
      notes: DEMO_MARKER,
    });
  }

  console.log(`Created ${PEOPLE.length} demo orders, all pending.`);
  await disconnectDb();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await disconnectDb();
  process.exit(1);
});

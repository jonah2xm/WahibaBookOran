/**
 * Reset an admin password — `npm run admin:password --workspace @bookoran/db`
 *
 * The seed deliberately never touches an account that already exists, so
 * without this there is no way to change a password at all: not a forgotten
 * one, not a shared one, not one that ended up somewhere it should not be.
 * The admin UI has no password field either, by design — `passwordHash` is
 * `select: false` and /api/users edits names, roles and status only.
 *
 * Usage:
 *   npm run admin:password --workspace @bookoran/db -- --email=owner@x.dz
 *   npm run admin:password --workspace @bookoran/db -- --env=.env.production.local --email=owner@x.dz
 *
 * Takes the same --env flag as the seed, with the same meaning: the named
 * file is the ONLY one read, so a production reset cannot pick up a
 * development value by accident.
 *
 * The new password is generated and printed once. There is no --password
 * flag: a password typed on a command line lands in your shell history.
 */
import { randomBytes } from "node:crypto";
import dns from "node:dns";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { connectDb, disconnectDb } from "../connect";
import { AdminUser, hashPassword } from "../models/AdminUser";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../../../..");

const args = process.argv.slice(2);
const flag = (name: string) =>
  args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const envFlag = flag("env");
if (envFlag) {
  const file = path.isAbsolute(envFlag) ? envFlag : path.join(root, envFlag);
  if (!fs.existsSync(file)) {
    console.error(`\n--env file not found: ${file}\n`);
    process.exit(1);
  }
  dotenv.config({ path: file });
  console.log(`Env file: ${path.relative(root, file)} (only)`);
} else {
  dotenv.config({ path: path.join(root, ".env.local") });
  dotenv.config({ path: path.join(root, "apps/admin/.env.local") });
}

const dnsServers = (process.env.DNS_SERVERS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (dnsServers.length) dns.setServers(dnsServers);

function databaseName(uri: string) {
  const match = /^mongodb(?:\+srv)?:\/\/[^/?]+\/([^?/]+)/.exec(uri);
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function main() {
  const email = (flag("email") ?? "").toLowerCase().trim();
  if (!email) {
    console.error("\nPass --email=<address>.\n");
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("\nMONGODB_URI is not set.\n");
    process.exit(1);
  }

  const database = databaseName(uri);
  const local = /localhost|127\.0\.0\.1/.test(uri);
  console.log(`Database: ${database ?? "test"}${local ? "" : "  (remote)"}`);

  await connectDb(uri);

  // Explicit select: passwordHash is select:false on the schema.
  const user = await AdminUser.findOne({ email }).select("+passwordHash");
  if (!user) {
    // Naming the address is fine here: you are already holding the database
    // credentials, so there is nothing left to enumerate.
    console.error(`\nNo admin account with e-mail ${email} in this database.\n`);
    await disconnectDb();
    process.exit(1);
  }

  const password = randomBytes(12).toString("base64url");
  user.passwordHash = await hashPassword(password);
  await user.save();

  const title = `New password for ${email} — shown once`;
  const width = Math.max(title.length, password.length);
  const rule = "─".repeat(width + 2);
  console.log(`\n  ┌${rule}┐`);
  console.log(`  │ ${title.padEnd(width)} │`);
  console.log(`  │ ${password.padEnd(width)} │`);
  console.log(`  └${rule}┘`);
  console.log("  Copy it into your password manager now.\n");

  await disconnectDb();
}

main().catch(async (error) => {
  console.error("\nFailed:", error instanceof Error ? error.message : error);
  await disconnectDb();
  process.exit(1);
});

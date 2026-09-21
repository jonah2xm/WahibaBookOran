import bcrypt from "bcryptjs";
import { Schema, model, models, type InferSchemaType, type Model } from "mongoose";

export const ADMIN_ROLES = ["owner", "staff"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

/** Cost 12: ~250ms per hash on a small VPS. Slow on purpose. */
const BCRYPT_ROUNDS = 12;

const adminUserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    /**
     * A bcrypt hash, never a password. `select: false` keeps it out of every
     * query that does not ask for it by name, so it cannot be serialised into
     * a session, an API response or a log by accident.
     */
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ADMIN_ROLES, default: "staff" },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true },
);

export type AdminUserDoc = InferSchemaType<typeof adminUserSchema>;

export const AdminUser: Model<AdminUserDoc> =
  (models.AdminUser as Model<AdminUserDoc>) ??
  model<AdminUserDoc>("AdminUser", adminUserSchema);

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Verifies a login attempt.
 *
 * Replaces the `===` comparison against env vars that A1 uses today. That
 * check must not survive into production — it is a plaintext password in a
 * file, compared in variable time.
 */
export async function verifyAdminPassword(email: string, plain: string) {
  const user = await AdminUser.findOne({
    email: email.toLowerCase().trim(),
    isActive: true,
  }).select("+passwordHash");

  // Hash even when the account does not exist, so a wrong e-mail and a wrong
  // password take the same time and cannot be told apart by timing.
  const hash = user?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinva";
  const ok = await bcrypt.compare(plain, hash);

  if (!user || !ok) return null;
  return user;
}

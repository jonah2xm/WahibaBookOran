import { AdminUser, connectDb } from "@bookoran/db";
import { auth } from "@/auth";

export type ActiveAdmin = {
  id: string;
  email: string;
  name: string;
  role: "owner" | "staff";
};

/**
 * The session, confirmed against the database.
 *
 * Sessions are JWTs, so one keeps working after the account behind it is
 * deleted or deactivated. Checking the row makes `isActive` mean something
 * immediately, and picks up a role change on the next request rather than
 * the next sign-in.
 *
 * Returns null when there is no session, the account is gone, it is
 * deactivated, or the database is unreachable — every one of which should
 * read as "not signed in", never as "signed in".
 */
export async function activeAdmin(): Promise<ActiveAdmin | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  try {
    await connectDb();
  } catch {
    return null;
  }

  const account = await AdminUser.findById(id)
    .select("email name role isActive")
    .lean();

  if (!account || !account.isActive) return null;

  return {
    id: String(account._id),
    email: account.email,
    name: account.name,
    role: account.role as "owner" | "staff",
  };
}

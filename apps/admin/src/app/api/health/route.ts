import { AdminUser, connectDb } from "@bookoran/db";
import { NextResponse } from "next/server";

/**
 * GET /api/health — why the login is refusing.
 *
 * Unauthenticated on purpose: it exists for the case where nobody CAN
 * authenticate. Without it, a missing MONGODB_URI, an unreachable cluster and
 * a genuinely wrong password all look identical on screen — "e-mail ou mot de
 * passe incorrect" — which is exactly the wrong thing to tell someone whose
 * database simply has no accounts in it yet.
 *
 * It returns two booleans and nothing else: no e-mails, no names, no
 * connection string, no counts. Enough to tell those three cases apart,
 * not enough to help anyone attack the login.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({
      database: "not_configured",
      hasAdminAccount: false,
    });
  }

  try {
    await connectDb();
  } catch {
    return NextResponse.json({
      database: "unreachable",
      hasAdminAccount: false,
    });
  }

  const count = await AdminUser.countDocuments({ isActive: true });
  return NextResponse.json({
    database: "ok",
    hasAdminAccount: count > 0,
  });
}

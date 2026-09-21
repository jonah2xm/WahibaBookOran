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
 * It returns a status, a coarse reason and one boolean: no e-mails, no names,
 * no connection string, no host, no counts. Enough to tell the cases apart,
 * not enough to help anyone attack the login.
 */
export const dynamic = "force-dynamic";

/**
 * Why the connection failed, in one word.
 *
 * Deliberately a fixed vocabulary rather than the driver's message: that
 * message carries the cluster host and sometimes the user name, and this
 * route is public. Each of these points at a different fix, which is the
 * whole reason for reporting it — "unreachable" alone sends you looking
 * through Vercel logs you may not be able to see.
 */
function failureReason(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/bad auth|Authentication failed/i.test(message)) return "credentials";
  if (/IP .*(not allowed|whitelist)|whitelist/i.test(message)) return "ip_not_allowed";
  if (/querySrv|ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(message)) return "dns";
  if (/timed out|ETIMEDOUT|ECONNREFUSED/i.test(message)) return "timeout";
  return "unknown";
}

export async function GET() {
  if (!process.env.MONGODB_URI) {
    return NextResponse.json({
      database: "not_configured",
      hasAdminAccount: false,
    });
  }

  try {
    await connectDb();
  } catch (error) {
    return NextResponse.json({
      database: "unreachable",
      reason: failureReason(error),
      hasAdminAccount: false,
    });
  }

  const count = await AdminUser.countDocuments({ isActive: true });
  return NextResponse.json({
    database: "ok",
    hasAdminAccount: count > 0,
  });
}
